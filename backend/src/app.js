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
    if (!origin) {
      console.log('✅ [CORS] Allowing request with no origin');
      return callback(null, true);
    }
    
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
    
    // Enhanced logging for CORS debugging
    console.log('🔍 [CORS] ===========================================');
    console.log('🔍 [CORS] Checking origin:', origin);
    console.log('📝 [CORS] Allowed origins:', allowedOrigins);
    console.log('🌍 [CORS] Environment:', process.env.NODE_ENV);
    console.log('🔍 [CORS] ===========================================');
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('✅ [CORS] Origin explicitly allowed');
      return callback(null, true);
    }
    
    // In production, also allow any onrender.com subdomain
    if (process.env.NODE_ENV === 'production' && origin.endsWith('.onrender.com')) {
      console.log('✅ [CORS] Origin allowed as onrender.com subdomain');
      return callback(null, true);
    }
    
    // Temporary: Allow all origins in production for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('🚨 [CORS] TEMPORARY: Allowing all origins in production for debugging');
      return callback(null, true);
    }
    
    // Block the request
    console.log('🚫 [CORS] Origin blocked - not in allowed list');
    console.log('🚫 [CORS] Blocked origin:', origin);
    console.log('🚫 [CORS] Allowed origins were:', allowedOrigins);
    callback(new Error(`CORS blocked origin: ${origin}`));
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
    'Pragma',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'Content-Length',
    'X-Kuma-Revision'
  ],
  optionsSuccessStatus: 200,
  // Ensure preflight requests are handled properly
  preflightContinue: false,
  maxAge: 86400 // 24 hours
}));

// Add specific logging for preflight OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('🔄 [PREFLIGHT] =====================================');
    console.log('🔄 [PREFLIGHT] OPTIONS request received');
    console.log('🔄 [PREFLIGHT] Origin:', req.headers.origin);
    console.log('🔄 [PREFLIGHT] Method:', req.headers['access-control-request-method']);
    console.log('🔄 [PREFLIGHT] Headers:', req.headers['access-control-request-headers']);
    console.log('🔄 [PREFLIGHT] Path:', req.path);
    console.log('🔄 [PREFLIGHT] Full URL:', req.originalUrl);
    console.log('🔄 [PREFLIGHT] User-Agent:', req.headers['user-agent']);
    console.log('🔄 [PREFLIGHT] =====================================');
  }
  
  // Special handling for API routes that are having CORS issues
  if (req.path.startsWith('/api/apis/') && req.path.match(/^\/api\/apis\/[a-f0-9]{24}$/)) {
    console.log('🎯 [API ROUTE] Specific API route accessed');
    console.log('🎯 [API ROUTE] Method:', req.method);
    console.log('🎯 [API ROUTE] Path:', req.path);
    console.log('🎯 [API ROUTE] Origin:', req.headers.origin);
    console.log('🎯 [API ROUTE] Authorization:', req.headers.authorization ? 'Present' : 'Missing');
  }
  
  next();
});

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

// Health check endpoint (before auth routes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORS test endpoint (for debugging CORS issues)
app.get('/api/cors-test', (req, res) => {
  console.log('🔧 [CORS TEST] Request received');
  console.log('🔧 [CORS TEST] Origin:', req.headers.origin);
  console.log('🔧 [CORS TEST] Method:', req.method);
  res.json({
    success: true,
    origin: req.headers.origin,
    method: req.method,
    message: 'CORS test successful',
    timestamp: new Date().toISOString()
  });
});

// CORS test endpoint with POST (for debugging POST requests)
app.post('/api/cors-test', (req, res) => {
  console.log('🔧 [CORS TEST POST] Request received');
  console.log('🔧 [CORS TEST POST] Origin:', req.headers.origin);
  console.log('🔧 [CORS TEST POST] Method:', req.method);
  console.log('🔧 [CORS TEST POST] Content-Type:', req.headers['content-type']);
  res.json({
    success: true,
    origin: req.headers.origin,
    method: req.method,
    contentType: req.headers['content-type'],
    body: req.body,
    message: 'CORS POST test successful',
    timestamp: new Date().toISOString()
  });
});

// Special middleware for API routes with CORS issues
app.use('/api/apis/:id', (req, res, next) => {
  console.log('🔧 [API MIDDLEWARE] Request to API route');
  console.log('🔧 [API MIDDLEWARE] Method:', req.method);
  console.log('🔧 [API MIDDLEWARE] Path:', req.path);
  console.log('🔧 [API MIDDLEWARE] Params:', req.params);
  console.log('🔧 [API MIDDLEWARE] Origin:', req.headers.origin);
  
  // Explicitly handle OPTIONS for this route
  if (req.method === 'OPTIONS') {
    console.log('🔧 [API MIDDLEWARE] Handling OPTIONS request explicitly');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/apis', apiRoutes);
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