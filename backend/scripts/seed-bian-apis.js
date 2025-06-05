const mongoose = require('mongoose');
require('dotenv').config();

const BIANReferenceAPI = require('../src/models/BIANReferenceAPI');

const realBIANAPIs = [
  {
    name: 'Customer Profile Management',
    description: 'Manage comprehensive customer profiles including personal details, preferences, and relationship information according to BIAN standards.',
    descriptionES: 'Gestiona perfiles integrales de clientes incluyendo detalles personales, preferencias e información de relaciones según estándares BIAN.',
    serviceDomain: 'Customer Management',
    serviceOperations: [
      {
        name: 'Retrieve Customer Profile',
        description: 'Retrieve comprehensive customer profile information',
        descriptionES: 'Recuperar información integral del perfil del cliente',
        method: 'GET',
        path: '/customer-profile/{customer-id}'
      },
      {
        name: 'Update Customer Profile',
        description: 'Update customer profile information',
        descriptionES: 'Actualizar información del perfil del cliente',
        method: 'PUT',
        path: '/customer-profile/{customer-id}'
      },
      {
        name: 'Create Customer Profile',
        description: 'Create a new customer profile',
        descriptionES: 'Crear un nuevo perfil de cliente',
        method: 'POST',
        path: '/customer-profile'
      }
    ],
    functionalPattern: 'Service Domain',
    bianVersion: 'v12.0',
    openApiSpec: {
      openapi: '3.0.0',
      info: {
        title: 'Customer Profile Management',
        description: 'BIAN Customer Profile Management API',
        version: '1.0.0'
      },
      paths: {
        '/customer-profile/{customer-id}': {
          get: {
            summary: 'Retrieve Customer Profile',
            parameters: [
              {
                name: 'customer-id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Customer profile retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        customerId: { type: 'string' },
                        profile: {
                          type: 'object',
                          properties: {
                            personalDetails: { type: 'object' },
                            contactInformation: { type: 'object' },
                            preferences: { type: 'object' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: ['customer', 'profile', 'management', 'bian'],
    businessCapabilities: ['Customer Onboarding', 'Customer Data Management', 'Relationship Management'],
    dataEntities: ['Customer', 'Profile', 'Contact Information'],
    complexity: 'medium',
    searchKeywords: ['customer', 'profile', 'management', 'personal', 'details'],
    metadata: {
      category: 'Customer Management',
      industry: ['Banking', 'Financial Services'],
      compliance: ['GDPR', 'PCI DSS']
    }
  },
  {
    name: 'Payment Order Processing',
    description: 'Process payment orders and handle payment transactions according to BIAN Payment Processing standards.',
    descriptionES: 'Procesa órdenes de pago y maneja transacciones de pago según los estándares BIAN de Procesamiento de Pagos.',
    serviceDomain: 'Payment Processing',
    serviceOperations: [
      {
        name: 'Initiate Payment Order',
        description: 'Initiate a new payment order',
        descriptionES: 'Iniciar una nueva orden de pago',
        method: 'POST',
        path: '/payment-order'
      },
      {
        name: 'Retrieve Payment Status',
        description: 'Get the status of a payment order',
        descriptionES: 'Obtener el estado de una orden de pago',
        method: 'GET',
        path: '/payment-order/{order-id}/status'
      },
      {
        name: 'Update Payment Order',
        description: 'Update payment order details',
        descriptionES: 'Actualizar detalles de la orden de pago',
        method: 'PUT',
        path: '/payment-order/{order-id}'
      }
    ],
    functionalPattern: 'Service Domain',
    bianVersion: 'v12.0',
    openApiSpec: {
      openapi: '3.0.0',
      info: {
        title: 'Payment Order Processing',
        description: 'BIAN Payment Order Processing API',
        version: '1.0.0'
      },
      paths: {
        '/payment-order': {
          post: {
            summary: 'Initiate Payment Order',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      amount: { type: 'number' },
                      currency: { type: 'string' },
                      debitAccount: { type: 'string' },
                      creditAccount: { type: 'string' },
                      reference: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Payment order created successfully'
              }
            }
          }
        }
      }
    },
    tags: ['payment', 'order', 'processing', 'transaction', 'bian'],
    businessCapabilities: ['Payment Processing', 'Transaction Management', 'Settlement'],
    dataEntities: ['Payment Order', 'Transaction', 'Account'],
    complexity: 'high',
    searchKeywords: ['payment', 'order', 'processing', 'transaction', 'transfer'],
    metadata: {
      category: 'Payment Processing',
      industry: ['Banking', 'Financial Services', 'Fintech'],
      compliance: ['PCI DSS', 'SWIFT']
    }
  },
  {
    name: 'Account Management',
    description: 'Manage customer accounts including account creation, maintenance, and lifecycle management per BIAN standards.',
    descriptionES: 'Gestiona cuentas de clientes incluyendo creación, mantenimiento y gestión del ciclo de vida según estándares BIAN.',
    serviceDomain: 'Account Management',
    serviceOperations: [
      {
        name: 'Create Account',
        description: 'Create a new customer account',
        descriptionES: 'Crear una nueva cuenta de cliente',
        method: 'POST',
        path: '/account'
      },
      {
        name: 'Retrieve Account Details',
        description: 'Get account information and details',
        descriptionES: 'Obtener información y detalles de la cuenta',
        method: 'GET',
        path: '/account/{account-id}'
      },
      {
        name: 'Update Account',
        description: 'Update account information',
        descriptionES: 'Actualizar información de la cuenta',
        method: 'PUT',
        path: '/account/{account-id}'
      },
      {
        name: 'Close Account',
        description: 'Close an existing account',
        descriptionES: 'Cerrar una cuenta existente',
        method: 'DELETE',
        path: '/account/{account-id}'
      }
    ],
    functionalPattern: 'Service Domain',
    bianVersion: 'v12.0',
    openApiSpec: {
      openapi: '3.0.0',
      info: {
        title: 'Account Management',
        description: 'BIAN Account Management API',
        version: '1.0.0'
      },
      paths: {
        '/account': {
          post: {
            summary: 'Create Account',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      customerId: { type: 'string' },
                      accountType: { type: 'string' },
                      currency: { type: 'string' },
                      initialDeposit: { type: 'number' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Account created successfully'
              }
            }
          }
        }
      }
    },
    tags: ['account', 'management', 'banking', 'customer', 'bian'],
    businessCapabilities: ['Account Opening', 'Account Maintenance', 'Account Closure'],
    dataEntities: ['Account', 'Customer', 'Transaction History'],
    complexity: 'medium',
    searchKeywords: ['account', 'management', 'banking', 'customer', 'savings', 'checking'],
    metadata: {
      category: 'Account Management',
      industry: ['Banking', 'Credit Union'],
      compliance: ['KYC', 'AML']
    }
  },
  {
    name: 'Credit Assessment',
    description: 'Assess credit risk and creditworthiness of customers for lending decisions according to BIAN Credit Management standards.',
    descriptionES: 'Evalúa el riesgo crediticio y la solvencia de los clientes para decisiones de préstamo según estándares BIAN de Gestión de Crédito.',
    serviceDomain: 'Credit Management',
    serviceOperations: [
      {
        name: 'Perform Credit Assessment',
        description: 'Evaluate customer creditworthiness',
        descriptionES: 'Evaluar la solvencia del cliente',
        method: 'POST',
        path: '/credit-assessment'
      },
      {
        name: 'Retrieve Credit Score',
        description: 'Get customer credit score and rating',
        descriptionES: 'Obtener puntuación y calificación crediticia del cliente',
        method: 'GET',
        path: '/credit-assessment/{customer-id}/score'
      },
      {
        name: 'Update Credit Information',
        description: 'Update credit assessment information',
        descriptionES: 'Actualizar información de evaluación crediticia',
        method: 'PUT',
        path: '/credit-assessment/{assessment-id}'
      }
    ],
    functionalPattern: 'Service Domain',
    bianVersion: 'v12.0',
    openApiSpec: {
      openapi: '3.0.0',
      info: {
        title: 'Credit Assessment',
        description: 'BIAN Credit Assessment API',
        version: '1.0.0'
      },
      paths: {
        '/credit-assessment': {
          post: {
            summary: 'Perform Credit Assessment',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      customerId: { type: 'string' },
                      assessmentType: { type: 'string' },
                      requestedAmount: { type: 'number' },
                      purpose: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Credit assessment completed'
              }
            }
          }
        }
      }
    },
    tags: ['credit', 'assessment', 'risk', 'lending', 'bian'],
    businessCapabilities: ['Credit Risk Assessment', 'Credit Scoring', 'Loan Underwriting'],
    dataEntities: ['Credit Report', 'Credit Score', 'Risk Profile'],
    complexity: 'high',
    searchKeywords: ['credit', 'assessment', 'risk', 'score', 'lending', 'loan'],
    metadata: {
      category: 'Risk Management',
      industry: ['Banking', 'Lending', 'Financial Services'],
      compliance: ['Basel III', 'Fair Credit Reporting Act']
    }
  }
];

async function seedBIANAPIs() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🗑️ Limpiando APIs BIAN existentes...');
    await BIANReferenceAPI.deleteMany({});
    
    console.log('🌱 Insertando APIs BIAN reales...');
    const insertedAPIs = await BIANReferenceAPI.insertMany(realBIANAPIs);
    
    console.log(`✅ ${insertedAPIs.length} APIs BIAN insertadas exitosamente:`);
    insertedAPIs.forEach(api => {
      console.log(`   📋 ${api.name} (ID: ${api._id})`);
    });
    
    console.log('\n🎉 Base de datos poblada con APIs BIAN reales!');
    console.log('💡 Ahora puedes buscar y usar estas APIs para crear implementaciones.');
    
  } catch (error) {
    console.error('❌ Error poblando base de datos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
if (require.main === module) {
  seedBIANAPIs();
}

module.exports = { seedBIANAPIs, realBIANAPIs }; 