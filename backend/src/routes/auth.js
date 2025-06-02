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
        
        if (isDebug) {
          return res.json({
            error: 'Authentication failed',
            debug: {
              message: 'No user found after Google OAuth',
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV
            }
          });
        }

        const frontendUrl = process.env.NODE_ENV === 'production' 
          ? 'https://bian-api-frontend.onrender.com'
          : 'http://localhost:3000';
        
        return res.redirect(`${frontendUrl}/auth/error?message=Authentication failed`);
      }

      // Generate JWT token
      const token = generateToken(req.user._id);
      
      if (isDebug) {
        console.log('Token generated successfully');
        console.log('Token length:', token.length);
        console.log('Redirecting to frontend...');
      }
      
      // Redirect to frontend with token
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://bian-api-frontend.onrender.com'
        : 'http://localhost:3000';
      
      if (isDebug) {
        return res.json({
          success: true,
          debug: {
            message: 'Authentication successful',
            user: {
              id: req.user._id,
              email: req.user.email,
              name: req.user.name
            },
            token: token,
            redirectUrl: `${frontendUrl}/auth/success?token=${token}`,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.redirect(`${frontendUrl}/auth/success?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      console.error('Error stack:', error.stack);
      
      if (isDebug) {
        return res.json({
          error: 'Internal Server Error',
          debug: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            jwtSecret: !!process.env.JWT_SECRET,
            user: req.user ? {
              id: req.user._id,
              email: req.user.email
            } : 'No user'
          }
        });
      }
      
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://bian-api-frontend.onrender.com'
        : 'http://localhost:3000';
      
      res.redirect(`${frontendUrl}/auth/error?message=Server error`);
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