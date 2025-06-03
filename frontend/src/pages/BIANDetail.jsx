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
  MenuItem
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
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from 'react-query';
import { bianService, companyService } from '../services/api';
import toast from 'react-hot-toast';

const BIANDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [createForm, setCreateForm] = useState({
    companyId: '',
    name: '',
    description: ''
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
      toast.error('Error generando explicación');
      setLoadingExplanation(false);
    }
  });

  const createAPIMutation = useMutation({
    mutationFn: (data) => bianService.createAPIFromReference(id, data),
    onSuccess: (data) => {
      toast.success('API creada exitosamente');
      setCreateDialogOpen(false);
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error('Error creando API');
    }
  });

  const handleGenerateExplanation = () => {
    setLoadingExplanation(true);
    generateExplanationMutation.mutate({ 
      apiId: id, 
      language: 'es' 
    });
  };

  const handleCreateAPI = () => {
    if (!createForm.companyId || !createForm.name) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    createAPIMutation.mutate(createForm);
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
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
            onClick={() => setCreateDialogOpen(true)}
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

      {/* Create API Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Crear API basada en {api.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Empresa</InputLabel>
              <Select
                value={createForm.companyId}
                onChange={(e) => setCreateForm(prev => ({ ...prev, companyId: e.target.value }))}
                label="Empresa"
              >
                {companies.map((company) => (
                  <MenuItem key={company._id} value={company._id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              margin="normal"
              label="Nombre de la API"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`${api.name}_${companies.find(c => c._id === createForm.companyId)?.name || 'MiEmpresa'}`}
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Descripción personalizada"
              multiline
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe cómo usarás esta API en tu organización..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateAPI}
            variant="contained"
            disabled={createAPIMutation.isLoading}
          >
            {createAPIMutation.isLoading ? 'Creando...' : 'Crear API'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BIANDetail; 