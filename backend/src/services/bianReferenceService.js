const BIANReferenceAPI = require('../models/BIANReferenceAPI');
const openaiService = require('./openaiService');

class BIANReferenceService {
  
  /**
   * Search BIAN reference APIs by keyword and filters
   */
  async searchAPIs(searchQuery, options = {}) {
    try {
      const {
        serviceDomain,
        complexity,
        limit = 20,
        sort = 'popularity',
        language = 'en'
      } = options;

      let results;

      if (searchQuery) {
        results = await BIANReferenceAPI.searchByKeyword(searchQuery, {
          serviceDomain,
          complexity,
          limit,
          sort
        });
      } else {
        // If no search query, get popular APIs
        const query = { isActive: true };
        if (serviceDomain) query.serviceDomain = serviceDomain;
        if (complexity) query.complexity = complexity;

        const sortOptions = sort === 'popularity' ? { popularity: -1 } : { createdAt: -1 };
        results = await BIANReferenceAPI.find(query)
          .sort(sortOptions)
          .limit(limit);
      }

      // Enrich results with localized descriptions
      const enrichedResults = results.map(api => ({
        ...api.toObject(),
        localizedDescription: api.getEnrichedDescription(language)
      }));

      return {
        success: true,
        results: enrichedResults,
        count: enrichedResults.length
      };

    } catch (error) {
      console.error('Search BIAN APIs error:', error);
      return {
        success: false,
        error: 'Failed to search BIAN reference APIs',
        details: error.message
      };
    }
  }

  /**
   * Get BIAN API by ID with AI-enhanced explanation
   */
  async getAPIDetails(apiId, options = {}) {
    try {
      const { language = 'en', includeAIExplanation = false } = options;

      const api = await BIANReferenceAPI.findById(apiId);
      if (!api) {
        return {
          success: false,
          error: 'BIAN reference API not found'
        };
      }

      // Increment popularity
      await api.incrementPopularity();

      let aiExplanation = null;
      if (includeAIExplanation) {
        aiExplanation = await this.generateAIExplanation(api, language);
      }

      return {
        success: true,
        api: {
          ...api.toObject(),
          localizedDescription: api.getEnrichedDescription(language),
          aiExplanation: aiExplanation?.success ? aiExplanation.explanation : null
        }
      };

    } catch (error) {
      console.error('Get BIAN API details error:', error);
      return {
        success: false,
        error: 'Failed to get BIAN API details',
        details: error.message
      };
    }
  }

  /**
   * Generate AI explanation for a BIAN API
   */
  async generateAIExplanation(api, language = 'en') {
    try {
      const systemPrompt = language === 'es' 
        ? `Eres un experto en estándares BIAN (Banking Industry Architecture Network) y banca digital. Explica la API BIAN de forma clara y práctica para desarrolladores de software bancario.

Proporciona:
1. Propósito de negocio de la API
2. Casos de uso prácticos con ejemplos
3. Cómo se integra en un ecosistema bancario
4. Consideraciones de implementación
5. Beneficios para la organización

Responde en español de forma técnica pero comprensible.`
        : `You are an expert in BIAN (Banking Industry Architecture Network) standards and digital banking. Explain the BIAN API clearly and practically for banking software developers.

Provide:
1. Business purpose of the API
2. Practical use cases with examples
3. How it integrates into a banking ecosystem
4. Implementation considerations
5. Benefits for the organization

Respond in English in a technical but understandable way.`;

      const userPrompt = `Explain this BIAN API:

Name: ${api.name}
Service Domain: ${api.serviceDomain}
Description: ${api.description}
Functional Pattern: ${api.functionalPattern}
Service Operations: ${api.serviceOperations.map(op => `${op.method} ${op.name}`).join(', ')}
Business Capabilities: ${api.businessCapabilities.join(', ')}
Use Cases: ${api.useCases.map(uc => uc.title).join(', ')}`;

      const completion = await openaiService.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      return {
        success: true,
        explanation: completion.choices[0].message.content,
        usage: completion.usage
      };

    } catch (error) {
      console.error('AI explanation error:', error);
      return {
        success: false,
        error: 'Failed to generate AI explanation',
        details: error.message
      };
    }
  }

  /**
   * Get service domains with counts
   */
  async getServiceDomains() {
    try {
      const domains = await BIANReferenceAPI.aggregate([
        { $match: { isActive: true } },
        { 
          $group: { 
            _id: '$serviceDomain', 
            count: { $sum: 1 },
            avgComplexity: { $avg: { $cond: [
              { $eq: ['$complexity', 'low'] }, 1,
              { $cond: [{ $eq: ['$complexity', 'medium'] }, 2, 3] }
            ]}}
          } 
        },
        { $sort: { count: -1 } }
      ]);

      return {
        success: true,
        domains: domains.map(d => ({
          name: d._id,
          count: d.count,
          complexity: d.avgComplexity < 1.5 ? 'low' : d.avgComplexity < 2.5 ? 'medium' : 'high'
        }))
      };

    } catch (error) {
      console.error('Get service domains error:', error);
      return {
        success: false,
        error: 'Failed to get service domains'
      };
    }
  }

  /**
   * Get popular BIAN APIs
   */
  async getPopularAPIs(limit = 10) {
    try {
      const popularAPIs = await BIANReferenceAPI.getPopular(limit);

      return {
        success: true,
        apis: popularAPIs
      };

    } catch (error) {
      console.error('Get popular APIs error:', error);
      return {
        success: false,
        error: 'Failed to get popular APIs'
      };
    }
  }

  /**
   * Create user API based on BIAN reference
   */
  async createUserAPIFromReference(referenceId, customizations, userId, companyId) {
    try {
      const referenceAPI = await BIANReferenceAPI.findById(referenceId);
      if (!referenceAPI) {
        return {
          success: false,
          error: 'BIAN reference API not found'
        };
      }

      // Clone and customize the OpenAPI spec
      const customSpec = JSON.parse(JSON.stringify(referenceAPI.openApiSpec));
      
      // Apply customizations
      if (customizations.name) {
        customSpec.info.title = customizations.name;
      }
      if (customizations.description) {
        customSpec.info.description = customizations.description;
      }

      // Create the API using existing API service
      const API = require('../models/API');
      
      const newAPI = new API({
        name: customizations.name || `${referenceAPI.name}_Custom`,
        description: customizations.description || referenceAPI.description,
        company: companyId,
        createdBy: userId,
        category: this.mapServiceDomainToCategory(referenceAPI.serviceDomain),
        bianDomains: [{
          domain: referenceAPI.serviceDomain,
          serviceOperations: referenceAPI.serviceOperations.map(op => op.name)
        }],
        tags: referenceAPI.tags,
        baseReference: {
          type: 'bian',
          referenceId: referenceAPI._id,
          referenceName: referenceAPI.name
        }
      });

      // Set the customized spec as the first version
      newAPI.versions[0].openApiSpec = customSpec;

      await newAPI.save();
      await referenceAPI.incrementPopularity();

      return {
        success: true,
        api: newAPI,
        referenceUsed: referenceAPI.name
      };

    } catch (error) {
      console.error('Create user API from reference error:', error);
      return {
        success: false,
        error: 'Failed to create API from BIAN reference',
        details: error.message
      };
    }
  }

  /**
   * Map BIAN service domain to our API categories
   */
  mapServiceDomainToCategory(serviceDomain) {
    const mappings = {
      'Customer Management': 'customer-management',
      'Account Management': 'account-management',
      'Payment Order': 'payment-processing',
      'Credit Management': 'lending',
      'Risk Assessment': 'risk-management',
      'Compliance': 'compliance',
      'Analytics': 'analytics'
    };
    
    return mappings[serviceDomain] || 'other';
  }
}

module.exports = new BIANReferenceService(); 