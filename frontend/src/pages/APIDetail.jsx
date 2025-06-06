import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tab,
  Tabs,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  AutoAwesome,
  Psychology as PsychologyIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const APIDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    visibility: ''
  });

  // Wizard/Payload customization states
  const [payloadStep, setPayloadStep] = useState(0); // 0: View payloads, 1: ChatGPT consultation, 2: Preview & Generate
  const [basePayloads, setBasePayloads] = useState({});
  const [customizationRequest, setCustomizationRequest] = useState('');
  const [chatGptResponse, setChatGptResponse] = useState(null);
  const [chatGptLoading, setChatGptLoading] = useState(false);
  const [modifiedPayloads, setModifiedPayloads] = useState({});
  const [generatedOpenAPI, setGeneratedOpenAPI] = useState(null);
  const [openAPILoading, setOpenAPILoading] = useState(false);

  // Get API details
  const { data: apiData, isLoading, error, refetch } = useQuery({
    queryKey: ['api-detail', id],
    queryFn: () => apiService.getAPI(id),
    onSuccess: (data) => {
      const api = data.data.api;
      
      console.log('🔧 [API DETAIL] Loading API data:', {
        apiId: id,
        apiName: api.name,
        currentVersion: api.currentVersion,
        currentVersionSpec: !!api.currentVersionSpec,
        specKeys: api.currentVersionSpec ? Object.keys(api.currentVersionSpec) : null,
        versions: api.versions?.length || 0,
        hasVersions: !!api.versions,
        firstVersionSpec: api.versions?.[0]?.openApiSpec ? !!api.versions[0].openApiSpec : null
      });
      
      setEditForm({
        name: api.name,
        description: api.description || '',
        status: api.status,
        visibility: api.visibility
      });

      // Generate base payloads for customization
      generateBasePayloads(api);
    }
  });

  const api = apiData?.data?.api;

  const updateAPIMutation = useMutation({
    mutationFn: (data) => apiService.updateAPI(id, data),
    onSuccess: () => {
      toast.success('API actualizada exitosamente');
      setEditDialogOpen(false);
      refetch();
    },
    onError: () => {
      toast.error('Error actualizando la API');
    }
  });

  const handleEdit = () => {
    updateAPIMutation.mutate(editForm);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'review': return 'warning';
      case 'draft': return 'default';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public': return <PublicIcon fontSize="small" />;
      case 'company': return <BusinessIcon fontSize="small" />;
      case 'private': return <LockIcon fontSize="small" />;
      default: return <LockIcon fontSize="small" />;
    }
  };

  const downloadOpenAPISpec = () => {
    if (!api?.currentVersionSpec) return;
    
    const dataStr = JSON.stringify(api.currentVersionSpec, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${api.name.replace(/\s+/g, '-').toLowerCase()}-openapi.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Generate base payloads from BIAN reference or current API
  const generateBasePayloads = (apiData) => {
    if (!apiData?.bianDomains || !apiData.bianDomains[0]?.serviceOperations) return;

    const payloads = {};
    const operations = apiData.bianDomains[0].serviceOperations;

    operations.forEach(opName => {
      const method = getMethodForOperation(opName);
      payloads[opName] = {
        method: method,
        name: opName,
        description: `${opName} operation for ${apiData.name}`,
        requestPayload: generateSamplePayload(opName, method, 'request'),
        responsePayload: generateSamplePayload(opName, method, 'response')
      };
    });

    setBasePayloads(payloads);
  };

  const getMethodForOperation = (operationName) => {
    const name = operationName.toLowerCase();
    if (name.includes('create') || name.includes('initiate')) return 'POST';
    if (name.includes('retrieve') || name.includes('get')) return 'GET';
    if (name.includes('update') || name.includes('modify')) return 'PUT';
    if (name.includes('delete') || name.includes('terminate')) return 'DELETE';
    return 'POST'; // Default
  };

  const generateSamplePayload = (operationName, method, type) => {
    const name = operationName.toLowerCase();
    
    if (type === 'request' && ['POST', 'PUT', 'PATCH'].includes(method)) {
      return {
        data: {
          id: "string",
          timestamp: "2024-01-01T00:00:00Z",
          ...(name.includes('customer') && {
            customerId: "string",
            customerData: {
              name: "string",
              email: "string",
              phone: "string"
            }
          }),
          ...(name.includes('payment') && {
            amount: "number",
            currency: "string",
            reference: "string"
          }),
          ...(name.includes('account') && {
            accountId: "string",
            accountType: "string",
            balance: "number"
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
          ...(name.includes('customer') && {
            customerInfo: {
              id: "string",
              profile: "object",
              status: "string"
            }
          }),
          ...(name.includes('payment') && {
            transactionId: "string",
            amount: "number",
            status: "processed"
          }),
          ...(name.includes('account') && {
            balance: "number",
            transactions: "array",
            accountDetails: "object"
          })
        },
        message: "string"
      };
    }
  };

  // ChatGPT consultation function
  const handleChatGPTAnalysis = async () => {
    if (!customizationRequest.trim()) {
      toast.error('Describe las modificaciones que necesitas');
      return;
    }

    setChatGptLoading(true);
    try {
      // Simulate ChatGPT analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse = {
        analysis: `Basándome en tu solicitud "${customizationRequest}", recomiendo agregar los siguientes campos a los payloads de tu API`,
        suggestions: [
          {
            operation: 'Create',
            modifications: [
              { field: 'email', type: 'string', description: 'Email del cliente' },
              { field: 'phone', type: 'string', description: 'Teléfono del cliente' }
            ]
          }
        ]
      };
      
      setChatGptResponse(mockResponse);
      setPayloadStep(2); // Move to preview step
      toast.success('Análisis completado');
    } catch (error) {
      console.error('Error with ChatGPT analysis:', error);
      toast.error('Error en el análisis con ChatGPT');
    } finally {
      setChatGptLoading(false);
    }
  };

  // Generate OpenAPI with modifications
  const handleGenerateOpenAPI = async () => {
    setOpenAPILoading(true);
    try {
      const newSpec = {
        openapi: '3.0.0',
        info: {
          title: api.name,
          description: api.description,
          version: '2.0.0' // Increment version
        },
        servers: [
          {
            url: 'https://api.example.com/v2',
            description: 'Production server'
          }
        ],
        paths: {},
        components: {
          schemas: {}
        }
      };

      // Generate paths based on payloads
      Object.entries(basePayloads).forEach(([opName, payload]) => {
        const path = `/api/${opName.toLowerCase()}`;
        newSpec.paths[path] = {
          [payload.method.toLowerCase()]: {
            summary: payload.description,
            operationId: opName,
            requestBody: ['POST', 'PUT', 'PATCH'].includes(payload.method) ? {
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            } : undefined,
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

      setGeneratedOpenAPI(newSpec);
      toast.success('OpenAPI generado exitosamente');
    } catch (error) {
      console.error('Error generating OpenAPI:', error);
      toast.error('Error generando OpenAPI');
    } finally {
      setOpenAPILoading(false);
    }
  };

  // Save updated API with new OpenAPI spec
  const handleSaveUpdatedAPI = async () => {
    if (!generatedOpenAPI) return;

    try {
      await apiService.updateAPI(id, {
        customOpenApiSpec: generatedOpenAPI
      });
      
      toast.success('API actualizada exitosamente');
      refetch(); // Refresh API data
      setPayloadStep(0); // Reset wizard
    } catch (error) {
      console.error('Error saving API:', error);
      toast.error('Error guardando la API');
    }
  };

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
          onClick={() => navigate('/apis')}
          sx={{ mt: 2 }}
        >
          Volver a APIs
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
          onClick={() => navigate('/apis')}
          sx={{ mb: 2 }}
        >
          Volver a APIs
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {api.name}
            </Typography>
            <Box display="flex" gap={1} mb={2}>
              <Chip 
                label={api.status}
                color={getStatusColor(api.status)}
              />
              <Chip 
                icon={getVisibilityIcon(api.visibility)}
                label={api.visibility}
                variant="outlined"
              />
              <Chip 
                label={`v${api.currentVersion}`}
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadOpenAPISpec}
            >
              Descargar OpenAPI
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditDialogOpen(true)}
            >
              Editar
            </Button>
          </Box>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          {api.description || 'Sin descripción'}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Información" icon={<DescriptionIcon />} />
          <Tab label="OpenAPI Spec" icon={<CodeIcon />} />
          <Tab label="Personalizar Payloads" icon={<AutoAwesome />} />
          <Tab label="Configuración" icon={<SettingsIcon />} />
          <Tab label="Analíticas" icon={<AnalyticsIcon />} />
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
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Nombre"
                      secondary={api.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Descripción"
                      secondary={api.description || 'Sin descripción'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Categoría"
                      secondary={api.category}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Estado"
                      secondary={api.status}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Visibilidad"
                      secondary={api.visibility}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Versión Actual"
                      secondary={api.currentVersion}
                    />
                  </ListItem>
                </List>

                {api.tags && api.tags.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Etiquetas
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {api.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                    </Box>
                  </>
                )}

                {api.bianDomains && api.bianDomains.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Dominios BIAN
                    </Typography>
                    {api.bianDomains.map((domain, index) => (
                      <Box key={index} mb={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          {domain.domain}
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {domain.serviceOperations.map((operation, opIndex) => (
                            <Chip 
                              key={opIndex}
                              label={operation}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estadísticas
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Vistas"
                      secondary={api.analytics?.views || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Descargas"
                      secondary={api.analytics?.downloads || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Último acceso"
                      secondary={api.analytics?.lastAccessed 
                        ? new Date(api.analytics.lastAccessed).toLocaleDateString()
                        : 'Nunca'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Creado"
                      secondary={new Date(api.createdAt).toLocaleDateString()}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Actualizado"
                      secondary={new Date(api.updatedAt).toLocaleDateString()}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {api.baseReference && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Referencia Base
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Tipo"
                        secondary={api.baseReference.type}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Nombre"
                        secondary={api.baseReference.referenceName}
                      />
                    </ListItem>
                    {api.baseReference.source && (
                      <ListItem>
                        <ListItemText 
                          primary="Fuente"
                          secondary={api.baseReference.source}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Especificación OpenAPI
            </Typography>
            {api.currentVersionSpec ? (
              <Paper sx={{ p: 2, bgcolor: 'grey.50', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(api.currentVersionSpec, null, 2)}
                </pre>
              </Paper>
            ) : (
              <Alert severity="info">
                No hay especificación OpenAPI disponible para esta versión.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🧙‍♂️ Personalizar Payloads de la API
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Modifica los payloads de referencia usando ChatGPT para construir una versión personalizada de tu API.
            </Typography>

            <Stepper activeStep={payloadStep} orientation="vertical">
              {/* Step 1: View Base Payloads */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">📄 Ver Payloads Base</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Revisa los payloads de referencia generados desde la API BIAN base.
                  </Typography>
                  
                  {Object.keys(basePayloads).length > 0 ? (
                    <>
                      {Object.entries(basePayloads).map(([opName, payload]) => (
                        <Accordion key={opName} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Chip 
                                label={payload.method}
                                size="small"
                                color={payload.method === 'GET' ? 'primary' : 
                                       payload.method === 'POST' ? 'success' :
                                       payload.method === 'PUT' ? 'warning' : 'error'}
                              />
                              <Typography variant="subtitle1">
                                {payload.name}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Request Payload:
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50', fontSize: '0.75rem' }}>
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {JSON.stringify(payload.requestPayload, null, 2)}
                                  </pre>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Response Payload:
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50', fontSize: '0.75rem' }}>
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {JSON.stringify(payload.responsePayload, null, 2)}
                                  </pre>
                                </Paper>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                      
                      <Box sx={{ mt: 3 }}>
                        <Button
                          variant="contained"
                          onClick={() => setPayloadStep(1)}
                        >
                          Personalizar con ChatGPT
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <Alert severity="info">
                      No se pudieron generar payloads base. Asegúrate de que la API tenga dominios BIAN configurados.
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={() => generateBasePayloads(api)}
                        >
                          Regenerar Payloads
                        </Button>
                      </Box>
                    </Alert>
                  )}
                </StepContent>
              </Step>

              {/* Step 2: ChatGPT Consultation */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">🤖 Consulta ChatGPT</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Describe qué modificaciones necesitas y ChatGPT te sugerirá cómo implementarlas.
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="¿Qué necesitas agregar o modificar?"
                    value={customizationRequest}
                    onChange={(e) => setCustomizationRequest(e.target.value)}
                    placeholder="Ejemplo: 'agregar email y teléfono del cliente', 'incluir información de scoring crediticio', 'datos de geolocalización'..."
                    helperText="Sé específico sobre qué información necesitas. ChatGPT analizará la mejor forma de integrarla."
                    sx={{ mb: 3 }}
                  />

                  {chatGptLoading && (
                    <Box textAlign="center" py={4}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Analizando con ChatGPT... Esto puede tomar unos momentos.
                      </Typography>
                    </Box>
                  )}

                  {chatGptResponse && (
                    <Card variant="outlined" sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          🤖 Análisis de ChatGPT
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {chatGptResponse.analysis}
                        </Typography>
                        
                        {chatGptResponse.suggestions?.map((suggestion, index) => (
                          <Box key={index} mb={2}>
                            <Typography variant="subtitle2" gutterBottom>
                              Modificaciones para {suggestion.operation}:
                            </Typography>
                            <List dense>
                              {suggestion.modifications.map((mod, modIndex) => (
                                <ListItem key={modIndex}>
                                  <ListItemText
                                    primary={`${mod.field} (${mod.type})`}
                                    secondary={mod.description}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handleChatGPTAnalysis}
                      disabled={!customizationRequest.trim() || chatGptLoading}
                      startIcon={<PsychologyIcon />}
                      sx={{ mr: 1 }}
                    >
                      {chatGptLoading ? 'Analizando...' : 'Analizar con ChatGPT'}
                    </Button>
                    <Button onClick={() => setPayloadStep(0)}>
                      Atrás
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Step 3: Preview & Generate OpenAPI */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">📄 Vista Previa y Generación</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Genera la nueva especificación OpenAPI con las modificaciones sugeridas.
                  </Typography>
                  
                  {generatedOpenAPI ? (
                    <>
                      <Alert severity="success" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                          ✅ <strong>OpenAPI generado exitosamente</strong><br />
                          Nueva versión: {generatedOpenAPI.info.version}
                        </Typography>
                      </Alert>
                      
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', overflow: 'auto', maxHeight: 400, mb: 3 }}>
                        <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                          {JSON.stringify(generatedOpenAPI, null, 2)}
                        </pre>
                      </Paper>
                      
                      <Button
                        variant="contained"
                        onClick={handleSaveUpdatedAPI}
                        startIcon={<SaveIcon />}
                        size="large"
                      >
                        Guardar API Actualizada
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleGenerateOpenAPI}
                      disabled={openAPILoading}
                      startIcon={openAPILoading ? <CircularProgress size={20} /> : <PreviewIcon />}
                    >
                      {openAPILoading ? 'Generando...' : 'Generar Nueva Especificación OpenAPI'}
                    </Button>
                  )}
                  
                  <Box sx={{ mt: 3 }}>
                    <Button onClick={() => setPayloadStep(1)}>
                      Atrás
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuración de la API
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Configuración General
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="URL Base"
                          secondary={api.currentVersionSpec?.servers?.[0]?.url || 'No configurada'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Versión de OpenAPI"
                          secondary={api.currentVersionSpec?.openapi || '3.0.0'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Formato de Respuesta"
                          secondary="application/json"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Autenticación"
                          secondary={api.currentVersionSpec?.components?.securitySchemes ? 'Configurada' : 'No configurada'}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Endpoints Disponibles
                    </Typography>
                    {api.currentVersionSpec?.paths ? (
                      <List dense>
                        {Object.keys(api.currentVersionSpec.paths).slice(0, 5).map((path, index) => (
                          <ListItem key={index}>
                            <ListItemText 
                              primary={path}
                              secondary={Object.keys(api.currentVersionSpec.paths[path]).join(', ').toUpperCase()}
                            />
                          </ListItem>
                        ))}
                        {Object.keys(api.currentVersionSpec.paths).length > 5 && (
                          <ListItem>
                            <ListItemText 
                              primary={`+${Object.keys(api.currentVersionSpec.paths).length - 5} más...`}
                              secondary="Ver pestaña OpenAPI Spec para detalles completos"
                            />
                          </ListItem>
                        )}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No hay endpoints configurados
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Historial de Versiones
                    </Typography>
                    {api.versions && api.versions.length > 0 ? (
                      <List>
                        {api.versions.slice(0, 3).map((version, index) => (
                          <ListItem key={index}>
                            <ListItemText 
                              primary={`Versión ${version.version}`}
                              secondary={`Creada: ${new Date(version.createdAt).toLocaleDateString()} - ${version.changelog || 'Sin descripción de cambios'}`}
                            />
                            {version.version === api.currentVersion && (
                              <Chip label="Actual" color="primary" size="small" />
                            )}
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No hay historial de versiones disponible
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analíticas Detalladas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Métricas y analíticas detalladas próximamente...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Editar API
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Descripción"
              multiline
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEdit}
            variant="contained"
            disabled={updateAPIMutation.isLoading}
          >
            {updateAPIMutation.isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default APIDetail; 