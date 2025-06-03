const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async enrichAPIDefinition(prompt, existingSpec = null) {
    try {
      const systemPrompt = `You are an expert in BIAN (Banking Industry Architecture Network) standards and OpenAPI 3.0 specification generation. 

Your task is to create comprehensive, BIAN-compliant OpenAPI specifications for banking APIs based on user requirements.

Key requirements:
1. Follow OpenAPI 3.0.3 specification format
2. Align with BIAN v12 service domains and operations
3. Include realistic banking data models
4. Add proper HTTP status codes and error responses
5. Include security schemes (OAuth2, API Keys)
6. Use banking-appropriate examples and descriptions
7. Follow RESTful API design principles

BIAN Service Domains to consider:
- Customer Management, Account Management, Payment Order
- Credit Management, Risk Assessment, Compliance
- Product Management, Service Configuration
- Transaction Processing, Settlement

Output ONLY valid JSON that represents the OpenAPI specification.`;

      const userPrompt = existingSpec 
        ? `Enhance this existing OpenAPI specification based on the following requirements:\n\nRequirements: ${prompt}\n\nExisting Spec:\n${JSON.stringify(existingSpec, null, 2)}\n\nProvide an enhanced version that maintains compatibility while adding the requested features.`
        : `Create a complete OpenAPI 3.0.3 specification for: ${prompt}\n\nEnsure the API follows BIAN standards and includes comprehensive banking functionality.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      const parsedSpec = JSON.parse(response);

      // Validate basic OpenAPI structure
      this.validateOpenAPIStructure(parsedSpec);

      return {
        success: true,
        spec: parsedSpec,
        usage: completion.usage
      };

    } catch (error) {
      console.error('OpenAI API enrichment error:', error);
      
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: 'Invalid JSON response from AI',
          details: error.message
        };
      }

      return {
        success: false,
        error: 'AI enrichment failed',
        details: error.message
      };
    }
  }

  async generateBIANMapping(apiDescription) {
    try {
      const systemPrompt = `You are a BIAN (Banking Industry Architecture Network) expert. Analyze the given API description and provide a mapping to relevant BIAN v12 service domains.

Provide your response as JSON with this structure:
{
  "primaryDomain": "Most relevant BIAN service domain",
  "secondaryDomains": ["Other relevant domains"],
  "serviceOperations": ["Specific BIAN operations that apply"],
  "dataEntities": ["Key banking data entities involved"],
  "businessCapabilities": ["Business capabilities supported"],
  "recommendations": ["Specific recommendations for BIAN compliance"]
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this API description for BIAN mapping: ${apiDescription}` }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      return {
        success: true,
        mapping: JSON.parse(response),
        usage: completion.usage
      };

    } catch (error) {
      console.error('BIAN mapping error:', error);
      return {
        success: false,
        error: 'BIAN mapping failed',
        details: error.message
      };
    }
  }

  async suggestAPIImprovements(openApiSpec) {
    try {
      const systemPrompt = `You are an API design expert specializing in banking and financial services APIs. Analyze the provided OpenAPI specification and suggest improvements.

Focus on:
1. BIAN compliance and banking best practices
2. Security enhancements
3. Data model improvements
4. API design patterns
5. Error handling
6. Documentation quality
7. Performance considerations

Provide suggestions as JSON:
{
  "security": ["Security improvement suggestions"],
  "design": ["API design improvements"],
  "bian": ["BIAN compliance suggestions"],
  "documentation": ["Documentation improvements"],
  "performance": ["Performance optimization suggestions"],
  "dataModels": ["Data model enhancements"]
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this OpenAPI spec and suggest improvements:\n\n${JSON.stringify(openApiSpec, null, 2)}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      return {
        success: true,
        suggestions: JSON.parse(response),
        usage: completion.usage
      };

    } catch (error) {
      console.error('API improvement suggestions error:', error);
      return {
        success: false,
        error: 'Suggestion generation failed',
        details: error.message
      };
    }
  }

  async generateAPIDocumentation(openApiSpec) {
    try {
      const systemPrompt = `You are a technical writer specializing in API documentation for banking systems. Generate comprehensive documentation for the provided OpenAPI specification.

Create documentation that includes:
1. Overview and business purpose
2. Getting started guide
3. Authentication details
4. Endpoint descriptions with examples
5. Error handling guide
6. Business use cases
7. BIAN alignment notes

Format as structured text suitable for README or documentation site.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate documentation for this API:\n\n${JSON.stringify(openApiSpec, null, 2)}` }
        ],
        temperature: 0.4,
        max_tokens: 3000
      });

      return {
        success: true,
        documentation: completion.choices[0].message.content,
        usage: completion.usage
      };

    } catch (error) {
      console.error('Documentation generation error:', error);
      return {
        success: false,
        error: 'Documentation generation failed',
        details: error.message
      };
    }
  }

  validateOpenAPIStructure(spec) {
    const requiredFields = ['openapi', 'info', 'paths'];
    
    for (const field of requiredFields) {
      if (!spec[field]) {
        throw new Error(`Missing required OpenAPI field: ${field}`);
      }
    }

    if (!spec.info.title || !spec.info.version) {
      throw new Error('OpenAPI info section must include title and version');
    }

    if (typeof spec.paths !== 'object') {
      throw new Error('OpenAPI paths must be an object');
    }

    return true;
  }

  async checkUsageQuota(userId) {
    // This would typically check against a database of user usage
    // For now, return a simple quota check
    return {
      used: 0,
      limit: 100,
      remaining: 100,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }
}

module.exports = new OpenAIService(); 