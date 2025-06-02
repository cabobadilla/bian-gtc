const express = require('express');
const { verifyToken, requireCompanyAccess, requireAPIAccess } = require('../middleware/auth');
const API = require('../models/API');
const openaiService = require('../services/openaiService');

const router = express.Router();

/**
 * @swagger
 * /api/apis:
 *   post:
 *     summary: Create a new API
 *     tags: [APIs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, companyId]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               companyId:
 *                 type: string
 *               category:
 *                 type: string
 *               prompt:
 *                 type: string
 *               useAI:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: API created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, companyId, category, prompt, useAI = false } = req.body;

    // Validate required fields
    if (!name || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Name and company ID are required'
      });
    }

    // Check company access
    const Company = require('../models/Company');
    const company = await Company.findById(companyId);
    
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    if (!company.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this company'
      });
    }

    // Create basic API
    const api = new API({
      name,
      description,
      company: companyId,
      createdBy: req.user._id,
      category: category || 'other'
    });

    // If AI enrichment is requested
    if (useAI && prompt) {
      const enrichmentResult = await openaiService.enrichAPIDefinition(prompt);
      
      if (enrichmentResult.success) {
        // Update the first version with AI-generated spec
        api.versions[0].openApiSpec = enrichmentResult.spec;
        api.aiEnrichment = {
          isEnriched: true,
          enrichedAt: new Date(),
          originalPrompt: prompt,
          enrichmentVersion: '1.0'
        };

        // Try to extract BIAN domains
        const bianMapping = await openaiService.generateBIANMapping(prompt);
        if (bianMapping.success) {
          api.bianDomains = [{
            domain: bianMapping.mapping.primaryDomain,
            serviceOperations: bianMapping.mapping.serviceOperations || []
          }];
          
          // Add secondary domains
          if (bianMapping.mapping.secondaryDomains) {
            api.bianDomains.push(...bianMapping.mapping.secondaryDomains.map(domain => ({
              domain,
              serviceOperations: []
            })));
          }
        }
      }
    }

    await api.save();

    res.status(201).json({
      success: true,
      api: await api.populate('createdBy', 'name email avatar')
    });

  } catch (error) {
    console.error('Create API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API'
    });
  }
});

/**
 * @swagger
 * /api/apis/company/{companyId}:
 *   get:
 *     summary: Get APIs for a company
 *     tags: [APIs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: companyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [draft, review, published, deprecated]
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of APIs
 */
router.get('/company/:companyId', verifyToken, requireCompanyAccess('viewer'), async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const query = { 
      company: req.params.companyId,
      isActive: true
    };

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const apis = await API.find(query)
      .populate('createdBy', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      apis
    });

  } catch (error) {
    console.error('Get company APIs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get APIs'
    });
  }
});

/**
 * @swagger
 * /api/apis/{id}:
 *   get:
 *     summary: Get API by ID
 *     tags: [APIs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: version
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API details
 *       404:
 *         description: API not found
 */
router.get('/:id', verifyToken, requireAPIAccess('viewer'), async (req, res) => {
  try {
    const { version } = req.query;
    
    // Increment view count
    await req.api.incrementViews();

    const apiData = await req.api.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'company', select: 'name slug logo' },
      { path: 'collaboration.collaborators.user', select: 'name email avatar' }
    ]);

    // Get specific version if requested
    let versionData = null;
    if (version) {
      versionData = apiData.getVersion(version);
      if (!versionData) {
        return res.status(404).json({
          success: false,
          error: 'Version not found'
        });
      }
    }

    res.json({
      success: true,
      api: apiData,
      currentVersion: versionData || apiData.currentVersionSpec,
      userRole: req.userRole
    });

  } catch (error) {
    console.error('Get API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API'
    });
  }
});

/**
 * @swagger
 * /api/apis/{id}/enrich:
 *   post:
 *     summary: Enrich API with AI
 *     tags: [APIs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: API enriched successfully
 *       400:
 *         description: Invalid input
 */
router.post('/:id/enrich', verifyToken, requireAPIAccess('editor'), async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // Get current spec
    const currentSpec = req.api.currentVersionSpec;

    // Enrich with AI
    const enrichmentResult = await openaiService.enrichAPIDefinition(prompt, currentSpec);

    if (!enrichmentResult.success) {
      return res.status(400).json({
        success: false,
        error: enrichmentResult.error,
        details: enrichmentResult.details
      });
    }

    // Create new version with enriched spec
    const newVersion = `${req.api.currentVersion}-enriched`;
    
    await req.api.addVersion(
      newVersion,
      enrichmentResult.spec,
      `AI enrichment: ${prompt}`,
      req.user._id
    );

    // Update AI enrichment info
    req.api.aiEnrichment = {
      isEnriched: true,
      enrichedAt: new Date(),
      originalPrompt: prompt,
      enrichmentVersion: '1.0'
    };

    await req.api.save();

    res.json({
      success: true,
      message: 'API enriched successfully',
      newVersion,
      spec: enrichmentResult.spec
    });

  } catch (error) {
    console.error('API enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich API'
    });
  }
});

/**
 * @swagger
 * /api/apis/{id}/spec:
 *   put:
 *     summary: Update API specification
 *     tags: [APIs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               spec:
 *                 type: object
 *               version:
 *                 type: string
 *               changelog:
 *                 type: string
 *     responses:
 *       200:
 *         description: API specification updated
 */
router.put('/:id/spec', verifyToken, requireAPIAccess('editor'), async (req, res) => {
  try {
    const { spec, version, changelog } = req.body;

    if (!spec) {
      return res.status(400).json({
        success: false,
        error: 'Specification is required'
      });
    }

    // Validate OpenAPI structure
    try {
      openaiService.validateOpenAPIStructure(spec);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OpenAPI specification',
        details: validationError.message
      });
    }

    if (version && version !== req.api.currentVersion) {
      // Create new version
      await req.api.addVersion(version, spec, changelog, req.user._id);
    } else {
      // Update current version
      const currentVersionIndex = req.api.versions.findIndex(v => v.version === req.api.currentVersion);
      if (currentVersionIndex !== -1) {
        req.api.versions[currentVersionIndex].openApiSpec = spec;
        req.api.versions[currentVersionIndex].changelog = changelog || 'Specification updated';
        await req.api.save();
      }
    }

    res.json({
      success: true,
      message: 'API specification updated successfully'
    });

  } catch (error) {
    console.error('Update API spec error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API specification'
    });
  }
});

module.exports = router; 