import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Psychology as PsychologyIcon,
  Build as BuildIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  Lightbulb as LightbulbIcon,
  AutoAwesome as AutoAwesomeIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { bianService, companyService, apiService } from '../services/api';
import toast from 'react-hot-toast';

const BIANDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  
  // Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    // Step 1: Basic Info
    companyId: '',
    name: '',
    description: '',
    
    // Step 2: API Analysis
    originalPayloads: {},
    
    // Step 3: Customization Request
    customizationRequest: '',
    
    // Step 4: AI Suggestions
    aiSuggestions: null,
    loadingAISuggestions: false,
    selectedSuggestionType: '', // 'simple_field' or 'schema_array'
    
    // Step 5: Field Definition
    customFields: [],
    
    // Step 6: OpenAPI Generation
    generatedOpenAPI: null,
    loadingOpenAPI: false,
    
    // Final: API Creation
    createdAPI: null,
    saving: false
  });

  // Get user's companies
  const { data: companiesData } = useQuery(
    'my-companies',
    companyService.getMyCompanies
  );

  const companies = companiesData?.data?.companies || [];

  // Get API details from location state or fetch from server
  const apiFromState = location.state?.api;
  
  const { data: apiDetails, isLoading, error } = useQuery({
    queryKey: ['bian-api-detail', id],
    queryFn: () => bianService.getAPIDetails(id, { includeAI: false }),
    enabled: !apiFromState,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const api = apiFromState || apiDetails?.data?.api;

  const generateExplanationMutation = useMutation({
    mutationFn: ({ apiId, language }) => bianService.generateExplanation(apiId, { language }),
    onSuccess: (data) => {
      setAiExplanation(data.data.explanation);
      setLoadingExplanation(false);
    },
    onError: (error) => {
      console.error('Explanation error:', error);
      setLoadingExplanation(false);
      
      // Handle AI-generated APIs specifically
      if (error.response?.data?.isAIGenerated) {
        toast.error(error.response.data.message || 'Las APIs generadas por IA ya incluyen explicaciones contextuales');
      } else {
        toast.error('Error generando explicación');
      }
    }
  });

  const createAPIMutation = useMutation({
    mutationFn: (data) => bianService.createAPIFromReference(id, data),
    onSuccess: (data) => {
      toast.success('API creada exitosamente');
      setWizardOpen(false);
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error('Error creando API');
    }
  });

  const handleGenerateExplanation = () => {
    // Check if this is an AI-generated API
    if (id.startsWith('ai-generated-') || id.startsWith('ai-intelligent-') || id.startsWith('fallback-') || id.startsWith('example-') || id.startsWith('popular-example-') || id.startsWith('enhanced-')) {
      toast.info('Las APIs generadas por IA ya incluyen explicaciones contextuales en su descripción');
      return;
    }

    setLoadingExplanation(true);
    generateExplanationMutation.mutate({ 
      apiId: id, 
      language: 'es' 
    });
  };

  const handleCreateAPI = () => {
    if (!wizardData.companyId || !wizardData.name) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    // For AI-generated APIs, we need to pass the complete API data
    const requestData = {
      companyId: wizardData.companyId,
      name: wizardData.name,
      description: wizardData.description
    };

    // If this is an AI-generated API, include the complete API data
    if (wizardData.createdAPI && wizardData.createdAPI.isAIGenerated) {
      requestData.customizations = {
        apiData: api // Pass the complete API object
      };
    }

    createAPIMutation.mutate(requestData);
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  // Check if this is an AI-generated API
  const isAIGenerated = id.startsWith('ai-generated-') || id.startsWith('ai-intelligent-') || id.startsWith('fallback-') || id.startsWith('example-') || id.startsWith('popular-example-') || id.startsWith('enhanced-');

  // Wizard functions
  const handleWizardNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleWizardBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const resetWizard = () => {
    setActiveStep(0);
    setWizardData({
      companyId: '',
      name: '',
      description: '',
      originalPayloads: {},
      customizationRequest: '',
      aiSuggestions: null,
      loadingAISuggestions: false,
      selectedSuggestionType: '',
      customFields: [],
      generatedOpenAPI: null,
      loadingOpenAPI: false,
      createdAPI: null,
      saving: false
    });
  };

  // Step 2: Analyze API payloads
  const analyzeAPIPayloads = () => {
    if (!api.serviceOperations) return;
    
    const payloads = {};
    api.serviceOperations.forEach(operation => {
      payloads[`${operation.method}_${operation.name}`] = {
        method: operation.method,
        name: operation.name,
        description: operation.description,
        requestPayload: generateSamplePayload(operation, 'request'),
        responsePayload: generateSamplePayload(operation, 'response')
      };
    });
    
    setWizardData(prev => ({ ...prev, originalPayloads: payloads }));
    handleWizardNext();
  };

  const generateSamplePayload = (operation, type) => {
    // Generate basic sample payload based on operation
    if (type === 'request' && ['POST', 'PUT', 'PATCH'].includes(operation.method)) {
      return {
        data: {
          id: "string",
          timestamp: "2024-01-01T00:00:00Z",
          // Add more fields based on operation name
          ...(operation.name.toLowerCase().includes('customer') && {
            customerId: "string",
            customerData: "object"
          }),
          ...(operation.name.toLowerCase().includes('payment') && {
            amount: "number",
            currency: "string",
            reference: "string"
          }),
          ...(operation.name.toLowerCase().includes('account') && {
            accountId: "string",
            accountType: "string"
          })
        }
      };
    } else {
      return {
        success: "boolean",
        data: {
          id: "string",
          status: "string",
          timestamp: "2024-01-01T00:00:00Z",
          ...(operation.name.toLowerCase().includes('customer') && {
            customerInfo: "object",
            profile: "object"
          }),
          ...(operation.name.toLowerCase().includes('payment') && {
            transactionId: "string",
            amount: "number",
            status: "string"
          }),
          ...(operation.name.toLowerCase().includes('account') && {
            balance: "number",
            transactions: "array"
          })
        },
        message: "string"
      };
    }
  };

  // Step 4: Get AI suggestions
  const getAISuggestions = async () => {
    if (!wizardData.customizationRequest.trim()) {
      toast.error('Por favor describe qué datos necesitas agregar');
      return;
    }

    setWizardData(prev => ({ ...prev, loadingAISuggestions: true }));
    
    try {
      const response = await bianService.intelligentSearch({
        query: `Analiza esta API BIAN "${api.name}" del dominio "${api.serviceDomain}" y sugiere cómo agregar estos datos: "${wizardData.customizationRequest}". Necesito saber si debería ser un campo simple o un esquema complejo.`,
        language: 'es',
        context: {
          businessRequirements: [wizardData.customizationRequest],
          apiName: api.name,
          serviceDomain: api.serviceDomain,
          originalOperations: api.serviceOperations?.map(op => op.name) || []
        }
      });

      const suggestions = {
        analysis: response.data.interpretation,
        recommendations: [
          {
            type: 'simple_field',
            title: 'Campo Simple',
            description: `Agregar "${wizardData.customizationRequest}" como campo(s) adicional(es) en el payload existente`,
            complexity: 'Baja',
            impact: 'Mínimo - Se integra fácilmente con la estructura actual'
          },
          {
            type: 'schema_array',
            title: 'Esquema Complejo',
            description: `Crear un nuevo esquema/objeto para "${wizardData.customizationRequest}" con múltiples propiedades`,
            complexity: 'Media',
            impact: 'Moderado - Requiere un nuevo componente en el OpenAPI'
          }
        ]
      };

      setWizardData(prev => ({ 
        ...prev, 
        aiSuggestions: suggestions,
        loadingAISuggestions: false 
      }));
      handleWizardNext();

    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error('Error obteniendo sugerencias de IA');
      setWizardData(prev => ({ ...prev, loadingAISuggestions: false }));
    }
  };

  // Step 5: Add custom field
  const addCustomField = () => {
    const newField = {
      id: Date.now(),
      name: '',
      type: 'string',
      description: '',
      required: false
    };
    
    setWizardData(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));
  };

  const updateCustomField = (fieldId, updates) => {
    setWizardData(prev => ({
      ...prev,
      customFields: prev.customFields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeCustomField = (fieldId) => {
    setWizardData(prev => ({
      ...prev,
      customFields: prev.customFields.filter(field => field.id !== fieldId)
    }));
  };

  // Step 6: Generate OpenAPI
  const generateCustomOpenAPI = async () => {
    setWizardData(prev => ({ ...prev, loadingOpenAPI: true }));
    
    try {
      const prompt = `
        Modifica esta especificación OpenAPI de BIAN para incluir los siguientes campos personalizados:
        
        API Original: ${api.name}
        Dominio: ${api.serviceDomain}
        Tipo de modificación: ${wizardData.selectedSuggestionType}
        Campos a agregar: ${JSON.stringify(wizardData.customFields)}
        Contexto del usuario: ${wizardData.customizationRequest}
        
        Operaciones originales: ${JSON.stringify(api.serviceOperations)}
        
        Instrucciones:
        1. Mantén la estructura BIAN estándar
        2. Agrega los nuevos campos de manera coherente
        3. Actualiza tanto request como response según corresponda
        4. Genera ejemplos realistas
        5. Mantén la documentación clara
        
        Devuelve SOLO la especificación OpenAPI en formato JSON.
      `;

      const response = await bianService.intelligentSearch({
        query: prompt,
        language: 'es'
      });

      // Simulate OpenAPI generation (in real implementation, this would call a specific endpoint)
      const generatedSpec = generateOpenAPIWithCustomFields();
      
      setWizardData(prev => ({ 
        ...prev, 
        generatedOpenAPI: generatedSpec,
        loadingOpenAPI: false 
      }));
      handleWizardNext();

    } catch (error) {
      console.error('Error generating OpenAPI:', error);
      toast.error('Error generando especificación OpenAPI');
      setWizardData(prev => ({ ...prev, loadingOpenAPI: false }));
    }
  };

  const generateOpenAPIWithCustomFields = () => {
    // Basic OpenAPI structure with custom fields
    const spec = {
      openapi: "3.0.0",
      info: {
        title: wizardData.name,
        description: wizardData.description,
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
        schemas: {
          CustomFields: {
            type: "object",
            properties: {}
          }
        }
      }
    };

    // Add custom fields to schema
    wizardData.customFields.forEach(field => {
      spec.components.schemas.CustomFields.properties[field.name] = {
        type: field.type,
        description: field.description,
        example: getExampleValue(field.type)
      };
    });

    // Add paths for each operation
    if (api.serviceOperations) {
      api.serviceOperations.forEach(operation => {
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
                      success: { type: "boolean" },
                      data: { 
                        allOf: [
                          { type: "object" },
                          { $ref: "#/components/schemas/CustomFields" }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        };

        if (['post', 'put', 'patch'].includes(method)) {
          spec.paths[path][method].requestBody = {
            required: true,
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { type: "object" },
                    { $ref: "#/components/schemas/CustomFields" }
                  ]
                }
              }
            }
          };
        }
      });
    }

    return spec;
  };

  const getExampleValue = (type) => {
    switch (type) {
      case 'string': return 'example string';
      case 'number': return 123;
      case 'integer': return 123;
      case 'boolean': return true;
      case 'array': return ['item1', 'item2'];
      case 'object': return { key: 'value' };
      default: return 'example';
    }
  };

  // Final step: Save API
  const saveCustomAPI = async () => {
    setWizardData(prev => ({ ...prev, saving: true }));
    
    try {
      const requestData = {
        companyId: wizardData.companyId,
        name: wizardData.name,
        description: wizardData.description,
        customizations: {
          apiData: api,
          customFields: wizardData.customFields,
          openApiSpec: wizardData.generatedOpenAPI,
          customizationRequest: wizardData.customizationRequest
        }
      };

      const response = await createAPIMutation.mutateAsync(requestData);
      
      setWizardData(prev => ({ 
        ...prev, 
        createdAPI: response.data,
        saving: false 
      }));
      
      toast.success('¡API personalizada creada exitosamente!');
      
    } catch (error) {
      console.error('Error saving API:', error);
      toast.error('Error guardando la API personalizada');
      setWizardData(prev => ({ ...prev, saving: false }));
    }
  };

  const wizardSteps = [
    'Información Básica',
    'Análisis de Payloads',
    'Personalización',
    'Sugerencias IA',
    'Definir Campos',
    'Generar OpenAPI',
    'Guardar API'
  ];

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando detalles de la API...
        </Typography>
      </Container>
    );
  }

  if (error || !api) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Error cargando los detalles de la API
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/bian-search')}
          sx={{ mt: 2 }}
        >
          Volver a búsqueda
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/bian-search')}
          sx={{ mb: 2 }}
        >
          Volver a búsqueda
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {api.name}
            </Typography>
            <Box display="flex" gap={1} mb={2}>
              <Chip 
                label={api.serviceDomain}
                color="primary"
                icon={<BusinessIcon />}
              />
              <Chip 
                label={api.complexity}
                color={getComplexityColor(api.complexity)}
              />
              {api.popularity > 0 && (
                <Chip 
                  label={`${api.popularity} usos`}
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setWizardOpen(true)}
            disabled={companies.length === 0}
          >
            Crear API
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          {api.localizedDescription || api.description}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Descripción" icon={<DescriptionIcon />} />
          <Tab label="Operaciones" icon={<CodeIcon />} />
          <Tab label="Explicación IA" icon={<PsychologyIcon />} />
          <Tab label="Implementación" icon={<BuildIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información General
                </Typography>
                <Typography variant="body1" paragraph>
                  {api.description}
                </Typography>
                
                {api.businessCapabilities && api.businessCapabilities.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      Capacidades de Negocio
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {api.businessCapabilities.map((capability, index) => (
                        <Chip key={index} label={capability} variant="outlined" />
                      ))}
                    </Box>
                  </>
                )}

                {api.tags && api.tags.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      Etiquetas
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {api.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detalles Técnicos
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Dominio de Servicio"
                      secondary={api.serviceDomain}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Complejidad"
                      secondary={api.complexity}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Operaciones"
                      secondary={`${api.serviceOperations?.length || 0} métodos`}
                    />
                  </ListItem>
                  {api.functionalPattern && (
                    <ListItem>
                      <ListItemText 
                        primary="Patrón Funcional"
                        secondary={api.functionalPattern}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Operaciones de Servicio
            </Typography>
            {api.serviceOperations && api.serviceOperations.length > 0 ? (
              api.serviceOperations.map((operation, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip 
                        label={operation.method}
                        size="small"
                        color={operation.method === 'GET' ? 'primary' : 
                               operation.method === 'POST' ? 'success' :
                               operation.method === 'PUT' ? 'warning' : 'error'}
                      />
                      <Typography variant="subtitle1">
                        {operation.name}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      {operation.description}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography color="text.secondary">
                No hay operaciones definidas para esta API.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            {isAIGenerated ? (
              <>
                <Typography variant="h6" gutterBottom>
                  API Generada por Inteligencia Artificial
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Esta API fue generada automáticamente por nuestro sistema de IA basado en tu búsqueda. 
                  La descripción ya incluye explicaciones contextuales y ejemplos de uso.
                </Alert>
                <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" paragraph>
                    <strong>Descripción Contextual:</strong>
                  </Typography>
                  <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                    {api.description}
                  </Typography>
                  
                  {api.serviceOperations && api.serviceOperations.length > 0 && (
                    <>
                      <Typography variant="body1" paragraph sx={{ mt: 3 }}>
                        <strong>Operaciones Principales:</strong>
                      </Typography>
                      {api.serviceOperations.map((operation, index) => (
                        <Typography key={index} variant="body2" sx={{ ml: 2, mb: 1 }}>
                          • <strong>{operation.method} {operation.name}</strong>: {operation.description}
                        </Typography>
                      ))}
                    </>
                  )}
                  
                  <Typography variant="body1" paragraph sx={{ mt: 3 }}>
                    <strong>Recomendación:</strong>
                  </Typography>
                  <Typography variant="body2">
                    Para obtener una API completamente funcional y personalizada, utiliza el botón 
                    "Crear API" para generar una implementación específica para tu empresa.
                  </Typography>
                </Paper>
              </>
            ) : (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Explicación con Inteligencia Artificial
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<LightbulbIcon />}
                    onClick={handleGenerateExplanation}
                    disabled={loadingExplanation}
                  >
                    {loadingExplanation ? 'Generando...' : 'Generar Explicación'}
                  </Button>
                </Box>
                
                {loadingExplanation && (
                  <Box textAlign="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Generando explicación personalizada...
                    </Typography>
                  </Box>
                )}
                
                {aiExplanation ? (
                  <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                      {aiExplanation}
                    </Typography>
                  </Paper>
                ) : !loadingExplanation && (
                  <Alert severity="info">
                    Haz clic en "Generar Explicación" para obtener una explicación detallada 
                    de esta API generada por inteligencia artificial.
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Guía de Implementación
            </Typography>
            <Typography variant="body1" paragraph>
              Esta API BIAN puede ser implementada en tu organización siguiendo estos pasos:
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">1. Análisis de Requisitos</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Evalúa cómo esta API se integra con tus sistemas existentes y 
                  qué adaptaciones son necesarias para tu contexto específico.
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">2. Personalización</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Utiliza el botón "Crear API" para personalizar esta definición BIAN 
                  según las necesidades específicas de tu empresa.
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">3. Desarrollo</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Implementa los endpoints definidos en tu plataforma tecnológica, 
                  siguiendo las especificaciones OpenAPI generadas.
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">4. Pruebas y Validación</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Utiliza las herramientas de testing integradas para validar 
                  el comportamiento de tu API antes del despliegue en producción.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Wizard Dialog */}
      <Dialog 
        open={wizardOpen} 
        onClose={() => setWizardOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              🧙‍♂️ Asistente de Creación de API
            </Typography>
            <IconButton onClick={() => setWizardOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Personaliza "{api.name}" con IA para tu empresa
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ pb: 1 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            
            {/* Step 1: Basic Information */}
            <Step>
              <StepLabel>Información Básica</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Configura los datos básicos de tu nueva API personalizada.
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Empresa</InputLabel>
                      <Select
                        value={wizardData.companyId}
                        onChange={(e) => setWizardData(prev => ({ ...prev, companyId: e.target.value }))}
                        label="Empresa"
                      >
                        {companies.map((company) => (
                          <MenuItem key={company._id} value={company._id}>
                            {company.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nombre de la API"
                      value={wizardData.name}
                      onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={`${api.name}_${companies.find(c => c._id === wizardData.companyId)?.name || 'MiEmpresa'}`}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descripción personalizada"
                      multiline
                      rows={3}
                      value={wizardData.description}
                      onChange={(e) => setWizardData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe cómo usarás esta API en tu organización..."
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleWizardNext}
                    disabled={!wizardData.companyId || !wizardData.name}
                    sx={{ mr: 1 }}
                  >
                    Continuar
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: API Analysis */}
            <Step>
              <StepLabel>Análisis de Payloads</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Analicemos la estructura actual de datos de entrada y salida de la API BIAN.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>API Base:</strong> {api.name}<br />
                    <strong>Dominio:</strong> {api.serviceDomain}<br />
                    <strong>Operaciones:</strong> {api.serviceOperations?.length || 0} métodos disponibles
                  </Typography>
                </Alert>

                {Object.keys(wizardData.originalPayloads).length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Estructura de Datos Detectada:
                    </Typography>
                    {Object.entries(wizardData.originalPayloads).map(([key, payload]) => (
                      <Accordion key={key} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Chip 
                              label={payload.method}
                              size="small"
                              color={payload.method === 'GET' ? 'primary' : 'success'}
                            />
                            <Typography variant="subtitle2">
                              {payload.name}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            {payload.requestPayload && (
                              <Grid item xs={12} md={6}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                  Request Payload:
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                  <pre style={{ fontSize: '12px', margin: 0 }}>
                                    {JSON.stringify(payload.requestPayload, null, 2)}
                                  </pre>
                                </Paper>
                              </Grid>
                            )}
                            <Grid item xs={12} md={payload.requestPayload ? 6 : 12}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Response Payload:
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <pre style={{ fontSize: '12px', margin: 0 }}>
                                  {JSON.stringify(payload.responsePayload, null, 2)}
                                </pre>
                              </Paper>
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={Object.keys(wizardData.originalPayloads).length > 0 ? handleWizardNext : analyzeAPIPayloads}
                    sx={{ mr: 1 }}
                    startIcon={Object.keys(wizardData.originalPayloads).length === 0 ? <AutoAwesomeIcon /> : null}
                  >
                    {Object.keys(wizardData.originalPayloads).length > 0 ? 'Continuar' : 'Analizar Payloads'}
                  </Button>
                  <Button onClick={handleWizardBack}>
                    Atrás
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: Customization Request */}
            <Step>
              <StepLabel>Solicitud de Personalización</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Describe en lenguaje natural qué datos adicionales necesitas agregar a la API.
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="¿Qué datos necesitas agregar?"
                  value={wizardData.customizationRequest}
                  onChange={(e) => setWizardData(prev => ({ ...prev, customizationRequest: e.target.value }))}
                  placeholder="Ejemplo: 'email del cliente', 'dirección de facturación', 'historial de transacciones', 'preferencias de notificación', etc."
                  helperText="Sé específico sobre qué información necesitas. Nuestra IA analizará la mejor forma de integrarla."
                />
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>💡 Ejemplos de personalizaciones:</strong><br />
                    • "email y teléfono del cliente para notificaciones"<br />
                    • "datos de geolocalización para sucursales"<br />
                    • "información de scoring crediticio"<br />
                    • "metadatos personalizados del negocio"
                  </Typography>
                </Alert>
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleWizardNext}
                    disabled={!wizardData.customizationRequest.trim()}
                    sx={{ mr: 1 }}
                  >
                    Continuar
                  </Button>
                  <Button onClick={handleWizardBack}>
                    Atrás
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 4: AI Suggestions */}
            <Step>
              <StepLabel>Sugerencias de IA</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Nuestra IA analizará tu solicitud y sugerirá la mejor forma de implementarla.
                </Typography>
                
                {!wizardData.aiSuggestions && !wizardData.loadingAISuggestions && (
                  <Button
                    variant="contained"
                    onClick={getAISuggestions}
                    startIcon={<AutoAwesomeIcon />}
                    sx={{ mb: 3 }}
                  >
                    Obtener Sugerencias de IA
                  </Button>
                )}
                
                {wizardData.loadingAISuggestions && (
                  <Box textAlign="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Analizando tu solicitud con IA...
                    </Typography>
                  </Box>
                )}
                
                {wizardData.aiSuggestions && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Análisis completado:</strong> Hemos encontrado {wizardData.aiSuggestions.recommendations.length} opciones para implementar tu solicitud.
                      </Typography>
                    </Alert>
                    
                    <Typography variant="h6" gutterBottom>
                      Selecciona el tipo de implementación:
                    </Typography>
                    
                    <RadioGroup
                      value={wizardData.selectedSuggestionType}
                      onChange={(e) => setWizardData(prev => ({ ...prev, selectedSuggestionType: e.target.value }))}
                    >
                      {wizardData.aiSuggestions.recommendations.map((recommendation) => (
                        <FormControlLabel
                          key={recommendation.type}
                          value={recommendation.type}
                          control={<Radio />}
                          label={
                            <Card variant="outlined" sx={{ p: 2, mb: 1, width: '100%' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {recommendation.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {recommendation.description}
                              </Typography>
                              <Box display="flex" gap={1}>
                                <Chip 
                                  label={`Complejidad: ${recommendation.complexity}`} 
                                  size="small" 
                                  color="primary" 
                                />
                                <Chip 
                                  label={recommendation.impact} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              </Box>
                            </Card>
                          }
                        />
                      ))}
                    </RadioGroup>
                  </Box>
                )}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleWizardNext}
                    disabled={!wizardData.selectedSuggestionType}
                    sx={{ mr: 1 }}
                  >
                    Continuar
                  </Button>
                  <Button onClick={handleWizardBack}>
                    Atrás
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 5: Field Definition */}
            <Step>
              <StepLabel>Definir Campos</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Define los campos específicos que se agregarán a tu API personalizada.
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Campos Personalizados
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addCustomField}
                  >
                    Agregar Campo
                  </Button>
                </Box>
                
                {wizardData.customFields.length === 0 ? (
                  <Alert severity="info">
                    <Typography variant="body2">
                      Haz clic en "Agregar Campo" para definir los datos personalizados que necesitas.
                    </Typography>
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Descripción</TableCell>
                          <TableCell>Requerido</TableCell>
                          <TableCell>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wizardData.customFields.map((field) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <TextField
                                size="small"
                                value={field.name}
                                onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                                placeholder="nombreCampo"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={field.type}
                                onChange={(e) => updateCustomField(field.id, { type: e.target.value })}
                                sx={{ minWidth: 100 }}
                              >
                                <MenuItem value="string">String</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="integer">Integer</MenuItem>
                                <MenuItem value="boolean">Boolean</MenuItem>
                                <MenuItem value="array">Array</MenuItem>
                                <MenuItem value="object">Object</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={field.description}
                                onChange={(e) => updateCustomField(field.id, { description: e.target.value })}
                                placeholder="Descripción del campo"
                                sx={{ minWidth: 200 }}
                              />
                            </TableCell>
                            <TableCell>
                              <FormControlLabel
                                control={
                                  <Radio
                                    checked={field.required}
                                    onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                                  />
                                }
                                label=""
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => removeCustomField(field.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleWizardNext}
                    disabled={wizardData.customFields.length === 0 || wizardData.customFields.some(f => !f.name || !f.description)}
                    sx={{ mr: 1 }}
                  >
                    Continuar
                  </Button>
                  <Button onClick={handleWizardBack}>
                    Atrás
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 6: OpenAPI Generation */}
            <Step>
              <StepLabel>Generar OpenAPI</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Generemos la especificación OpenAPI personalizada con tus nuevos campos.
                </Typography>
                
                {!wizardData.generatedOpenAPI && !wizardData.loadingOpenAPI && (
                  <Button
                    variant="contained"
                    onClick={generateCustomOpenAPI}
                    startIcon={<CodeIcon />}
                    sx={{ mb: 3 }}
                  >
                    Generar Especificación OpenAPI
                  </Button>
                )}
                
                {wizardData.loadingOpenAPI && (
                  <Box textAlign="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Generando especificación OpenAPI personalizada...
                    </Typography>
                  </Box>
                )}
                
                {wizardData.generatedOpenAPI && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        ✅ <strong>Especificación generada exitosamente!</strong><br />
                        Tu API personalizada incluye {wizardData.customFields.length} campo(s) adicional(es).
                      </Typography>
                    </Alert>
                    
                    <Typography variant="h6" gutterBottom>
                      Vista Previa de la Especificación:
                    </Typography>
                    
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        bgcolor: 'grey.50',
                        fontFamily: 'monospace'
                      }}
                    >
                      <pre style={{ margin: 0, fontSize: '12px' }}>
                        {JSON.stringify(wizardData.generatedOpenAPI, null, 2)}
                      </pre>
                    </Paper>
                  </Box>
                )}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleWizardNext}
                    disabled={!wizardData.generatedOpenAPI}
                    sx={{ mr: 1 }}
                  >
                    Continuar
                  </Button>
                  <Button onClick={handleWizardBack}>
                    Atrás
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 7: Save API */}
            <Step>
              <StepLabel>Guardar API</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  ¡Todo listo! Guarda tu API personalizada para comenzar a usarla.
                </Typography>
                
                <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    📋 Resumen de tu API Personalizada
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Nombre:</strong> {wizardData.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Empresa:</strong> {companies.find(c => c._id === wizardData.companyId)?.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Descripción:</strong> {wizardData.description}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Campos Personalizados:</strong> {wizardData.customFields.length} campo(s)
                      </Typography>
                      <Box mt={1}>
                        {wizardData.customFields.map((field, index) => (
                          <Chip 
                            key={field.id}
                            label={`${field.name} (${field.type})`}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
                
                {wizardData.createdAPI ? (
                  <Alert severity="success">
                    <Typography variant="body2">
                      ✅ <strong>¡API creada exitosamente!</strong><br />
                      Tu API personalizada está lista para usar.
                    </Typography>
                  </Alert>
                ) : (
                  <Button
                    variant="contained"
                    onClick={saveCustomAPI}
                    disabled={wizardData.saving}
                    startIcon={wizardData.saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    size="large"
                    sx={{ mr: 1 }}
                  >
                    {wizardData.saving ? 'Guardando...' : 'Crear API Personalizada'}
                  </Button>
                )}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  {!wizardData.createdAPI && (
                    <Button onClick={handleWizardBack}>
                      Atrás
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          {wizardData.createdAPI ? (
            <>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="contained"
                color="primary"
              >
                Ir al Dashboard
              </Button>
              <Button 
                onClick={() => {
                  resetWizard();
                  setWizardOpen(false);
                }}
                variant="outlined"
              >
                Crear Otra API
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => {
                resetWizard();
                setWizardOpen(false);
              }}
              color="inherit"
            >
              Cancelar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BIANDetail; 