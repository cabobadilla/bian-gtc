const express = require('express');
const { verifyToken, requireCompanyAccess } = require('../middleware/auth');
const Company = require('../models/Company');

const router = express.Router();

const isDebug = process.env.DEBUG === 'ON';

// Create company
router.post('/', verifyToken, async (req, res) => {
  try {
    if (isDebug) {
      console.log('🏢 [CREATE COMPANY] Request received:', {
        body: req.body,
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name
        },
        headers: {
          'content-type': req.headers['content-type'],
          'authorization': req.headers.authorization ? 'Bearer [REDACTED]' : 'None'
        }
      });
    }

    const { name, description, industry, size, country } = req.body;

    if (!name) {
      if (isDebug) {
        console.log('❌ [CREATE COMPANY] Validation failed: Company name is required');
      }
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    if (isDebug) {
      console.log('✅ [CREATE COMPANY] Validation passed, creating company:', {
        name,
        description,
        industry,
        size,
        country,
        adminId: req.user._id
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

    if (isDebug) {
      console.log('💾 [CREATE COMPANY] Saving company to database...');
    }

    await company.save();

    if (isDebug) {
      console.log('✅ [CREATE COMPANY] Company saved successfully:', {
        companyId: company._id,
        name: company.name,
        slug: company.slug
      });
    }

    // Add company to user's companies
    if (isDebug) {
      console.log('👤 [CREATE COMPANY] Adding company to user companies list...');
    }

    req.user.companies.push(company._id);
    await req.user.save();

    if (isDebug) {
      console.log('✅ [CREATE COMPANY] User updated successfully');
    }

    const response = {
      success: true,
      company
    };

    if (isDebug) {
      console.log('🎉 [CREATE COMPANY] Success response:', response);
    }

    res.status(201).json(response);

  } catch (error) {
    if (isDebug) {
      console.error('💥 [CREATE COMPANY] Error occurred:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
    }
    
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create company',
      ...(isDebug && { details: error.message })
    });
  }
});

// Get user's companies
router.get('/my', verifyToken, async (req, res) => {
  try {
    if (isDebug) {
      console.log('📋 [GET MY COMPANIES] Request received for user:', {
        userId: req.user._id,
        email: req.user.email
      });
    }

    const companies = await Company.find({
      $or: [
        { admins: req.user._id },
        { 'members.user': req.user._id }
      ],
      isActive: true
    }).select('name slug description logo industry');

    if (isDebug) {
      console.log('✅ [GET MY COMPANIES] Found companies:', {
        count: companies.length,
        companies: companies.map(c => ({ id: c._id, name: c.name }))
      });
    }

    res.json({
      success: true,
      companies
    });

  } catch (error) {
    if (isDebug) {
      console.error('💥 [GET MY COMPANIES] Error:', error);
    }
    
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
    if (isDebug) {
      console.log('🏢 [GET COMPANY DETAILS] Request received:', {
        companyId: req.params.companyId,
        userId: req.user._id
      });
    }

    const company = await req.company.populate([
      { path: 'admins', select: 'name email avatar' },
      { path: 'members.user', select: 'name email avatar' }
    ]);

    if (isDebug) {
      console.log('✅ [GET COMPANY DETAILS] Company found:', {
        companyId: company._id,
        name: company.name,
        userRole: req.userRole
      });
    }

    res.json({
      success: true,
      company,
      userRole: req.userRole
    });

  } catch (error) {
    if (isDebug) {
      console.error('💥 [GET COMPANY DETAILS] Error:', error);
    }
    
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get company'
    });
  }
});

module.exports = router; 