const express = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get user dashboard stats
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const API = require('../models/API');
    const Company = require('../models/Company');

    const userAPIs = await API.countDocuments({
      createdBy: req.user._id,
      isActive: true
    });

    const userCompanies = await Company.countDocuments({
      $or: [
        { admins: req.user._id },
        { 'members.user': req.user._id }
      ],
      isActive: true
    });

    res.json({
      success: true,
      stats: {
        apis: userAPIs,
        companies: userCompanies,
        role: req.user.role
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats'
    });
  }
});

// Admin only - Get all users
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email avatar role lastLogin createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

module.exports = router; 