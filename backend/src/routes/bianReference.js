const express = require('express');
const { verifyToken } = require('../middleware/auth');
const bianReferenceService = require('../services/bianReferenceService');

const router = express.Router();

/**
 * @swagger
 * /api/bian/search:
 *   get:
 *     summary: Search BIAN reference APIs
 *     tags: [BIAN Reference]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (keywords)
 *       - in: query
 *         name: serviceDomain
 *         schema:
 *           type: string
 *         description: Filter by BIAN service domain
 *       - in: query
 *         name: complexity
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by complexity level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [popularity, relevance]
 *           default: popularity
 *         description: Sort criteria
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [en, es]
 *           default: en
 *         description: Language for descriptions
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q, serviceDomain, complexity, limit, sort, language } = req.query;

    const result = await bianReferenceService.searchAPIs(q, {
      serviceDomain,
      complexity,
      limit: parseInt(limit) || 20,
      sort,
      language
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('BIAN search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

/**
 * @swagger
 * /api/bian/domains:
 *   get:
 *     summary: Get BIAN service domains
 *     tags: [BIAN Reference]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of service domains with counts
 */
router.get('/domains', verifyToken, async (req, res) => {
  try {
    const result = await bianReferenceService.getServiceDomains();
    res.json(result);
  } catch (error) {
    console.error('Get service domains error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service domains'
    });
  }
});

/**
 * @swagger
 * /api/bian/popular:
 *   get:
 *     summary: Get popular BIAN reference APIs
 *     tags: [BIAN Reference]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: List of popular BIAN APIs
 */
router.get('/popular', verifyToken, async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await bianReferenceService.getPopularAPIs(parseInt(limit) || 10);
    res.json(result);
  } catch (error) {
    console.error('Get popular APIs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular APIs'
    });
  }
});

/**
 * @swagger
 * /api/bian/{id}:
 *   get:
 *     summary: Get BIAN reference API details
 *     tags: [BIAN Reference]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BIAN reference API ID
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [en, es]
 *           default: en
 *         description: Language for descriptions
 *       - in: query
 *         name: includeAI
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include AI-generated explanation
 *     responses:
 *       200:
 *         description: BIAN API details
 *       404:
 *         description: BIAN API not found
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { language, includeAI } = req.query;

    const result = await bianReferenceService.getAPIDetails(id, {
      language,
      includeAIExplanation: includeAI === 'true'
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Get BIAN API details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API details'
    });
  }
});

/**
 * @swagger
 * /api/bian/{id}/explain:
 *   post:
 *     summary: Generate AI explanation for BIAN API
 *     tags: [BIAN Reference]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BIAN reference API ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [en, es]
 *                 default: en
 *               focus:
 *                 type: string
 *                 description: Specific aspect to focus explanation on
 *     responses:
 *       200:
 *         description: AI explanation generated
 *       404:
 *         description: BIAN API not found
 */
router.post('/:id/explain', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'en' } = req.body;

    // Check if this is an AI-generated API
    if (id.startsWith('ai-generated-') || id.startsWith('fallback-') || id.startsWith('example-')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot generate explanations for AI-generated APIs',
        message: 'Las APIs generadas por IA ya incluyen explicaciones contextuales. Para obtener más detalles, considera crear una API personalizada basada en esta referencia.',
        isAIGenerated: true
      });
    }

    const apiResult = await bianReferenceService.getAPIDetails(id);
    if (!apiResult.success) {
      return res.status(404).json(apiResult);
    }

    const explanation = await bianReferenceService.generateAIExplanation(
      apiResult.api, 
      language
    );

    res.json(explanation);

  } catch (error) {
    console.error('Generate AI explanation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate explanation'
    });
  }
});

/**
 * @swagger
 * /api/bian/{id}/create-api:
 *   post:
 *     summary: Create user API based on BIAN reference
 *     tags: [BIAN Reference]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BIAN reference API ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId]
 *             properties:
 *               companyId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               customizations:
 *                 type: object
 *     responses:
 *       201:
 *         description: User API created successfully
 *       404:
 *         description: BIAN reference API not found
 */
router.post('/:id/create-api', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, name, description, customizations = {} } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const customizationData = {
      name,
      description,
      ...customizations
    };

    const result = await bianReferenceService.createUserAPIFromReference(
      id,
      customizationData,
      req.user._id,
      companyId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);

  } catch (error) {
    console.error('Create API from reference error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API from reference'
    });
  }
});

module.exports = router; 