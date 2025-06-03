const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/database');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const apiRoutes = require('./routes/apis');
const userRoutes = require('./routes/users');
const bianReferenceRoutes = require('./routes/bianReference');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust proxy for Render.com deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Debug logging
const isDebug = process.env.DEBUG === 'ON';
if (isDebug) {
  console.log('🐛 Debug mode enabled');
}

// Connect to MongoDB
connectDB();

// Rate limiting with proper proxy configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: (req) => process.env.NODE_ENV !== 'production'
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"]
    }
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://bian-api-frontend.onrender.com', 
          'https://bian-gtc.onrender.com',
          'https://bian-api-backend.onrender.com'
        ]
      : [
          'http://localhost:3000', 
          'http://localhost:5173',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ];
    
    // In production, also allow any onrender.com subdomain
    const isAllowed = allowedOrigins.includes(origin) || 
      (process.env.NODE_ENV === 'production' && origin.endsWith('.onrender.com'));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      console.log('📝 Allowed origins:', allowedOrigins);
      console.log('🌍 Environment:', process.env.NODE_ENV);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  optionsSuccessStatus: 200
}));

app.use(compression());

// Enhanced logging with debug info
if (isDebug) {
  app.use(morgan('combined'));
  app.use((req, res, next) => {
    console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`, {
      headers: req.headers,
      body: req.body,
      query: req.query,
      ip: req.ip,
      ips: req.ips
    });
    next();
  });
} else {
  app.use(morgan('combined'));
}

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport middleware
app.use(passport.initialize());

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BIAN API Generator',
      version: '1.0.0',
      description: 'API for generating custom BIAN-compliant APIs',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://bian-api-backend.onrender.com'
          : 'http://localhost:10000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bian', bianReferenceRoutes);

// Serve static files from the frontend build in production
if (process.env.NODE_ENV === 'production') {
  // Path from backend/src/app.js to frontend/dist
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
  
  console.log('🏗️ [STATIC FILES] Attempting to serve frontend from:', frontendBuildPath);
  
  // Check if the frontend build directory exists
  if (fs.existsSync(frontendBuildPath)) {
    console.log('✅ [STATIC FILES] Frontend build directory found');
    
    // Serve static files
    app.use(express.static(frontendBuildPath));
    
    // Handle React Router - send all non-API requests to index.html
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          error: 'API route not found',
          path: req.originalUrl
        });
      }
      
      console.log(`📄 [STATIC FILES] Serving index.html for: ${req.path}`);
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  } else {
    console.log('❌ [STATIC FILES] Frontend build directory not found at:', frontendBuildPath);
    console.log('📁 [STATIC FILES] Current working directory:', process.cwd());
    console.log('📁 [STATIC FILES] __dirname:', __dirname);
    
    // Try alternative paths
    const alternativePaths = [
      path.join(process.cwd(), 'frontend/dist'),
      path.join(__dirname, '../../../frontend/dist'),
      path.join(__dirname, '../../../../frontend/dist')
    ];
    
    for (const altPath of alternativePaths) {
      console.log(`🔍 [STATIC FILES] Checking alternative path: ${altPath}`);
      if (fs.existsSync(altPath)) {
        console.log(`✅ [STATIC FILES] Found frontend at alternative path: ${altPath}`);
        app.use(express.static(altPath));
        app.get('*', (req, res) => {
          if (req.path.startsWith('/api/')) {
            return res.status(404).json({
              error: 'API route not found',
              path: req.originalUrl
            });
          }
          res.sendFile(path.join(altPath, 'index.html'));
        });
        break;
      }
    }
  }
} else {
  // 404 handler for development (API only)
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
}); 