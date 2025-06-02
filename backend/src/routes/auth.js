const express = require('express');
const passport = require('passport');
const { generateToken, verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         avatar:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin]
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/auth/debug:
 *   get:
 *     summary: Debug information (only when DEBUG=ON)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Debug information
 *       404:
 *         description: Debug not enabled
 */
router.get('/debug', (req, res) => {
  const isDebug = process.env.DEBUG === 'ON' || process.env.NODE_ENV === 'development';
  
  if (!isDebug) {
    return res.status(404).json({
      error: 'Debug mode not enabled'
    });
  }

  res.json({
    debug: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    googleOAuth: {
      clientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
      clientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.NODE_ENV === 'production' 
        ? 'https://bian-api-backend.onrender.com/api/auth/google/callback'
        : 'http://localhost:10000/api/auth/google/callback',
      frontendUrl: process.env.NODE_ENV === 'production' 
        ? 'https://bian-api-frontend.onrender.com'
        : 'http://localhost:3000'
    },
    mongodb: {
      connected: require('mongoose').connection.readyState === 1
    },
    jwt: {
      secretConfigured: !!process.env.JWT_SECRET
    },
    instructions: {
      message: "If you see invalid_grant errors, it means you're reusing an OAuth code. Always start a fresh login from the frontend.",
      steps: [
        "1. Go to https://bian-api-frontend.onrender.com",
        "2. Click 'Sign in with Google'",
        "3. Complete OAuth flow with fresh code",
        "4. Check this debug endpoint for any issues"
      ]
    }
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   get:
 *     summary: Login page (temporary frontend bypass)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Login page HTML
 */
router.get('/login', (req, res) => {
  const loginPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BIAN API Generator - Login</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        .description {
          color: #666;
          margin-bottom: 30px;
          line-height: 1.5;
        }
        .google-btn {
          background: #4285f4;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          transition: background 0.3s;
        }
        .google-btn:hover {
          background: #3367d6;
        }
        .status {
          background: #fff3e0;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          color: #e65100;
        }
        .links {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .links a {
          color: #1976d2;
          text-decoration: none;
          margin: 0 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏦</div>
        <h1>BIAN API Generator</h1>
        <p class="description">
          Create custom BIAN-compliant APIs with AI assistance
        </p>
        
        <div class="status">
          <strong>⚠️ Temporary Login Page</strong><br>
          The frontend is being fixed. Use this temporary login.
        </div>
        
        <a href="/api/auth/google" class="google-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </a>
        
        <div class="links">
          <a href="/api/docs">📚 API Documentation</a>
          <a href="/api/health">🏥 Health Check</a>
          <a href="/api/auth/debug">🔍 Debug Info</a>
        </div>
      </div>
    </body>
    </html>
  `;
  
  res.send(loginPage);
});

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *     responses:
 *       302:
 *         description: Redirect to frontend with token
 *       400:
 *         description: Authentication failed
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const isDebug = process.env.DEBUG === 'ON' || process.env.NODE_ENV === 'development';
    
    try {
      if (isDebug) {
        console.log('=== GOOGLE OAUTH CALLBACK DEBUG ===');
        console.log('User from passport:', req.user ? 'User found' : 'No user');
        console.log('User ID:', req.user?._id);
        console.log('User email:', req.user?.email);
        console.log('User name:', req.user?.name);
        console.log('Environment:', process.env.NODE_ENV);
        console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
      }

      if (!req.user) {
        console.error('OAuth callback: No user found');
        // Redirect to frontend with error
        return res.redirect('https://bian-gtc.onrender.com/auth/error?message=authentication_failed');
      }

      // Generate JWT token
      const token = generateToken(req.user._id);
      
      if (isDebug) {
        console.log('Token generated successfully');
        console.log('Token length:', token.length);
        console.log('Redirecting to frontend with token...');
      }
      
      // Redirect to frontend with token and user info
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://bian-gtc.onrender.com'
        : 'http://localhost:3000';
      
      const redirectUrl = `${frontendUrl}/auth/success?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }))}`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      console.error('Error stack:', error.stack);
      
      // Redirect to frontend with error
      res.redirect('https://bian-gtc.onrender.com/auth/error?message=server_error');
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await req.user.populate('companies', 'name slug logo');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        companies: user.companies,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (client-side token removal)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/logout', verifyToken, (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // Server doesn't need to maintain session state
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: New token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid token
 */
router.post('/refresh', verifyToken, (req, res) => {
  try {
    // Generate new token
    const newToken = generateToken(req.user._id);
    
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark]
 *                   language:
 *                     type: string
 *                   notifications:
 *                     type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (preferences) {
      // Validate preferences
      if (preferences.theme && !['light', 'dark'].includes(preferences.theme)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid theme preference'
        });
      }
      
      // Update preferences
      req.user.preferences = { ...req.user.preferences, ...preferences };
      await req.user.save();
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        preferences: req.user.preferences
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

module.exports = router; 