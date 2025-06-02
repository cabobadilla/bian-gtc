const express = require('express');
const { verifyToken, requireCompanyAccess } = require('../middleware/auth');
const Company = require('../models/Company');

const router = express.Router();

// Create company
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, industry, size, country } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    const company = new Company({
      name,
      description,
      industry,
      size,
      country,
      admins: [req.user._id]
    });

    await company.save();

    // Add company to user's companies
    req.user.companies.push(company._id);
    await req.user.save();

    res.status(201).json({
      success: true,
      company
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create company'
    });
  }
});

// Get user's companies
router.get('/my', verifyToken, async (req, res) => {
  try {
    const companies = await Company.find({
      $or: [
        { admins: req.user._id },
        { 'members.user': req.user._id }
      ],
      isActive: true
    }).select('name slug description logo industry');

    res.json({
      success: true,
      companies
    });

  } catch (error) {
    console.error('Get user companies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get companies'
    });
  }
});

// Get company details
router.get('/:companyId', verifyToken, requireCompanyAccess('viewer'), async (req, res) => {
  try {
    const company = await req.company.populate([
      { path: 'admins', select: 'name email avatar' },
      { path: 'members.user', select: 'name email avatar' }
    ]);

    res.json({
      success: true,
      company,
      userRole: req.userRole
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get company'
    });
  }
});

module.exports = router; 