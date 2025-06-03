const BIANReferenceAPI = require('../models/BIANReferenceAPI');
const openaiService = require('./openaiService');

const isDebug = process.env.DEBUG === 'ON';

class BIANReferenceService {
  
  /**
   * Search BIAN reference APIs by keyword and filters
   * Optimized version with faster responses and better error handling
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

      // For empty queries, return popular/example APIs immediately
      if (!searchQuery || searchQuery.trim().length === 0) {
        const query = { isActive: true };
        if (serviceDomain) query.serviceDomain = serviceDomain;
        if (complexity) query.complexity = complexity;

        const sortOptions = sort === 'popularity' ? { popularity: -1 } : { createdAt: -1 };
        
        try {
          const results = await BIANReferenceAPI.find(query)
            .sort(sortOptions)
            .limit(limit)
            .maxTimeMS(5000); // 5 second timeout for DB query

          if (results.length > 0) {
            return {
              success: true,
              results: results.map(api => ({
                ...api.toObject(),
                localizedDescription: api.getEnrichedDescription(language)
              })),
              count: results.length,
              source: 'database'
            };
          }
        } catch (dbError) {
          if (isDebug) {
            console.log('⚠️ [BIAN SEARCH] Database query failed:', dbError.message);
          }
        }

        // Fallback to examples if DB fails
        const exampleAPIs = this.getPopularExampleAPIs(language);
        return {
          success: true,
          results: exampleAPIs,
          count: exampleAPIs.length,
          source: 'examples'
        };
      }

      // For short queries, try database first (faster than AI)
      if (searchQuery.trim().length <= 15) {
        if (isDebug) {
          console.log('🔍 [BIAN SEARCH] Short query detected, trying database first');
        }
        
        try {
          const results = await BIANReferenceAPI.searchByKeyword(searchQuery, {
            serviceDomain,
            complexity,
            limit,
            sort
          });

          if (results.length > 0) {
            if (isDebug) {
              console.log('✅ [BIAN SEARCH] Database found results for short query');
            }
            
            return {
              success: true,
              results: results.map(api => ({
                ...api.toObject(),
                localizedDescription: api.getEnrichedDescription(language)
              })),
              count: results.length,
              source: 'database'
            };
          }
        } catch (dbError) {
          if (isDebug) {
            console.log('⚠️ [BIAN SEARCH] Database search failed:', dbError.message);
          }
        }
      }

      // Try AI-powered search with timeout protection
      if (isDebug) {
        console.log('🤖 [BIAN SEARCH] Trying AI-powered search with timeout protection');
      }
      
      try {
        // Set a shorter timeout for AI requests
        const aiResults = await Promise.race([
          this.generateIntelligentBIANSuggestions(searchQuery, {
            serviceDomain,
            complexity,
            language,
            limit: Math.min(limit, 6) // Limit AI results to reduce response time
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI search timeout')), 15000) // 15 second timeout
          )
        ]);
        
        if (aiResults.success && aiResults.suggestions.length > 0) {
          if (isDebug) {
            console.log('✅ [BIAN SEARCH] AI search successful');
          }
          
          return {
            success: true,
            results: aiResults.suggestions,
            count: aiResults.suggestions.length,
            source: 'ai-intelligent',
            interpretation: aiResults.interpretation
          };
        }
      } catch (error) {
        if (isDebug) {
          console.log('⚠️ [BIAN SEARCH] AI search failed or timed out:', error.message);
        }
      }

      // Fallback to database search if AI fails
      if (isDebug) {
        console.log('🗄️ [BIAN SEARCH] Falling back to database search');
      }
      
      try {
        const results = await BIANReferenceAPI.searchByKeyword(searchQuery, {
          serviceDomain,
          complexity,
          limit,
          sort
        });

        if (results.length > 0) {
          return {
            success: true,
            results: results.map(api => ({
              ...api.toObject(),
              localizedDescription: api.getEnrichedDescription(language)
            })),
            count: results.length,
            source: 'database-fallback'
          };
        }
      } catch (dbError) {
        if (isDebug) {
          console.log('⚠️ [BIAN SEARCH] Database fallback also failed:', dbError.message);
        }
      }

      // Final fallback to enhanced suggestions
      if (isDebug) {
        console.log('🎯 [BIAN SEARCH] Using enhanced fallback suggestions');
      }
      
      const fallbackSuggestions = this.generateEnhancedFallbackSuggestions(searchQuery, language);
      
      return {
        success: true,
        results: fallbackSuggestions,
        count: fallbackSuggestions.length,
        source: 'fallback-enhanced',
        note: language === 'es' ? 'Sugerencias contextuales basadas en tu búsqueda' : 'Contextual suggestions based on your search'
      };

    } catch (error) {
      console.error('❌ [BIAN SEARCH] Critical error:', error);
      
      // Return basic examples as last resort
      const exampleAPIs = this.getPopularExampleAPIs(options.language || 'en');
      return {
        success: true,
        results: exampleAPIs,
        count: exampleAPIs.length,
        source: 'emergency-fallback',
        note: 'Emergency fallback results'
      };
    }
  }

  /**
   * Generate intelligent BIAN API suggestions using enhanced ChatGPT prompts
   * Optimized with better JSON parsing and error handling
   */
  async generateIntelligentBIANSuggestions(searchQuery, options = {}) {
    try {
      const { serviceDomain, complexity, language = 'en', limit = 6 } = options;

      if (isDebug) {
        console.log('🧠 [INTELLIGENT SEARCH] Generating for query:', searchQuery);
      }

      const systemPrompt = language === 'es' 
        ? `Eres un experto en estándares BIAN (Banking Industry Architecture Network) v12. 
Tu tarea es generar APIs BIAN precisas basadas en consultas de búsqueda.

IMPORTANTE: Responde SOLO con JSON válido. No incluyas explicaciones adicionales.

Estructura JSON requerida:
{
  "interpretation": {
    "query": "consulta original",
    "intent": "intención detectada",
    "domain": "dominio BIAN principal",
    "keywords": ["palabras", "clave"]
  },
  "suggestions": [
    {
      "_id": "ai-intelligent-1",
      "name": "Nombre API",
      "serviceDomain": "Dominio BIAN",
      "description": "Descripción clara y concisa",
      "complexity": "low|medium|high",
      "serviceOperations": [
        {
          "name": "Operación",
          "method": "GET|POST|PUT|DELETE",
          "description": "Descripción breve",
          "path": "/endpoint"
        }
      ],
      "tags": ["etiquetas"],
      "searchKeywords": ["palabras", "clave"],
      "functionalPattern": "Service Domain",
      "popularity": 0
    }
  ]
}`
        : `You are a BIAN (Banking Industry Architecture Network) v12 expert.
Your task is to generate precise BIAN APIs based on search queries.

IMPORTANT: Respond ONLY with valid JSON. Do not include additional explanations.

Required JSON structure:
{
  "interpretation": {
    "query": "original query",
    "intent": "detected intent",
    "domain": "main BIAN domain",
    "keywords": ["key", "words"]
  },
  "suggestions": [
    {
      "_id": "ai-intelligent-1",
      "name": "API Name",
      "serviceDomain": "BIAN Domain",
      "description": "Clear and concise description",
      "complexity": "low|medium|high",
      "serviceOperations": [
        {
          "name": "Operation",
          "method": "GET|POST|PUT|DELETE",
          "description": "Brief description",
          "path": "/endpoint"
        }
      ],
      "tags": ["tags"],
      "searchKeywords": ["key", "words"],
      "functionalPattern": "Service Domain",
      "popularity": 0
    }
  ]
}`;

      const contextualHints = this.generateContextualHints(searchQuery, serviceDomain, complexity, language);

      const userPrompt = `Analiza esta consulta y genera máximo ${limit} APIs BIAN relevantes:

CONSULTA: "${searchQuery}"
${serviceDomain ? `DOMINIO: ${serviceDomain}` : ''}
${complexity ? `COMPLEJIDAD: ${complexity}` : ''}

CONTEXTO:
${contextualHints}

Genera APIs específicas y prácticas. Mantén las descripciones concisas.`;

      // Use shorter timeout and reduced token limit for faster responses
      const completion = await Promise.race([
        openaiService.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1, // Lower temperature for more consistent responses
          max_tokens: 2000, // Reduced from 3000 for faster responses
          response_format: { type: "json_object" }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI request timeout')), 12000) // 12 second timeout
        )
      ]);

      const responseText = completion.choices[0].message.content;
      
      if (isDebug) {
        console.log('🧠 [INTELLIGENT SEARCH] Raw response length:', responseText.length);
      }

      // Enhanced JSON parsing with better error handling
      let parsedResponse;
      try {
        // Clean the response text first
        const cleanedText = responseText
          .replace(/[\u0000-\u0019]+/g, '') // Remove control characters
          .replace(/\n\s*\n/g, '\n') // Remove extra newlines
          .trim();

        parsedResponse = JSON.parse(cleanedText);
        
        // Validate the response structure
        if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
          throw new Error('Invalid response structure');
        }

        // Ensure each suggestion has required fields
        parsedResponse.suggestions = parsedResponse.suggestions.map((suggestion, index) => ({
          _id: suggestion._id || `ai-intelligent-${index + 1}`,
          name: suggestion.name || `API ${index + 1}`,
          serviceDomain: suggestion.serviceDomain || 'General',
          description: suggestion.description || 'Generated API',
          complexity: suggestion.complexity || 'medium',
          serviceOperations: suggestion.serviceOperations || [],
          tags: suggestion.tags || [],
          searchKeywords: suggestion.searchKeywords || [],
          functionalPattern: suggestion.functionalPattern || 'Service Domain',
          popularity: 0
        }));

      } catch (parseError) {
        if (isDebug) {
          console.log('⚠️ [INTELLIGENT SEARCH] JSON parse failed:', parseError.message);
          console.log('Response preview:', responseText.substring(0, 200));
        }
        
        // Fallback to generating structured response
        parsedResponse = this.generateFallbackAIResponse(searchQuery, language, limit);
      }
      
      if (isDebug) {
        console.log('✅ [INTELLIGENT SEARCH] Generated suggestions:', {
          count: parsedResponse.suggestions?.length || 0,
          interpretation: parsedResponse.interpretation
        });
      }

      return {
        success: true,
        suggestions: parsedResponse.suggestions || [],
        interpretation: parsedResponse.interpretation || {
          query: searchQuery,
          intent: 'General search',
          domain: 'General',
          keywords: [searchQuery]
        },
        usage: completion.usage
      };

    } catch (error) {
      console.error('❌ [INTELLIGENT SEARCH] Error:', error);
      
      if (isDebug) {
        console.log('💥 [INTELLIGENT SEARCH] Error details:', {
          errorType: error.constructor.name,
          message: error.message,
          searchQuery
        });
      }

      // Return structured fallback response
      const fallbackResponse = this.generateFallbackAIResponse(searchQuery, options.language || 'en', options.limit || 6);
      
      return {
        success: true, // Return success even for fallback
        suggestions: fallbackResponse.suggestions,
        interpretation: fallbackResponse.interpretation,
        source: 'fallback'
      };
    }
  }

  /**
   * Generate fallback AI response when OpenAI fails
   */
  generateFallbackAIResponse(searchQuery, language = 'en', limit = 6) {
    const isSpanish = language === 'es';
    const query = searchQuery.toLowerCase();
    
    const suggestions = [];
    
    // Generate contextual suggestions based on query content
    if (query.includes('customer') || query.includes('cliente') || query.includes('profile') || query.includes('perfil')) {
      suggestions.push({
        _id: 'ai-intelligent-1',
        name: isSpanish ? 'Gestión de Perfiles de Cliente' : 'Customer Profile Management',
        serviceDomain: 'Customer Management',
        description: isSpanish 
          ? 'API para gestionar perfiles completos de clientes bancarios'
          : 'API to manage complete banking customer profiles',
        complexity: 'medium',
        serviceOperations: [
          {
            name: isSpanish ? 'Obtener Perfil' : 'Retrieve Profile',
            method: 'GET',
            description: isSpanish ? 'Obtener perfil del cliente' : 'Get customer profile',
            path: '/customer-profile/{id}'
          },
          {
            name: isSpanish ? 'Actualizar Perfil' : 'Update Profile',
            method: 'PUT',
            description: isSpanish ? 'Actualizar información del cliente' : 'Update customer information',
            path: '/customer-profile/{id}'
          }
        ],
        tags: ['customer', 'profile', 'management'],
        searchKeywords: ['customer', 'profile', 'cliente', 'perfil'],
        functionalPattern: 'Service Domain',
        popularity: 0
      });
    }

    if (query.includes('payment') || query.includes('pago') || query.includes('transfer')) {
      suggestions.push({
        _id: 'ai-intelligent-2',
        name: isSpanish ? 'Procesamiento de Pagos' : 'Payment Processing',
        serviceDomain: 'Payment Order',
        description: isSpanish 
          ? 'API para procesar órdenes de pago y transferencias'
          : 'API to process payment orders and transfers',
        complexity: 'high',
        serviceOperations: [
          {
            name: isSpanish ? 'Iniciar Pago' : 'Initiate Payment',
            method: 'POST',
            description: isSpanish ? 'Iniciar procesamiento de pago' : 'Start payment processing',
            path: '/payment-order'
          },
          {
            name: isSpanish ? 'Consultar Estado' : 'Check Status',
            method: 'GET',
            description: isSpanish ? 'Verificar estado del pago' : 'Check payment status',
            path: '/payment-order/{id}/status'
          }
        ],
        tags: ['payment', 'transfer', 'processing'],
        searchKeywords: ['payment', 'pago', 'transfer', 'order'],
        functionalPattern: 'Service Domain',
        popularity: 0
      });
    }

    if (query.includes('account') || query.includes('cuenta') || query.includes('balance')) {
      suggestions.push({
        _id: 'ai-intelligent-3',
        name: isSpanish ? 'Gestión de Cuentas' : 'Account Management',
        serviceDomain: 'Account Management',
        description: isSpanish 
          ? 'API para gestionar cuentas bancarias y saldos'
          : 'API to manage bank accounts and balances',
        complexity: 'medium',
        serviceOperations: [
          {
            name: isSpanish ? 'Consultar Saldo' : 'Check Balance',
            method: 'GET',
            description: isSpanish ? 'Consultar saldo de cuenta' : 'Check account balance',
            path: '/account/{id}/balance'
          },
          {
            name: isSpanish ? 'Obtener Transacciones' : 'Get Transactions',
            method: 'GET',
            description: isSpanish ? 'Obtener historial de transacciones' : 'Get transaction history',
            path: '/account/{id}/transactions'
          }
        ],
        tags: ['account', 'balance', 'transactions'],
        searchKeywords: ['account', 'cuenta', 'balance', 'saldo'],
        functionalPattern: 'Service Domain',
        popularity: 0
      });
    }

    // If no specific matches, add a generic suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        _id: 'ai-intelligent-fallback',
        name: isSpanish ? 'API Bancaria General' : 'General Banking API',
        serviceDomain: 'General',
        description: isSpanish 
          ? `API para operaciones bancarias relacionadas con: ${searchQuery}`
          : `Banking API for operations related to: ${searchQuery}`,
        complexity: 'medium',
        serviceOperations: [
          {
            name: isSpanish ? 'Consultar Datos' : 'Retrieve Data',
            method: 'GET',
            description: isSpanish ? 'Consultar información' : 'Retrieve information',
            path: '/data'
          }
        ],
        tags: ['general', 'banking'],
        searchKeywords: [searchQuery],
        functionalPattern: 'Service Domain',
        popularity: 0
      });
    }

    return {
      interpretation: {
        query: searchQuery,
        intent: isSpanish ? 'Búsqueda de APIs bancarias' : 'Banking API search',
        domain: suggestions[0]?.serviceDomain || 'General',
        keywords: [searchQuery]
      },
      suggestions: suggestions.slice(0, limit)
    };
  }

  /**
   * Generate contextual hints for better AI understanding
   */
  generateContextualHints(searchQuery, serviceDomain, complexity, language) {
    const query = searchQuery.toLowerCase();
    const hints = [];

    // Domain-specific hints
    if (query.includes('customer') || query.includes('cliente')) {
      hints.push('🎯 Focus: Customer data management, profiles, demographics, interactions, preferences');
    }
    if (query.includes('payment') || query.includes('pago')) {
      hints.push('🎯 Focus: Payment processing, orders, transfers, settlements, clearing');
    }
    if (query.includes('account') || query.includes('cuenta')) {
      hints.push('🎯 Focus: Account management, balances, transactions, statements, products');
    }
    if (query.includes('risk') || query.includes('riesgo')) {
      hints.push('🎯 Focus: Risk assessment, scoring, monitoring, compliance, analysis');
    }
    if (query.includes('loan') || query.includes('prestamo') || query.includes('credit')) {
      hints.push('🎯 Focus: Credit management, loan origination, underwriting, collections');
    }

    // Operation type hints
    if (query.includes('retrieve') || query.includes('get') || query.includes('consultar')) {
      hints.push('📊 Operations: Focus on GET operations for data retrieval');
    }
    if (query.includes('create') || query.includes('new') || query.includes('crear')) {
      hints.push('📊 Operations: Focus on POST operations for creation');
    }
    if (query.includes('update') || query.includes('modify') || query.includes('actualizar')) {
      hints.push('📊 Operations: Focus on PUT/PATCH operations for updates');
    }

    return hints.join('\n');
  }

  /**
   * Get popular example APIs for empty searches
   */
  getPopularExampleAPIs(language = 'en') {
    const isSpanish = language === 'es';
    
    return [
      {
        _id: 'popular-example-1',
        name: isSpanish ? 'Gestión de Perfiles de Cliente' : 'Customer Profile Management',
        serviceDomain: 'Customer Management',
        description: isSpanish 
          ? 'API integral para gestionar perfiles completos de clientes, incluyendo datos demográficos, preferencias, comportamientos e historial de interacciones'
          : 'Comprehensive API for managing complete customer profiles, including demographics, preferences, behaviors, and interaction history',
        complexity: 'medium',
        serviceOperations: [
          {
            name: isSpanish ? 'Obtener Perfil Cliente' : 'Retrieve Customer Profile',
            method: 'GET',
            description: isSpanish ? 'Obtener el perfil completo del cliente' : 'Get complete customer profile',
            path: '/customer-profile/{customerId}'
          },
          {
            name: isSpanish ? 'Actualizar Perfil' : 'Update Profile',
            method: 'PUT',
            description: isSpanish ? 'Actualizar información del perfil' : 'Update profile information',
            path: '/customer-profile/{customerId}'
          },
          {
            name: isSpanish ? 'Registrar Interacción' : 'Register Interaction',
            method: 'POST',
            description: isSpanish ? 'Registrar nueva interacción del cliente' : 'Register new customer interaction',
            path: '/customer-profile/{customerId}/interactions'
          }
        ],
        tags: ['customer', 'profile', 'management', 'demographics'],
        searchKeywords: ['customer', 'profile', 'cliente', 'perfil', 'demographics', 'behavior'],
        functionalPattern: 'Service Domain',
        popularity: 95
      },
      {
        _id: 'popular-example-2',
        name: isSpanish ? 'Procesamiento de Órdenes de Pago' : 'Payment Order Processing',
        serviceDomain: 'Payment Order',
        description: isSpanish 
          ? 'API para procesar y gestionar órdenes de pago, transferencias y transacciones financieras'
          : 'API to process and manage payment orders, transfers, and financial transactions',
        complexity: 'high',
        serviceOperations: [
          {
            name: isSpanish ? 'Iniciar Orden de Pago' : 'Initiate Payment Order',
            method: 'POST',
            description: isSpanish ? 'Iniciar nueva orden de pago' : 'Initiate new payment order',
            path: '/payment-order'
          },
          {
            name: isSpanish ? 'Consultar Estado' : 'Check Status',
            method: 'GET',
            description: isSpanish ? 'Verificar estado de la orden' : 'Check order status',
            path: '/payment-order/{orderId}/status'
          },
          {
            name: isSpanish ? 'Ejecutar Pago' : 'Execute Payment',
            method: 'POST',
            description: isSpanish ? 'Ejecutar el procesamiento del pago' : 'Execute payment processing',
            path: '/payment-order/{orderId}/execute'
          }
        ],
        tags: ['payment', 'order', 'transfer', 'processing'],
        searchKeywords: ['payment', 'pago', 'transfer', 'order', 'transaction'],
        functionalPattern: 'Service Domain',
        popularity: 90
      },
      {
        _id: 'popular-example-3',
        name: isSpanish ? 'Gestión de Cuentas Bancarias' : 'Bank Account Management',
        serviceDomain: 'Account Management',
        description: isSpanish 
          ? 'API para gestionar cuentas bancarias, saldos, transacciones y productos asociados'
          : 'API to manage bank accounts, balances, transactions, and associated products',
        complexity: 'medium',
        serviceOperations: [
          {
            name: isSpanish ? 'Consultar Saldo' : 'Check Balance',
            method: 'GET',
            description: isSpanish ? 'Consultar saldo actual de la cuenta' : 'Check current account balance',
            path: '/account/{accountId}/balance'
          },
          {
            name: isSpanish ? 'Obtener Transacciones' : 'Get Transactions',
            method: 'GET',
            description: isSpanish ? 'Obtener historial de transacciones' : 'Get transaction history',
            path: '/account/{accountId}/transactions'
          },
          {
            name: isSpanish ? 'Actualizar Cuenta' : 'Update Account',
            method: 'PUT',
            description: isSpanish ? 'Actualizar información de la cuenta' : 'Update account information',
            path: '/account/{accountId}'
          }
        ],
        tags: ['account', 'balance', 'transactions', 'banking'],
        searchKeywords: ['account', 'cuenta', 'balance', 'saldo', 'transactions'],
        functionalPattern: 'Service Domain',
        popularity: 85
      }
    ];
  }

  /**
   * Generate enhanced fallback suggestions with better contextual understanding
   */
  generateEnhancedFallbackSuggestions(searchQuery, language = 'en') {
    const isSpanish = language === 'es';
    const suggestions = [];
    const query = searchQuery.toLowerCase();
    
    // Enhanced customer-related suggestions
    if (query.includes('customer') || query.includes('cliente') || query.includes('profile') || query.includes('perfil')) {
      suggestions.push(
        {
          _id: 'enhanced-customer-1',
          name: isSpanish ? 'Gestión de Perfiles de Cliente' : 'Customer Profile Management',
          serviceDomain: 'Customer Management',
          description: isSpanish 
            ? 'API completa para gestionar perfiles de clientes, incluyendo datos demográficos, preferencias, comportamientos e historial de interacciones bancarias'
            : 'Complete API for managing customer profiles, including demographics, preferences, behaviors, and banking interaction history',
          complexity: 'medium',
          serviceOperations: [
            {
              name: isSpanish ? 'Obtener Perfil Cliente' : 'Retrieve Customer Profile',
              method: 'GET',
              description: isSpanish ? 'Obtener perfil completo del cliente con todos sus datos' : 'Get complete customer profile with all data',
              path: '/customer-profile/{customerId}'
            },
            {
              name: isSpanish ? 'Actualizar Perfil' : 'Update Profile',
              method: 'PUT',
              description: isSpanish ? 'Actualizar información demográfica y preferencias' : 'Update demographic information and preferences',
              path: '/customer-profile/{customerId}'
            },
            {
              name: isSpanish ? 'Analizar Comportamiento' : 'Analyze Behavior',
              method: 'POST',
              description: isSpanish ? 'Analizar patrones de comportamiento del cliente' : 'Analyze customer behavior patterns',
              path: '/customer-profile/{customerId}/behavior-analysis'
            }
          ],
          tags: ['customer', 'profile', 'management', 'demographics', 'behavior'],
          searchKeywords: ['customer', 'profile', 'cliente', 'perfil', 'demographics', 'behavior', 'data'],
          functionalPattern: 'Service Domain',
          popularity: 0
        },
        {
          _id: 'enhanced-customer-2',
          name: isSpanish ? 'Onboarding de Clientes' : 'Customer Onboarding',
          serviceDomain: 'Customer Management',
          description: isSpanish 
            ? 'API para gestionar el proceso completo de incorporación de nuevos clientes al banco'
            : 'API to manage the complete process of onboarding new customers to the bank',
          complexity: 'high',
          serviceOperations: [
            {
              name: isSpanish ? 'Iniciar Onboarding' : 'Initiate Onboarding',
              method: 'POST',
              description: isSpanish ? 'Iniciar proceso de incorporación de cliente' : 'Start customer onboarding process',
              path: '/customer-onboarding'
            },
            {
              name: isSpanish ? 'Verificar Identidad' : 'Verify Identity',
              method: 'POST',
              description: isSpanish ? 'Verificar identidad del cliente' : 'Verify customer identity',
              path: '/customer-onboarding/{processId}/verify-identity'
            }
          ],
          tags: ['customer', 'onboarding', 'verification', 'kyc'],
          searchKeywords: ['customer', 'onboarding', 'cliente', 'incorporacion', 'verification'],
          functionalPattern: 'Service Domain',
          popularity: 0
        }
      );
    }

    // Enhanced payment-related suggestions
    if (query.includes('payment') || query.includes('pago') || query.includes('transfer') || query.includes('transaction')) {
      suggestions.push(
        {
          _id: 'enhanced-payment-1',
          name: isSpanish ? 'Procesamiento de Pagos Digitales' : 'Digital Payment Processing',
          serviceDomain: 'Payment Order',
          description: isSpanish 
            ? 'API avanzada para procesar pagos digitales, transferencias instantáneas y gestión de órdenes de pago'
            : 'Advanced API for processing digital payments, instant transfers, and payment order management',
          complexity: 'high',
          serviceOperations: [
            {
              name: isSpanish ? 'Procesar Pago Instantáneo' : 'Process Instant Payment',
              method: 'POST',
              description: isSpanish ? 'Procesar pago en tiempo real' : 'Process real-time payment',
              path: '/digital-payment/instant'
            },
            {
              name: isSpanish ? 'Validar Fondos' : 'Validate Funds',
              method: 'POST',
              description: isSpanish ? 'Validar disponibilidad de fondos' : 'Validate fund availability',
              path: '/digital-payment/validate-funds'
            }
          ],
          tags: ['payment', 'digital', 'instant', 'transfer'],
          searchKeywords: ['payment', 'pago', 'digital', 'instant', 'transfer', 'real-time'],
          functionalPattern: 'Service Domain',
          popularity: 0
        }
      );
    }

    // Enhanced account-related suggestions
    if (query.includes('account') || query.includes('cuenta') || query.includes('balance') || query.includes('saldo')) {
      suggestions.push(
        {
          _id: 'enhanced-account-1',
          name: isSpanish ? 'Gestión Integral de Cuentas' : 'Comprehensive Account Management',
          serviceDomain: 'Account Management',
          description: isSpanish 
            ? 'API completa para gestionar cuentas bancarias, productos asociados, saldos y operaciones'
            : 'Complete API for managing bank accounts, associated products, balances, and operations',
          complexity: 'medium',
          serviceOperations: [
            {
              name: isSpanish ? 'Consultar Saldo en Tiempo Real' : 'Real-time Balance Inquiry',
              method: 'GET',
              description: isSpanish ? 'Obtener saldo actualizado en tiempo real' : 'Get real-time updated balance',
              path: '/account/{accountId}/real-time-balance'
            },
            {
              name: isSpanish ? 'Gestionar Productos' : 'Manage Products',
              method: 'GET',
              description: isSpanish ? 'Gestionar productos asociados a la cuenta' : 'Manage products associated with account',
              path: '/account/{accountId}/products'
            }
          ],
          tags: ['account', 'balance', 'products', 'management'],
          searchKeywords: ['account', 'cuenta', 'balance', 'saldo', 'products', 'management'],
          functionalPattern: 'Service Domain',
          popularity: 0
        }
      );
    }

    // If no specific matches or need more suggestions, add generic but relevant ones
    if (suggestions.length < 2) {
      suggestions.push(
        {
          _id: 'enhanced-generic-1',
          name: isSpanish ? 'Análisis de Riesgo Crediticio' : 'Credit Risk Analysis',
          serviceDomain: 'Risk Assessment',
          description: isSpanish 
            ? 'API para evaluar y analizar riesgos crediticios de clientes y operaciones'
            : 'API to evaluate and analyze credit risks for customers and operations',
          complexity: 'high',
          serviceOperations: [
            {
              name: isSpanish ? 'Evaluar Riesgo' : 'Assess Risk',
              method: 'POST',
              description: isSpanish ? 'Evaluar nivel de riesgo crediticio' : 'Assess credit risk level',
              path: '/risk-assessment/credit'
            }
          ],
          tags: ['risk', 'credit', 'analysis', 'assessment'],
          searchKeywords: ['risk', 'riesgo', 'credit', 'credito', 'analysis', 'assessment'],
          functionalPattern: 'Service Domain',
          popularity: 0
        }
      );
    }
    
    return suggestions.slice(0, 4);
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
      if (apiId.startsWith('ai-generated-') || apiId.startsWith('ai-intelligent-') || apiId.startsWith('fallback-') || apiId.startsWith('example-') || apiId.startsWith('popular-example-') || apiId.startsWith('enhanced-')) {
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

      const response = await Promise.race([
        openaiService.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI analysis timeout')), 10000) // 10 second timeout
        )
      ]);

      const responseText = response.choices[0].message.content;
      
      if (isDebug) {
        console.log('🤖 [API DETAILS] AI Response received');
      }

      return {
        success: true,
        explanation: responseText,
        usage: response.usage
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
      // Always log this to see what's happening
      console.log('🔧 [CREATE API] Starting creation (ALWAYS LOG):', {
        referenceId,
        referenceIdType: typeof referenceId,
        isDebugValue: isDebug,
        debugEnv: process.env.DEBUG,
        customizations,
        userId,
        companyId
      });

      if (isDebug) {
        console.log('🔧 [CREATE API] Starting creation:', {
          referenceId,
          referenceIdType: typeof referenceId,
          customizations,
          userId,
          companyId
        });
        console.log('🔍 [CREATE API] Checking if AI-generated:', {
          startsWithAI: referenceId.startsWith('ai-generated-'),
          startsWithFallback: referenceId.startsWith('fallback-'),
          startsWithExample: referenceId.startsWith('example-'),
          referenceIdString: String(referenceId)
        });
      }

      // Check if this is an AI-generated API (not in database)
      if (referenceId.startsWith('ai-generated-') || referenceId.startsWith('ai-intelligent-') || referenceId.startsWith('fallback-') || referenceId.startsWith('example-') || referenceId.startsWith('popular-example-') || referenceId.startsWith('enhanced-')) {
        console.log('🤖 [CREATE API] This is an AI-generated API (ALWAYS LOG)');
        
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
        
        // Generate name and slug
        const apiName = customizations.name || apiData.name;
        const apiSlug = apiName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Create the API using existing API service
        const API = require('../models/API');
        
        const newAPI = new API({
          name: apiName,
          slug: apiSlug,
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
            // Don't set referenceId for AI-generated APIs to avoid ObjectId casting errors
            referenceName: apiData.name,
            source: 'ai-generated'
          }
        });

        if (isDebug) {
          console.log('🔧 [CREATE API] AI-generated API object created:', {
            name: newAPI.name,
            slug: newAPI.slug,
            baseReference: newAPI.baseReference
          });
        }

        // Save first to trigger pre-save middleware that creates initial version
        await newAPI.save();

        // Now update the OpenAPI spec of the first version
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
      console.log('🗄️ [CREATE API] Not AI-generated, proceeding with database lookup (ALWAYS LOG):', referenceId);
      
      if (isDebug) {
        console.log('🗄️ [CREATE API] Not AI-generated, proceeding with database lookup for:', referenceId);
      }
      
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

      // Save first to trigger pre-save middleware that creates initial version
      await newAPI.save();

      // Now update the OpenAPI spec of the first version
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

  /**
   * Intelligent analysis for API customization
   * Used by the wizard to understand user requirements and provide recommendations
   */
  async intelligentAnalysis(query, options = {}) {
    const {
      language = 'es',
      context = {},
      includeInterpretation = true,
      includeRecommendations = true
    } = options;

    const isDebug = process.env.NODE_ENV === 'development';

    if (isDebug) {
      console.log('🧠 [INTELLIGENT ANALYSIS] Starting analysis:', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        language,
        contextKeys: Object.keys(context)
      });
    }

    try {
      // Prepare the analysis prompt
      const systemPrompt = language === 'es' ? `
        Eres un experto en APIs BIAN y análisis de requerimientos de negocio.
        Tu tarea es analizar las necesidades del usuario y proporcionar recomendaciones técnicas.
        
        Debes responder en formato JSON con esta estructura:
        {
          "interpretation": "Análisis detallado de lo que el usuario necesita",
          "businessDomain": "Dominio de negocio identificado",
          "dataType": "Tipo de datos sugerido (simple_field | schema_array)",
          "technicalRecommendation": "Recomendación técnica específica",
          "suggestedFields": [
            {
              "name": "nombreCampo",
              "type": "string|number|boolean|array|object",
              "description": "Descripción del campo",
              "required": true|false,
              "example": "Ejemplo de valor"
            }
          ],
          "implementationNotes": "Notas sobre la implementación"
        }
      ` : `
        You are an expert in BIAN APIs and business requirements analysis.
        Your task is to analyze user needs and provide technical recommendations.
        
        You must respond in JSON format with this structure:
        {
          "interpretation": "Detailed analysis of what the user needs",
          "businessDomain": "Identified business domain",
          "dataType": "Suggested data type (simple_field | schema_array)",
          "technicalRecommendation": "Specific technical recommendation",
          "suggestedFields": [
            {
              "name": "fieldName",
              "type": "string|number|boolean|array|object",
              "description": "Field description",
              "required": true|false,
              "example": "Example value"
            }
          ],
          "implementationNotes": "Implementation notes"
        }
      `;

      const userPrompt = language === 'es' ? `
        Analiza esta solicitud de personalización de API:
        
        Solicitud del usuario: "${query}"
        
        ${context.apiName ? `API base: ${context.apiName}` : ''}
        ${context.serviceDomain ? `Dominio de servicio: ${context.serviceDomain}` : ''}
        ${context.originalOperations ? `Operaciones existentes: ${context.originalOperations.join(', ')}` : ''}
        ${context.businessRequirements ? `Requerimientos adicionales: ${context.businessRequirements.join(', ')}` : ''}
        
        Proporciona un análisis detallado y sugerencias de campos específicos.
      ` : `
        Analyze this API customization request:
        
        User request: "${query}"
        
        ${context.apiName ? `Base API: ${context.apiName}` : ''}
        ${context.serviceDomain ? `Service domain: ${context.serviceDomain}` : ''}
        ${context.originalOperations ? `Existing operations: ${context.originalOperations.join(', ')}` : ''}
        ${context.businessRequirements ? `Additional requirements: ${context.businessRequirements.join(', ')}` : ''}
        
        Provide detailed analysis and specific field suggestions.
      `;

      // Call OpenAI
      const response = await Promise.race([
        openaiService.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI analysis timeout')), 10000) // 10 second timeout
        )
      ]);

      const responseText = response.choices[0].message.content;
      
      if (isDebug) {
        console.log('🤖 [INTELLIGENT ANALYSIS] AI Response received');
      }

      // Parse the JSON response
      let analysisResult;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        if (isDebug) {
          console.log('⚠️ [INTELLIGENT ANALYSIS] JSON parse failed, creating fallback response');
        }
        
        // Fallback response
        analysisResult = {
          interpretation: language === 'es' ? 
            `Análisis de la solicitud: ${query}. Se recomienda agregar campos personalizados según los requerimientos específicos.` :
            `Analysis of request: ${query}. It's recommended to add custom fields according to specific requirements.`,
          businessDomain: context.serviceDomain || 'General',
          dataType: query.toLowerCase().includes('array') || query.toLowerCase().includes('list') || query.toLowerCase().includes('multiple') ? 'schema_array' : 'simple_field',
          technicalRecommendation: language === 'es' ? 
            'Se sugiere implementar como campos adicionales en el payload existente.' :
            'It\'s suggested to implement as additional fields in the existing payload.',
          suggestedFields: [
            {
              name: 'customField',
              type: 'string',
              description: language === 'es' ? 'Campo personalizado basado en la solicitud' : 'Custom field based on the request',
              required: false,
              example: 'example value'
            }
          ],
          implementationNotes: language === 'es' ? 
            'Considerar la integración con sistemas existentes y validaciones necesarias.' :
            'Consider integration with existing systems and necessary validations.'
        };
      }

      if (isDebug) {
        console.log('✅ [INTELLIGENT ANALYSIS] Analysis completed successfully');
      }

      return {
        interpretation: analysisResult.interpretation,
        analysis: analysisResult,
        recommendations: [
          {
            type: 'simple_field',
            title: language === 'es' ? 'Campo Simple' : 'Simple Field',
            description: analysisResult.technicalRecommendation,
            complexity: language === 'es' ? 'Baja' : 'Low',
            impact: language === 'es' ? 'Mínimo - Se integra fácilmente con la estructura actual' : 'Minimal - Integrates easily with current structure',
            suggestedFields: analysisResult.suggestedFields.filter(f => ['string', 'number', 'boolean'].includes(f.type))
          },
          {
            type: 'schema_array',
            title: language === 'es' ? 'Esquema Complejo' : 'Complex Schema',
            description: language === 'es' ? 
              `Crear un nuevo esquema para "${query}" con múltiples propiedades relacionadas` :
              `Create a new schema for "${query}" with multiple related properties`,
            complexity: language === 'es' ? 'Media' : 'Medium',
            impact: language === 'es' ? 'Moderado - Requiere un nuevo componente en el OpenAPI' : 'Moderate - Requires a new component in OpenAPI',
            suggestedFields: analysisResult.suggestedFields
          }
        ],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [INTELLIGENT ANALYSIS] Error:', error);
      
      // Return fallback response
      return {
        interpretation: language === 'es' ? 
          `Análisis básico de la solicitud: "${query}". Se recomienda revisar manualmente los requerimientos.` :
          `Basic analysis of request: "${query}". Manual review of requirements is recommended.`,
        analysis: {
          interpretation: language === 'es' ? 'Error en el análisis automatizado, se requiere revisión manual.' : 'Error in automated analysis, manual review required.',
          businessDomain: context.serviceDomain || 'General',
          dataType: 'simple_field',
          technicalRecommendation: language === 'es' ? 'Definir campos manualmente según requerimientos.' : 'Define fields manually according to requirements.',
          suggestedFields: [],
          implementationNotes: language === 'es' ? 'Contactar al equipo técnico para asistencia.' : 'Contact technical team for assistance.'
        },
        recommendations: [
          {
            type: 'simple_field',
            title: language === 'es' ? 'Campo Simple' : 'Simple Field',
            description: language === 'es' ? 'Agregar campos simples según requerimientos' : 'Add simple fields according to requirements',
            complexity: language === 'es' ? 'Baja' : 'Low',
            impact: language === 'es' ? 'Mínimo' : 'Minimal',
            suggestedFields: []
          },
          {
            type: 'schema_array',
            title: language === 'es' ? 'Esquema Complejo' : 'Complex Schema',
            description: language === 'es' ? 'Crear esquema personalizado' : 'Create custom schema',
            complexity: language === 'es' ? 'Media' : 'Medium',
            impact: language === 'es' ? 'Moderado' : 'Moderate',
            suggestedFields: []
          }
        ],
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }
}

module.exports = new BIANReferenceService(); 