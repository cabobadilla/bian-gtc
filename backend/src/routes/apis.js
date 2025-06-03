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
    
    console.log('🔧 [GET API] Request received for API:', req.params.id);
    
    // Increment view count
    await req.api.incrementViews();

    const apiData = await req.api.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'company', select: 'name slug logo' },
      { path: 'collaboration.collaborators.user', select: 'name email avatar' }
    ]);

    console.log('🔧 [GET API] API data loaded:', {
      apiId: apiData._id,
      name: apiData.name,
      currentVersion: apiData.currentVersion,
      versionsCount: apiData.versions?.length || 0,
      hasCurrentVersionSpec: !!apiData.currentVersionSpec,
      currentVersionSpecKeys: apiData.currentVersionSpec ? Object.keys(apiData.currentVersionSpec) : null,
      firstVersionSpec: apiData.versions?.[0]?.openApiSpec ? Object.keys(apiData.versions[0].openApiSpec) : null
    });

    // Get specific version if requested
    let versionData = null;
    if (version) {
      versionData = apiData.getVersion(version);
      if (!versionData) {
        console.log('❌ [GET API] Version not found:', version);
        return res.status(404).json({
          success: false,
          error: 'Version not found'
        });
      }
    }

    console.log('🔧 [GET API] Sending response with currentVersionSpec:', !!apiData.currentVersionSpec);

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
 * /api/apis/{id}:
 *   put:
 *     summary: Update API basic information
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, review, published, deprecated]
 *               visibility:
 *                 type: string
 *                 enum: [private, company, public]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: API updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: API not found
 */
router.put('/:id', verifyToken, requireAPIAccess('editor'), async (req, res) => {
  try {
    const { name, description, status, visibility, tags, category } = req.body;

    // Add comprehensive debug logging
    console.log('🔧 [UPDATE API] Request received:', {
      apiId: req.params.id,
      body: req.body,
      name: name,
      nameType: typeof name,
      nameLength: name ? name.length : 'undefined',
      description: description,
      status: status,
      visibility: visibility,
      tags: tags,
      category: category
    });

    console.log('🔧 [UPDATE API] Current API state:', {
      currentName: req.api.name,
      currentDescription: req.api.description,
      currentStatus: req.api.status,
      currentVisibility: req.api.visibility,
      currentTags: req.api.tags,
      currentCategory: req.api.category
    });

    // Validate input
    if (name !== undefined && name.trim().length === 0) {
      console.log('❌ [UPDATE API] Name validation failed: empty string');
      return res.status(400).json({
        success: false,
        error: 'Name cannot be empty'
      });
    }

    if (status && !['draft', 'review', 'published', 'deprecated'].includes(status)) {
      console.log('❌ [UPDATE API] Status validation failed:', status);
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    if (visibility && !['private', 'company', 'public'].includes(visibility)) {
      console.log('❌ [UPDATE API] Visibility validation failed:', visibility);
      return res.status(400).json({
        success: false,
        error: 'Invalid visibility value'
      });
    }

    // Update fields only if they are provided and valid
    console.log('🔧 [UPDATE API] Applying updates...');
    
    if (name !== undefined && name.trim().length > 0) {
      console.log('🔧 [UPDATE API] Updating name:', req.api.name, '->', name.trim());
      req.api.name = name.trim();
    }
    
    if (description !== undefined) {
      console.log('🔧 [UPDATE API] Updating description');
      req.api.description = description.trim();
    }
    
    if (status !== undefined) {
      console.log('🔧 [UPDATE API] Updating status:', req.api.status, '->', status);
      req.api.status = status;
    }
    
    if (visibility !== undefined) {
      console.log('🔧 [UPDATE API] Updating visibility:', req.api.visibility, '->', visibility);
      req.api.visibility = visibility;
    }
    
    if (tags !== undefined) {
      console.log('🔧 [UPDATE API] Updating tags:', req.api.tags, '->', tags);
      req.api.tags = Array.isArray(tags) ? tags : [];
    }
    
    if (category !== undefined) {
      console.log('🔧 [UPDATE API] Updating category:', req.api.category, '->', category);
      req.api.category = category;
    }

    console.log('🔧 [UPDATE API] Final API state before save:', {
      name: req.api.name,
      description: req.api.description,
      status: req.api.status,
      visibility: req.api.visibility,
      tags: req.api.tags,
      category: req.api.category
    });

    await req.api.save();

    console.log('✅ [UPDATE API] Successfully saved API');

    // Return updated API
    const updatedAPI = await req.api.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'company', select: 'name slug logo' }
    ]);

    res.json({
      success: true,
      message: 'API updated successfully',
      api: updatedAPI
    });

  } catch (error) {
    console.error('Update API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API'
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

    console.log('🔧 [UPDATE SPEC] Request received:', {
      apiId: req.params.id,
      hasSpec: !!spec,
      specKeys: spec ? Object.keys(spec) : null,
      hasComponents: !!(spec?.components),
      hasSchemas: !!(spec?.components?.schemas),
      schemasCount: spec?.components?.schemas ? Object.keys(spec.components.schemas).length : 0,
      version: version,
      changelog: changelog
    });

    if (!spec) {
      console.log('❌ [UPDATE SPEC] No specification provided');
      return res.status(400).json({
        success: false,
        error: 'Specification is required'
      });
    }

    // Validate OpenAPI structure
    try {
      openaiService.validateOpenAPIStructure(spec);
      console.log('✅ [UPDATE SPEC] OpenAPI structure validated');
    } catch (validationError) {
      console.log('❌ [UPDATE SPEC] Validation failed:', validationError.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid OpenAPI specification',
        details: validationError.message
      });
    }

    if (version && version !== req.api.currentVersion) {
      // Create new version
      console.log('🔧 [UPDATE SPEC] Creating new version:', version);
      await req.api.addVersion(version, spec, changelog, req.user._id);
    } else {
      // Update current version
      console.log('🔧 [UPDATE SPEC] Updating current version:', req.api.currentVersion);
      const currentVersionIndex = req.api.versions.findIndex(v => v.version === req.api.currentVersion);
      if (currentVersionIndex !== -1) {
        req.api.versions[currentVersionIndex].openApiSpec = spec;
        req.api.versions[currentVersionIndex].changelog = changelog || 'Specification updated';
        
        console.log('🔧 [UPDATE SPEC] Updated version data:', {
          versionIndex: currentVersionIndex,
          version: req.api.versions[currentVersionIndex].version,
          specKeys: Object.keys(req.api.versions[currentVersionIndex].openApiSpec),
          hasComponents: !!req.api.versions[currentVersionIndex].openApiSpec.components,
          schemasInUpdatedSpec: req.api.versions[currentVersionIndex].openApiSpec.components?.schemas ? Object.keys(req.api.versions[currentVersionIndex].openApiSpec.components.schemas) : null
        });
        
        await req.api.save();
        console.log('✅ [UPDATE SPEC] API saved successfully');
      } else {
        console.log('❌ [UPDATE SPEC] Current version not found in versions array');
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