import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Button,
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  Schema as SchemaIcon,
  Api as ApiIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

import { companyService, bianService, apiService } from '../services/api';

const APIWizard = () => {
  const { referenceId, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const isEditMode = !!id;
  const isCreateMode = !!referenceId;

  // Wizard State
  const [activeStep, setActiveStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    // Step 1: Basic Info
    companyId: '',
    name: '',
    description: '',
    category: 'customer-management',
    
    // Step 2: BIAN Reference Analysis
    referenceAPI: null,
    basePayloads: {},
    selectedOperations: [],
    
    // Step 3: ChatGPT Integration
    customizationRequest: '',
    chatGptResponse: null,
    chatGptLoading: false,
    
    // Step 4: Payload Preview
    modifiedPayloads: {},
    payloadChanges: [],
    previewPayload: null,
    
    // Step 5: Schema Management
    schemas: {},
    newSchemas: [],
    schemaChanges: [],
    
    // Step 6: OpenAPI Generation
    generatedOpenAPI: null,
    openAPILoading: false,
    
    // Step 7: Final Review & Save
    swaggerEnabled: true,
    saving: false,
    savedAPI: null
  });

  // Dialog states
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);

  // Get user's companies
  const { data: companiesData } = useQuery(
    'my-companies',
    companyService.getMyCompanies
  );

  // Get BIAN reference API (for creation mode)
  const { data: referenceAPIData, isLoading: loadingReference, error: referenceError } = useQuery(
    ['bian-api-detail', referenceId],
    () => bianService.getAPIDetails(referenceId),
    { 
      enabled: isCreateMode,
      retry: false,
      onError: (error) => {
        console.log('🔍 [API WIZARD] BIAN reference fetch failed:', error.response?.data);
        
        // If this is an AI-generated/example API, show appropriate message
        if (error.response?.data?.isAIGenerated || referenceId?.startsWith('example-') || referenceId?.startsWith('ai-')) {
          toast.error('Este es un API de ejemplo que no se puede usar como referencia. Por favor, busca una API BIAN real.');
          navigate('/bian-references');
        }
      }
    }
  );

  // Get existing API (for edit mode)
  const { data: existingAPIData, isLoading: loadingExisting } = useQuery(
    ['api-detail', id],
    () => apiService.getAPI(id),
    { enabled: isEditMode }
  );

  const companies = companiesData?.data?.companies || [];

  // Initialize wizard data based on mode
  useEffect(() => {
    if (isCreateMode && referenceAPIData?.data?.api) {
      const refAPI = referenceAPIData.data.api;
      setWizardData(prev => ({
        ...prev,
        referenceAPI: refAPI,
        basePayloads: generateBasePayloads(refAPI),
        selectedOperations: refAPI.serviceOperations?.map(op => op.name) || []
      }));
    }
    
    if (isEditMode && existingAPIData?.data?.api) {
      const existingAPI = existingAPIData.data.api;
      
      // Create mock reference API for payload generation
      const mockReferenceAPI = {
        name: existingAPI.baseReference?.referenceName || existingAPI.name,
        serviceDomain: existingAPI.bianDomains?.[0]?.domain || 'Custom',
        serviceOperations: existingAPI.bianDomains?.[0]?.serviceOperations?.map(opName => ({
          name: opName,
          method: 'POST', // Default method
          description: `${opName} operation`
        })) || [
          { name: 'Create', method: 'POST', description: 'Create operation' },
          { name: 'Retrieve', method: 'GET', description: 'Retrieve operation' },
          { name: 'Update', method: 'PUT', description: 'Update operation' }
        ]
      };
      
      setWizardData(prev => ({
        ...prev,
        companyId: existingAPI.company._id || existingAPI.company,
        name: existingAPI.name,
        description: existingAPI.description,
        category: existingAPI.category || 'customer-management',
        schemas: existingAPI.schemas || {},
        generatedOpenAPI: existingAPI.currentVersionSpec || existingAPI.versions?.[0]?.openApiSpec,
        swaggerEnabled: existingAPI.swaggerEnabled !== false,
        referenceAPI: mockReferenceAPI,
        basePayloads: generateBasePayloads(mockReferenceAPI),
        selectedOperations: mockReferenceAPI.serviceOperations.map(op => op.name)
      }));
    }
  }, [referenceAPIData, existingAPIData, isCreateMode, isEditMode]);

  // Generate base payloads from BIAN reference
  const generateBasePayloads = (api) => {
    if (!api.serviceOperations) return {};
    
    const payloads = {};
    api.serviceOperations.forEach(operation => {
      payloads[operation.name] = {
        method: operation.method,
        description: operation.description,
        requestPayload: generateSamplePayload(operation, 'request'),
        responsePayload: generateSamplePayload(operation, 'response')
      };
    });
    
    return payloads;
  };

  const generateSamplePayload = (operation, type) => {
    const baseStructure = {
      request: {
        serviceDomainId: "string",
        controlRecordId: "string",
        // Method-specific fields
        ...(operation.method === 'POST' && {
          initiation: {
            datetime: "2024-01-01T10:00:00Z",
            reference: "string"
          }
        })
      },
      response: {
        serviceDomainId: "string",
        controlRecordId: "string",
        status: "completed",
        datetime: "2024-01-01T10:00:00Z"
      }
    };
    
    return baseStructure[type] || {};
  };

  // ChatGPT Integration
  const handleChatGPTAnalysis = async () => {
    setWizardData(prev => ({ ...prev, chatGptLoading: true }));
    
    try {
      const prompt = `
        Analiza esta API BIAN y propón modificaciones para: "${wizardData.customizationRequest}"
        
        API: ${wizardData.referenceAPI?.name || wizardData.name}
        Dominio: ${wizardData.referenceAPI?.serviceDomain || 'Custom'}
        
        Responde en formato JSON:
        {
          "analysis": "análisis detallado",
          "recommendedApproach": "simple_fields|complex_schema|new_operations",
          "payloadModifications": [
            {
              "operation": "nombre_operación",
              "type": "request|response", 
              "changes": [
                {
                  "action": "add|modify",
                  "path": "ruta.del.campo",
                  "value": "valor_ejemplo",
                  "description": "descripción"
                }
              ]
            }
          ],
          "newSchemas": [
            {
              "name": "NombreSchema",
              "description": "descripción",
              "properties": {
                "campo1": { "type": "string", "description": "..." }
              }
            }
          ]
        }
      `;

      const response = await bianService.intelligentSearch({
        query: prompt,
        language: 'es'
      });

      const chatGptResponse = {
        analysis: response.data.interpretation,
        recommendedApproach: 'simple_fields',
        payloadModifications: [],
        newSchemas: []
      };

      setWizardData(prev => ({
        ...prev,
        chatGptResponse,
        chatGptLoading: false
      }));

      setActiveStep(prev => prev + 1);
      toast.success('Análisis de IA completado');

    } catch (error) {
      console.error('Error en ChatGPT:', error);
      toast.error('Error en el análisis de IA');
      setWizardData(prev => ({ ...prev, chatGptLoading: false }));
    }
  };

  // Wizard navigation
  const handleNext = () => {
    if (activeStep === 2 && !wizardData.customizationRequest.trim()) {
      toast.error('Describe las modificaciones que necesitas');
      return;
    }
    
    if (activeStep === 2) {
      handleChatGPTAnalysis();
      return;
    }
    
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  // Generate preview payload
  const generatePreviewPayload = () => {
    const basePayload = wizardData.basePayloads[Object.keys(wizardData.basePayloads)[0]];
    if (!basePayload) return;

    // Apply ChatGPT suggestions to create preview
    const customFields = {};
    
    // Parse customization request to add relevant fields
    const request = wizardData.customizationRequest.toLowerCase();
    
    if (request.includes('email')) {
      customFields.email = "customer@example.com";
    }
    if (request.includes('teléfono') || request.includes('telefono') || request.includes('phone')) {
      customFields.phone = "+1234567890";
    }
    if (request.includes('dirección') || request.includes('direccion') || request.includes('address')) {
      customFields.address = {
        street: "123 Main St",
        city: "San José",
        country: "Costa Rica",
        postalCode: "10101"
      };
    }
    if (request.includes('fecha') || request.includes('nacimiento') || request.includes('birth')) {
      customFields.birthDate = "1985-03-15";
    }
    if (request.includes('scoring') || request.includes('credit')) {
      customFields.creditScore = 750;
    }
    if (request.includes('preferencia') || request.includes('preference')) {
      customFields.preferences = {
        notifications: true,
        language: "es",
        communicationChannel: "email"
      };
    }
    if (request.includes('geolocalización') || request.includes('location') || request.includes('sucursal')) {
      customFields.location = {
        latitude: 9.9281,
        longitude: -84.0907,
        branchCode: "CR001"
      };
    }

    const previewPayload = {
      ...basePayload.responsePayload,
      // Add the custom fields based on the request
      ...customFields,
      // Add a modification indicator
      _modifications: {
        addedFields: Object.keys(customFields),
        basedOnRequest: wizardData.customizationRequest,
        timestamp: new Date().toISOString()
      }
    };

    setWizardData(prev => ({ ...prev, previewPayload }));
  };

  // Generate OpenAPI
  const generateOpenAPI = async () => {
    setWizardData(prev => ({ ...prev, openAPILoading: true }));
    
    try {
      const openAPISpec = {
        openapi: '3.0.0',
        info: {
          title: wizardData.name,
          description: wizardData.description,
          version: '1.0.0'
        },
        servers: [
          {
            url: 'https://api.example.com/v1',
            description: 'Production server'
          }
        ],
        paths: {},
        components: {
          schemas: {
            ...wizardData.schemas,
            ...(wizardData.newSchemas?.reduce((acc, schema) => {
              acc[schema.name] = schema;
              return acc;
            }, {}))
          }
        }
      };

      // Generate paths
      Object.entries(wizardData.basePayloads).forEach(([opName, payload]) => {
        const path = `/api/${opName.toLowerCase()}`;
        openAPISpec.paths[path] = {
          [payload.method.toLowerCase()]: {
            summary: payload.description,
            operationId: opName,
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: { type: 'object' }
                  }
                }
              }
            }
          }
        };
      });

      setWizardData(prev => ({
        ...prev,
        generatedOpenAPI: openAPISpec,
        openAPILoading: false
      }));

      setActiveStep(prev => prev + 1);
      toast.success('OpenAPI generado exitosamente');

    } catch (error) {
      console.error('Error generando OpenAPI:', error);
      toast.error('Error generando OpenAPI');
      setWizardData(prev => ({ ...prev, openAPILoading: false }));
    }
  };

  // Save API
  const saveAPI = async () => {
    setWizardData(prev => ({ ...prev, saving: true }));
    
    try {
      // Generate slug from name
      const slug = wizardData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-')          // Replace multiple hyphens with single
        .trim('-');                   // Remove leading/trailing hyphens

      const apiData = {
        companyId: wizardData.companyId, // El controlador espera companyId
        name: wizardData.name,
        slug: slug, // Add the generated slug
        description: wizardData.description,
        category: wizardData.category,
        useAI: false, // No usar AI enrichment, ya tenemos nuestro spec
        ...(wizardData.generatedOpenAPI && {
          customOpenApiSpec: wizardData.generatedOpenAPI // Enviamos el spec generado
        }),
        ...(isCreateMode && {
          bianDomains: [{
            domain: wizardData.referenceAPI?.serviceDomain || 'Custom',
            serviceOperations: wizardData.referenceAPI?.serviceOperations?.map(op => op.name) || []
          }],
          tags: wizardData.referenceAPI?.tags || [],
          baseReference: {
            type: 'bian',
            referenceId: referenceId,
            referenceName: wizardData.referenceAPI?.name
          }
        })
      };

      console.log('🔍 [SAVE API] Datos que se van a enviar:', apiData);
      console.log('🔍 [SAVE API] Slug generado:', slug);
      console.log('🔍 [SAVE API] Category:', wizardData.category);
      console.log('🔍 [SAVE API] OpenAPI spec:', !!wizardData.generatedOpenAPI);

      let response;
      if (isEditMode) {
        response = await apiService.updateAPI(id, apiData);
      } else {
        response = await apiService.createAPI(apiData);
      }

      setWizardData(prev => ({
        ...prev,
        savedAPI: response.data,
        saving: false
      }));

      toast.success(`API ${isEditMode ? 'actualizada' : 'creada'} exitosamente`);
      queryClient.invalidateQueries('my-apis');

    } catch (error) {
      console.error('Error guardando API:', error);
      toast.error(`Error ${isEditMode ? 'actualizando' : 'creando'} la API`);
      setWizardData(prev => ({ ...prev, saving: false }));
    }
  };

  const steps = [
    'Información Básica',
    'Payload Base BIAN',
    'Consulta ChatGPT',
    'Vista Previa Payload',
    'Gestión de Schemas',
    'OpenAPI Generado',
    'Swagger & Finalizar'
  ];

  if ((isCreateMode && loadingReference) || (isEditMode && loadingExisting)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {isEditMode ? 'Cargando API...' : 'Cargando referencia BIAN...'}
        </Typography>
      </Container>
    );
  }

  // Handle error state for reference API
  if (isCreateMode && referenceError && !referenceAPIData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Error al cargar la referencia BIAN
          </Typography>
          <Typography variant="body2">
            No se pudo cargar la API de referencia. Esto puede ser porque intentas acceder a un API de ejemplo que no existe en la base de datos.
          </Typography>
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/bian-references')}
          sx={{ mr: 2 }}
        >
          Buscar APIs BIAN
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
        >
          Volver
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
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Volver
        </Button>
        
        <Typography variant="h4" gutterBottom>
          {isEditMode ? '🔧 Editar API' : '🧙‍♂️ Crear Nueva API'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isEditMode 
            ? `Modifica "${wizardData.name}" con el wizard inteligente`
            : `Personaliza "${wizardData.referenceAPI?.name}" con IA`
          }
        </Typography>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          
          {/* Step 1: Basic Information */}
          <Step>
            <StepLabel>
              <Typography variant="h6">📝 Información Básica</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Configura los datos fundamentales de tu API.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
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
                    required
                    label="Nombre de la API"
                    value={wizardData.name}
                    onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={isCreateMode 
                      ? `${wizardData.referenceAPI?.name}_Custom`
                      : 'Nombre de tu API'
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select
                      value={wizardData.category}
                      onChange={(e) => setWizardData(prev => ({ ...prev, category: e.target.value }))}
                      label="Categoría"
                    >
                      <MenuItem value="customer-management">Customer Management</MenuItem>
                      <MenuItem value="account-management">Account Management</MenuItem>
                      <MenuItem value="payment-processing">Payment Processing</MenuItem>
                      <MenuItem value="lending">Lending</MenuItem>
                      <MenuItem value="risk-management">Risk Management</MenuItem>
                      <MenuItem value="compliance">Compliance</MenuItem>
                      <MenuItem value="analytics">Analytics</MenuItem>
                      <MenuItem value="other">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Descripción"
                    value={wizardData.description}
                    onChange={(e) => setWizardData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el propósito y uso de esta API..."
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!wizardData.companyId || !wizardData.name}
                >
                  Continuar
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 2: BIAN Base Payload */}
          <Step>
            <StepLabel>
              <Typography variant="h6">📊 Payload Base BIAN</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Analiza y selecciona los payloads base de la API BIAN de referencia.
              </Typography>
              
              {wizardData.referenceAPI && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>API Base:</strong> {wizardData.referenceAPI.name}<br />
                    <strong>Dominio:</strong> {wizardData.referenceAPI.serviceDomain}<br />
                    <strong>Operaciones:</strong> {wizardData.selectedOperations.length} disponibles
                  </Typography>
                </Alert>
              )}

              {Object.keys(wizardData.basePayloads).length > 0 && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Payloads Detectados:
                    </Typography>
                    {Object.entries(wizardData.basePayloads).map(([opName, payload]) => (
                      <Accordion key={opName}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>
                            <Chip label={payload.method} size="small" sx={{ mr: 1 }} />
                            {opName}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {payload.description}
                          </Typography>
                          <Typography variant="subtitle2" gutterBottom>Request:</Typography>
                          <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                            <pre style={{ fontSize: '12px', margin: 0 }}>
                              {JSON.stringify(payload.requestPayload, null, 2)}
                            </pre>
                          </Paper>
                          <Typography variant="subtitle2" gutterBottom>Response:</Typography>
                          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <pre style={{ fontSize: '12px', margin: 0 }}>
                              {JSON.stringify(payload.responsePayload, null, 2)}
                            </pre>
                          </Paper>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              )}
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={Object.keys(wizardData.basePayloads).length === 0}
                >
                  Continuar
                </Button>
                <Button onClick={handleBack} sx={{ ml: 1 }}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 3: ChatGPT Consultation */}
          <Step>
            <StepLabel>
              <Typography variant="h6">🤖 Consulta ChatGPT</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Describe qué modificaciones necesitas y nuestra IA te sugerirá la mejor implementación.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={6}
                label="¿Qué necesitas agregar o modificar?"
                value={wizardData.customizationRequest}
                onChange={(e) => setWizardData(prev => ({ ...prev, customizationRequest: e.target.value }))}
                placeholder="Ejemplo: 'agregar email y teléfono del cliente', 'incluir información de scoring crediticio', 'datos de geolocalización para sucursales'..."
                helperText="Sé específico sobre qué información necesitas. La IA analizará la mejor forma de integrarla."
                sx={{ mb: 3 }}
              />

              {wizardData.chatGptLoading && (
                <Box textAlign="center" py={4}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Analizando con IA... Esto puede tomar unos momentos.
                  </Typography>
                </Box>
              )}

              {wizardData.chatGptResponse && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Análisis completado:</strong><br />
                    {wizardData.chatGptResponse.analysis}
                  </Typography>
                </Alert>
              )}
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!wizardData.customizationRequest.trim() || wizardData.chatGptLoading}
                  startIcon={wizardData.chatGptLoading ? <CircularProgress size={20} /> : <PsychologyIcon />}
                >
                  {wizardData.chatGptLoading ? 'Analizando...' : 'Analizar con IA'}
                </Button>
                <Button onClick={handleBack} sx={{ ml: 1 }}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 4: Payload Preview */}
          <Step>
            <StepLabel>
              <Typography variant="h6">👁️ Vista Previa del Payload</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Revisa las modificaciones sugeridas por la IA y cómo quedará tu payload.
              </Typography>
              
              {wizardData.chatGptResponse && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    🤖 Análisis de IA Completado
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Recomendación:</strong> {wizardData.chatGptResponse.analysis}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Enfoque sugerido:</strong> {wizardData.chatGptResponse.recommendedApproach === 'simple_fields' ? 'Campos simples' : 'Esquemas complejos'}
                  </Typography>
                </Alert>
              )}
              
              <Button
                variant="outlined"
                onClick={generatePreviewPayload}
                startIcon={<PreviewIcon />}
                sx={{ mb: 3 }}
              >
                Generar Vista Previa con Modificaciones
              </Button>

              {wizardData.previewPayload && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📄 Payload Modificado (Preview)
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', overflow: 'auto', maxHeight: 400 }}>
                      <pre style={{ fontSize: '12px', margin: 0 }}>
                        {JSON.stringify(wizardData.previewPayload, null, 2)}
                      </pre>
                    </Paper>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      💡 Los campos personalizados se han agregado basándose en tu solicitud: "{wizardData.customizationRequest}"
                    </Typography>
                  </CardContent>
                </Card>
              )}
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!wizardData.previewPayload}
                >
                  Continuar
                </Button>
                <Button onClick={handleBack} sx={{ ml: 1 }}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 5: Schema Management */}
          <Step>
            <StepLabel>
              <Typography variant="h6">🔧 Gestión de Schemas</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Configura y crea los schemas necesarios para tu API personalizada.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Los schemas definen la estructura de datos de tu API. Se crearán automáticamente basados en tus modificaciones.
                </Typography>
              </Alert>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Schemas Existentes: {Object.keys(wizardData.schemas).length}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    Nuevos Schemas: {wizardData.newSchemas.length}
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setSchemaDialogOpen(true)}
                    sx={{ mt: 2 }}
                  >
                    Agregar Schema Personalizado
                  </Button>
                </CardContent>
              </Card>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Continuar
                </Button>
                <Button onClick={handleBack} sx={{ ml: 1 }}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 6: OpenAPI Generation */}
          <Step>
            <StepLabel>
              <Typography variant="h6">📄 OpenAPI Generado</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Genera la especificación OpenAPI completa para tu API personalizada.
              </Typography>
              
              {!wizardData.generatedOpenAPI && !wizardData.openAPILoading && (
                <Button
                  variant="contained"
                  onClick={generateOpenAPI}
                  startIcon={<CodeIcon />}
                  sx={{ mb: 3 }}
                >
                  Generar Especificación OpenAPI
                </Button>
              )}

              {wizardData.openAPILoading && (
                <Box textAlign="center" py={4}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Generando especificación OpenAPI...
                  </Typography>
                </Box>
              )}
              
              {wizardData.generatedOpenAPI && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      ✅ Especificación OpenAPI Generada
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Paths: {Object.keys(wizardData.generatedOpenAPI.paths || {}).length}<br />
                      Schemas: {Object.keys(wizardData.generatedOpenAPI.components?.schemas || {}).length}
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', overflow: 'auto', maxHeight: 300 }}>
                      <pre style={{ fontSize: '10px', margin: 0 }}>
                        {JSON.stringify(wizardData.generatedOpenAPI, null, 2)}
                      </pre>
                    </Paper>
                  </CardContent>
                </Card>
              )}
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!wizardData.generatedOpenAPI}
                >
                  Continuar
                </Button>
                <Button onClick={handleBack} sx={{ ml: 1 }}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 7: Swagger & Save */}
          <Step>
            <StepLabel>
              <Typography variant="h6">🚀 Swagger & Finalizar</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 3 }}>
                ¡Todo listo! Revisa la configuración final y guarda tu API.
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Resumen Final
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Nombre:</strong> {wizardData.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Categoría:</strong> {wizardData.category}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Descripción:</strong> {wizardData.description}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={wizardData.swaggerEnabled}
                        onChange={(e) => setWizardData(prev => ({ ...prev, swaggerEnabled: e.target.checked }))}
                      />
                    }
                    label="Habilitar Swagger UI"
                  />
                </CardContent>
              </Card>

              {wizardData.savedAPI ? (
                <Alert severity="success">
                  <Typography variant="body2">
                    ✅ <strong>¡API {isEditMode ? 'actualizada' : 'creada'} exitosamente!</strong><br />
                    Tu API está lista para usar.
                  </Typography>
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  onClick={saveAPI}
                  disabled={wizardData.saving}
                  startIcon={wizardData.saving ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {wizardData.saving 
                    ? (isEditMode ? 'Actualizando...' : 'Creando...') 
                    : (isEditMode ? 'Actualizar API' : 'Crear API Personalizada')
                  }
                </Button>
              )}
              
              <Box sx={{ mt: 3 }}>
                {wizardData.savedAPI ? (
                  <Button
                    variant="contained"
                    onClick={() => navigate('/apis')}
                  >
                    Ver Mis APIs
                  </Button>
                ) : (
                  <Button onClick={handleBack}>
                    Atrás
                  </Button>
                )}
              </Box>
            </StepContent>
          </Step>
          
        </Stepper>
      </Paper>

      {/* Schema Creation Dialog */}
      <Dialog
        open={schemaDialogOpen}
        onClose={() => setSchemaDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          🔧 Crear Schema Personalizado
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Define un nuevo schema para estructurar los datos de tu API.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Schema"
                placeholder="Ej: CustomerInfo, PaymentDetails"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Descripción"
                placeholder="Describe qué datos contendrá este schema..."
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Propiedades del Schema (JSON):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                placeholder={`{
  "email": {
    "type": "string",
    "description": "Email del cliente",
    "format": "email"
  },
  "phone": {
    "type": "string",
    "description": "Teléfono del cliente"
  }
}`}
                sx={{ fontFamily: 'monospace' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchemaDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // TODO: Add schema creation logic
              setSchemaDialogOpen(false);
              toast.success('Schema agregado (funcionalidad en desarrollo)');
            }}
          >
            Agregar Schema
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default APIWizard; 