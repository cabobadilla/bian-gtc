const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId);
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check company membership
const requireCompanyAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID required' });
      }

      const company = await Company.findById(companyId);
      if (!company || !company.isActive) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const userRole = company.getUserRole(req.user._id);
      if (!userRole) {
        return res.status(403).json({ error: 'Access denied to this company' });
      }

      // Check role hierarchy
      const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: `${requiredRole} access required`, 
          userRole, 
          requiredRole 
        });
      }

      req.company = company;
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Company access check error:', error);
      res.status(500).json({ error: 'Access verification failed' });
    }
  };
};

// Check API access
const requireAPIAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const apiId = req.params.apiId || req.params.id;
      
      if (!apiId) {
        return res.status(400).json({ error: 'API ID required' });
      }

      const API = require('../models/API');
      const api = await API.findById(apiId).populate('company');
      
      if (!api || !api.isActive) {
        return res.status(404).json({ error: 'API not found' });
      }

      // Check if API is public
      if (api.visibility === 'public' && requiredRole === 'viewer') {
        req.api = api;
        return next();
      }

      // Check if user owns the API
      if (api.createdBy.toString() === req.user._id.toString()) {
        req.api = api;
        req.userRole = 'admin';
        return next();
      }

      // Check company access
      const userRole = api.company.getUserRole(req.user._id);
      if (!userRole) {
        return res.status(403).json({ error: 'Access denied to this API' });
      }

      // Check collaborator access
      const collaborator = api.collaboration.collaborators.find(
        c => c.user.toString() === req.user._id.toString()
      );
      
      const effectiveRole = collaborator ? collaborator.role : userRole;

      // Check role hierarchy
      const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
      const userLevel = roleHierarchy[effectiveRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: `${requiredRole} access required`, 
          userRole: effectiveRole, 
          requiredRole 
        });
      }

      req.api = api;
      req.userRole = effectiveRole;
      next();
    } catch (error) {
      console.error('API access check error:', error);
      res.status(500).json({ error: 'Access verification failed' });
    }
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireAdmin,
  requireCompanyAccess,
  requireAPIAccess,
  generateToken
}; 