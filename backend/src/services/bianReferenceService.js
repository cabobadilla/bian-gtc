const BIANReferenceAPI = require('../models/BIANReferenceAPI');
const openaiService = require('./openaiService');

const isDebug = process.env.DEBUG === 'ON';

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

      if (isDebug) {
        console.log('🔍 [BIAN SEARCH] Starting search:', {
          searchQuery,
          options
        });
      }

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

      if (isDebug) {
        console.log('📊 [BIAN SEARCH] Database results:', {
          count: results.length,
          hasResults: results.length > 0
        });
      }

      // If no results from database, use ChatGPT to generate BIAN-compliant suggestions
      if (results.length === 0 && searchQuery) {
        if (isDebug) {
          console.log('🤖 [BIAN SEARCH] No DB results, using ChatGPT...');
        }
        
        // Use Promise.race to implement timeout
        const aiPromise = this.generateBIANSuggestions(searchQuery, language);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000) // 8 second timeout
        );
        
        try {
          const aiResults = await Promise.race([aiPromise, timeoutPromise]);
          
          if (aiResults.success) {
            return {
              success: true,
              results: aiResults.suggestions,
              count: aiResults.suggestions.length,
              source: 'ai-generated'
            };
          }
        } catch (error) {
          if (isDebug) {
            console.log('⏰ [BIAN SEARCH] AI timeout or error, using fallback:', error.message);
          }
          
          // Immediate fallback on timeout or error
          const fallbackSuggestions = this.generateFallbackSuggestions(searchQuery, language);
          
          return {
            success: true,
            results: fallbackSuggestions,
            count: fallbackSuggestions.length,
            source: 'fallback-timeout',
            note: 'AI service timeout, showing contextual suggestions'
          };
        }
      }

      // Enrich results with localized descriptions
      const enrichedResults = results.map(api => ({
        ...api.toObject(),
        localizedDescription: api.getEnrichedDescription(language)
      }));

      return {
        success: true,
        results: enrichedResults,
        count: enrichedResults.length,
        source: 'database'
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
   * Generate BIAN API suggestions using ChatGPT
   */
  async generateBIANSuggestions(searchQuery, language = 'en') {
    try {
      if (isDebug) {
        console.log('🤖 [AI SUGGESTIONS] Generating for query:', searchQuery);
      }

      const systemPrompt = language === 'es' 
        ? `Eres un experto en estándares BIAN (Banking Industry Architecture Network). Genera sugerencias de APIs BIAN basadas en la consulta del usuario.

Para cada API sugerida, proporciona:
1. Nombre descriptivo de la API
2. Dominio de servicio BIAN apropiado
3. Descripción clara de la funcionalidad
4. Operaciones principales (métodos HTTP)
5. Nivel de complejidad (low/medium/high)

Responde en formato JSON con un array de APIs sugeridas. Máximo 6 sugerencias.`
        : `You are an expert in BIAN (Banking Industry Architecture Network) standards. Generate BIAN API suggestions based on the user's search query.

For each suggested API, provide:
1. Descriptive API name
2. Appropriate BIAN service domain
3. Clear functionality description
4. Main operations (HTTP methods)
5. Complexity level (low/medium/high)

Respond in JSON format with an array of suggested APIs. Maximum 6 suggestions.`;

      const userPrompt = `Generate BIAN API suggestions for: "${searchQuery}"

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

JSON format:
{
  "suggestions": [
    {
      "_id": "ai-generated-1",
      "name": "API Name",
      "serviceDomain": "Service Domain",
      "description": "Description",
      "complexity": "low|medium|high",
      "serviceOperations": [
        {
          "name": "Operation Name",
          "method": "GET|POST|PUT|DELETE",
          "description": "Operation description"
        }
      ],
      "tags": ["tag1", "tag2"],
      "popularity": 0
    }
  ]
}`;

      const completion = await openaiService.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const responseText = completion.choices[0].message.content;
      
      if (isDebug) {
        console.log('🤖 [AI SUGGESTIONS] Raw response:', responseText);
      }

      // Clean the response to remove markdown formatting and extract JSON
      let cleanedResponse = responseText;
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
      
      // Remove any leading/trailing whitespace
      cleanedResponse = cleanedResponse.trim();
      
      // Find JSON object boundaries if there's extra text
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }

      if (isDebug) {
        console.log('🧹 [AI SUGGESTIONS] Cleaned response:', cleanedResponse);
      }

      // Parse JSON response
      const parsedResponse = JSON.parse(cleanedResponse);
      
      if (isDebug) {
        console.log('✅ [AI SUGGESTIONS] Generated suggestions:', {
          count: parsedResponse.suggestions?.length || 0
        });
      }

      return {
        success: true,
        suggestions: parsedResponse.suggestions || [],
        usage: completion.usage
      };

    } catch (error) {
      console.error('AI suggestions error:', error);
      
      if (isDebug) {
        console.log('💥 [AI SUGGESTIONS] Error details:', {
          errorType: error.constructor.name,
          message: error.message,
          searchQuery
        });
      }

      // If JSON parsing fails, return fallback suggestions
      if (error instanceof SyntaxError) {
        console.log('🔄 [AI SUGGESTIONS] JSON parsing failed, using fallback suggestions');
        
        const fallbackSuggestions = this.generateFallbackSuggestions(searchQuery, language);
        
        return {
          success: true,
          suggestions: fallbackSuggestions,
          source: 'fallback',
          note: 'AI service unavailable, showing fallback suggestions'
        };
      }
      
      return {
        success: false,
        error: 'Failed to generate AI suggestions',
        details: error.message
      };
    }
  }

  /**
   * Generate fallback suggestions when AI fails
   */
  generateFallbackSuggestions(searchQuery, language = 'en') {
    const isSpanish = language === 'es';
    
    // Create contextual suggestions based on search query
    const suggestions = [];
    const query = searchQuery.toLowerCase();
    
    if (query.includes('pago') || query.includes('payment')) {
      suggestions.push({
        _id: 'fallback-payment-1',
        name: isSpanish ? 'Gestión de Órdenes de Pago' : 'Payment Order Management',
        serviceDomain: 'Payment Processing',
        description: isSpanish 
          ? 'API para gestionar órdenes de pago y transferencias bancarias'
          : 'API to manage payment orders and bank transfers',
        complexity: 'high',
        serviceOperations: [
          {
            name: isSpanish ? 'Iniciar Pago' : 'Initiate Payment',
            method: 'POST',
            description: isSpanish ? 'Iniciar una nueva orden de pago' : 'Start a new payment order'
          },
          {
            name: isSpanish ? 'Consultar Estado' : 'Check Status',
            method: 'GET',
            description: isSpanish ? 'Verificar el estado del pago' : 'Check payment status'
          }
        ],
        tags: ['payment', 'transfer', 'banking'],
        popularity: 0
      });
    }
    
    if (query.includes('cliente') || query.includes('customer')) {
      suggestions.push({
        _id: 'fallback-customer-1',
        name: isSpanish ? 'Gestión de Información del Cliente' : 'Customer Information Management',
        serviceDomain: 'Customer Management',
        description: isSpanish 
          ? 'API para gestionar perfiles e información de clientes'
          : 'API to manage customer profiles and information',
        complexity: 'medium',
        serviceOperations: [
          {
            name: isSpanish ? 'Obtener Cliente' : 'Get Customer',
            method: 'GET',
            description: isSpanish ? 'Obtener información del cliente' : 'Retrieve customer information'
          },
          {
            name: isSpanish ? 'Actualizar Cliente' : 'Update Customer',
            method: 'PUT',
            description: isSpanish ? 'Actualizar datos del cliente' : 'Update customer data'
          }
        ],
        tags: ['customer', 'profile', 'management'],
        popularity: 0
      });
    }
    
    // If no specific matches, add generic banking APIs
    if (suggestions.length === 0) {
      suggestions.push(
        {
          _id: 'fallback-generic-1',
          name: isSpanish ? 'Gestión de Cuentas' : 'Account Management',
          serviceDomain: 'Account Management',
          description: isSpanish 
            ? 'API para gestionar cuentas bancarias y operaciones'
            : 'API to manage bank accounts and operations',
          complexity: 'medium',
          serviceOperations: [
            {
              name: isSpanish ? 'Consultar Saldo' : 'Check Balance',
              method: 'GET',
              description: isSpanish ? 'Consultar saldo de cuenta' : 'Check account balance'
            }
          ],
          tags: ['account', 'balance', 'banking'],
          popularity: 0
        },
        {
          _id: 'fallback-generic-2',
          name: isSpanish ? 'Procesamiento de Transacciones' : 'Transaction Processing',
          serviceDomain: 'Payment Processing',
          description: isSpanish 
            ? 'API para procesar transacciones financieras'
            : 'API to process financial transactions',
          complexity: 'high',
          serviceOperations: [
            {
              name: isSpanish ? 'Procesar Transacción' : 'Process Transaction',
              method: 'POST',
              description: isSpanish ? 'Procesar una nueva transacción' : 'Process a new transaction'
            }
          ],
          tags: ['transaction', 'processing', 'finance'],
          popularity: 0
        }
      );
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Get BIAN API by ID with AI-enhanced explanation
   */
  async getAPIDetails(apiId, options = {}) {
    try {
      const { language = 'en', includeAIExplanation = false } = options;

      if (isDebug) {
        console.log('🔍 [API DETAILS] Getting details for:', {
          apiId,
          options
        });
      }

      // Check if this is an AI-generated API (not in database)
      if (apiId.startsWith('ai-generated-') || apiId.startsWith('fallback-') || apiId.startsWith('example-')) {
        if (isDebug) {
          console.log('🤖 [API DETAILS] This is an AI-generated API, not in database');
        }
        
        return {
          success: false,
          error: 'AI-generated APIs are not stored in database and cannot be retrieved for detailed explanation',
          isAIGenerated: true
        };
      }

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
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
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
      if (isDebug) {
        console.log('🏢 [SERVICE DOMAINS] Getting domains...');
      }

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

      if (isDebug) {
        console.log('📊 [SERVICE DOMAINS] Database domains:', {
          count: domains.length
        });
      }

      // If no domains in database, return standard BIAN domains
      if (domains.length === 0) {
        if (isDebug) {
          console.log('🏢 [SERVICE DOMAINS] No DB domains, using standard BIAN domains');
        }

        const standardDomains = [
          { name: 'Customer Management', count: 0, complexity: 'medium' },
          { name: 'Account Management', count: 0, complexity: 'medium' },
          { name: 'Payment Processing', count: 0, complexity: 'high' },
          { name: 'Credit Management', count: 0, complexity: 'high' },
          { name: 'Risk Assessment', count: 0, complexity: 'high' },
          { name: 'Compliance', count: 0, complexity: 'medium' },
          { name: 'Analytics', count: 0, complexity: 'low' }
        ];

        return {
          success: true,
          domains: standardDomains,
          source: 'standard'
        };
      }

      return {
        success: true,
        domains: domains.map(d => ({
          name: d._id,
          count: d.count,
          complexity: d.avgComplexity < 1.5 ? 'low' : d.avgComplexity < 2.5 ? 'medium' : 'high'
        })),
        source: 'database'
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
      if (isDebug) {
        console.log('🔥 [POPULAR APIS] Getting popular APIs...');
      }

      const popularAPIs = await BIANReferenceAPI.getPopular(limit);

      if (isDebug) {
        console.log('📊 [POPULAR APIS] Database results:', {
          count: popularAPIs.length
        });
      }

      // If no popular APIs in database, generate some examples
      if (popularAPIs.length === 0) {
        if (isDebug) {
          console.log('🔥 [POPULAR APIS] No DB results, using examples');
        }

        const exampleAPIs = [
          {
            _id: 'example-1',
            name: 'Customer Information Management',
            serviceDomain: 'Customer Management',
            description: 'Manage comprehensive customer information and profiles',
            complexity: 'medium',
            serviceOperations: [
              { name: 'Retrieve Customer', method: 'GET', description: 'Get customer details' },
              { name: 'Update Customer', method: 'PUT', description: 'Update customer information' }
            ],
            tags: ['customer', 'profile', 'management'],
            popularity: 0
          },
          {
            _id: 'example-2',
            name: 'Payment Order Processing',
            serviceDomain: 'Payment Processing',
            description: 'Process and manage payment orders and transactions',
            complexity: 'high',
            serviceOperations: [
              { name: 'Initiate Payment', method: 'POST', description: 'Start payment process' },
              { name: 'Check Status', method: 'GET', description: 'Check payment status' }
            ],
            tags: ['payment', 'transaction', 'processing'],
            popularity: 0
          }
        ];

        return {
          success: true,
          apis: exampleAPIs,
          source: 'examples'
        };
      }

      return {
        success: true,
        apis: popularAPIs,
        source: 'database'
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
      if (isDebug) {
        console.log('🔧 [CREATE API] Starting creation:', {
          referenceId,
          customizations,
          userId,
          companyId
        });
      }

      // Check if this is an AI-generated API (not in database)
      if (referenceId.startsWith('ai-generated-') || referenceId.startsWith('fallback-') || referenceId.startsWith('example-')) {
        if (isDebug) {
          console.log('🤖 [CREATE API] This is an AI-generated API, creating from provided data');
        }
        
        // For AI-generated APIs, we need the API data to be provided in customizations
        if (!customizations.apiData) {
          return {
            success: false,
            error: 'AI-generated APIs require the original API data to create user APIs',
            details: 'The frontend must provide the complete API data in customizations.apiData'
          };
        }

        const apiData = customizations.apiData;
        
        // Create the API using existing API service
        const API = require('../models/API');
        
        const newAPI = new API({
          name: customizations.name || `${apiData.name}_Custom`,
          description: customizations.description || apiData.description,
          company: companyId,
          createdBy: userId,
          category: this.mapServiceDomainToCategory(apiData.serviceDomain),
          bianDomains: [{
            domain: apiData.serviceDomain,
            serviceOperations: apiData.serviceOperations?.map(op => op.name) || []
          }],
          tags: apiData.tags || [],
          baseReference: {
            type: 'bian-ai-generated',
            referenceId: referenceId,
            referenceName: apiData.name,
            source: 'ai-generated'
          }
        });

        // Create a basic OpenAPI spec from the AI-generated data
        const openApiSpec = this.createOpenAPISpecFromAIData(apiData, customizations);
        newAPI.versions[0].openApiSpec = openApiSpec;

        await newAPI.save();

        if (isDebug) {
          console.log('✅ [CREATE API] AI-generated API created successfully:', {
            apiId: newAPI._id,
            name: newAPI.name
          });
        }

        return {
          success: true,
          api: newAPI,
          referenceUsed: apiData.name,
          source: 'ai-generated'
        };
      }

      // For database APIs, proceed with normal flow
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

      if (isDebug) {
        console.log('✅ [CREATE API] Database API created successfully:', {
          apiId: newAPI._id,
          name: newAPI.name
        });
      }

      return {
        success: true,
        api: newAPI,
        referenceUsed: referenceAPI.name,
        source: 'database'
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
   * Create OpenAPI spec from AI-generated data
   */
  createOpenAPISpecFromAIData(apiData, customizations) {
    const spec = {
      openapi: "3.0.0",
      info: {
        title: customizations.name || apiData.name,
        description: customizations.description || apiData.description,
        version: "1.0.0"
      },
      servers: [
        {
          url: "https://api.example.com/v1",
          description: "Production server"
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      security: [
        {
          BearerAuth: []
        }
      ]
    };

    // Add paths from service operations
    if (apiData.serviceOperations && apiData.serviceOperations.length > 0) {
      apiData.serviceOperations.forEach(operation => {
        const path = `/${operation.name.toLowerCase().replace(/\s+/g, '-')}`;
        const method = operation.method.toLowerCase();
        
        if (!spec.paths[path]) {
          spec.paths[path] = {};
        }
        
        spec.paths[path][method] = {
          summary: operation.name,
          description: operation.description,
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: {
                        type: "boolean",
                        example: true
                      },
                      data: {
                        type: "object"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              description: "Bad request"
            },
            "401": {
              description: "Unauthorized"
            },
            "500": {
              description: "Internal server error"
            }
          }
        };

        // Add request body for POST/PUT methods
        if (['post', 'put', 'patch'].includes(method)) {
          spec.paths[path][method].requestBody = {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      description: "Request data"
                    }
                  }
                }
              }
            }
          };
        }
      });
    }

    return spec;
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