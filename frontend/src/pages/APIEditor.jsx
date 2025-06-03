import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tab,
  Tabs,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const APIEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [addTagOpen, setAddTagOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
    visibility: 'private',
    category: 'other',
    tags: []
  });

  // OpenAPI spec state
  const [specData, setSpecData] = useState('');
  const [specError, setSpecError] = useState('');

  // Schema management state
  const [schemas, setSchemas] = useState({});
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [editingSchema, setEditingSchema] = useState(null);

  // Get API details
  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['api-detail', id],
    queryFn: () => apiService.getAPI(id),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      const api = data.data.api;
      
      console.log('🔧 [API EDITOR] Full API response received:', data);
      console.log('🔧 [API EDITOR] API object structure:', {
        apiId: id,
        apiName: api.name,
        apiDescription: api.description,
        apiStatus: api.status,
        apiVisibility: api.visibility,
        apiCategory: api.category,
        apiTags: api.tags,
        currentVersion: api.currentVersion,
        versionsLength: api.versions?.length,
        currentVersionSpec: api.currentVersionSpec,
        currentVersionSpecType: typeof api.currentVersionSpec,
        currentVersionSpecKeys: api.currentVersionSpec ? Object.keys(api.currentVersionSpec) : null,
        firstVersionOpenApiSpec: api.versions?.[0]?.openApiSpec,
        allKeys: Object.keys(api)
      });
      
      setFormData({
        name: api.name || '',
        description: api.description || '',
        status: api.status || 'draft',
        visibility: api.visibility || 'private',
        category: api.category || 'other',
        tags: api.tags || []
      });
      
      // Set OpenAPI spec - try multiple sources
      let specToSet = '';
      
      if (api.currentVersionSpec) {
        specToSet = JSON.stringify(api.currentVersionSpec, null, 2);
        console.log('🔧 [API EDITOR] Using currentVersionSpec, length:', specToSet.length);
      } else if (api.versions && api.versions.length > 0 && api.versions[0].openApiSpec) {
        specToSet = JSON.stringify(api.versions[0].openApiSpec, null, 2);
        console.log('🔧 [API EDITOR] Using first version openApiSpec, length:', specToSet.length);
      } else {
        console.log('❌ [API EDITOR] No OpenAPI spec found for this API');
        specToSet = '';
      }
      
      setSpecData(specToSet);
    }
  });

  const api = apiData?.data?.api;

  // Additional effect to handle spec loading after API data changes
  useEffect(() => {
    if (api) {
      console.log('🔧 [API EDITOR] useEffect - API data changed, re-checking spec:', {
        hasCurrentVersionSpec: !!api.currentVersionSpec,
        hasVersions: !!api.versions,
        versionsLength: api.versions?.length,
        currentSpecData: specData.length
      });
      
      // Only update if we don't have spec data yet
      if (!specData || specData.trim() === '') {
        let specToSet = '';
        
        if (api.currentVersionSpec) {
          specToSet = JSON.stringify(api.currentVersionSpec, null, 2);
          console.log('🔧 [API EDITOR] useEffect - Setting currentVersionSpec, length:', specToSet.length);
        } else if (api.versions && api.versions.length > 0 && api.versions[0].openApiSpec) {
          specToSet = JSON.stringify(api.versions[0].openApiSpec, null, 2);
          console.log('🔧 [API EDITOR] useEffect - Setting first version openApiSpec, length:', specToSet.length);
        }
        
        if (specToSet) {
          setSpecData(specToSet);
        }
      }
    }
  }, [api, specData]);

  // Extract schemas from OpenAPI spec
  useEffect(() => {
    if (specData) {
      try {
        const spec = JSON.parse(specData);
        if (spec.components && spec.components.schemas) {
          setSchemas(spec.components.schemas);
          console.log('🔧 [API EDITOR] Schemas extracted:', Object.keys(spec.components.schemas));
        }
      } catch (error) {
        console.error('Error parsing spec for schemas:', error);
      }
    }
  }, [specData]);

  // Schema management functions
  const handleSchemaEdit = (schemaName) => {
    setSelectedSchema(schemaName);
    setEditingSchema(JSON.stringify(schemas[schemaName], null, 2));
    setSchemaDialogOpen(true);
  };

  const handleSchemaCreate = () => {
    if (newSchemaName.trim()) {
      console.log('🔧 [API EDITOR] Creating new schema:', newSchemaName);
      
      const newSchema = {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier'
          }
        },
        required: ['id']
      };
      
      const updatedSchemas = {
        ...schemas,
        [newSchemaName]: newSchema
      };
      
      console.log('🔧 [API EDITOR] Updated schemas:', Object.keys(updatedSchemas));
      
      setSchemas(updatedSchemas);
      updateSpecWithSchemas(updatedSchemas);
      setNewSchemaName('');
      setUnsavedChanges(true);
    }
  };

  const handleSchemaSave = () => {
    console.log('🔧 [API EDITOR] Saving schema:', selectedSchema);
    console.log('🔧 [API EDITOR] Schema content length:', editingSchema?.length || 0);
    
    try {
      const updatedSchema = JSON.parse(editingSchema);
      console.log('🔧 [API EDITOR] Parsed schema keys:', Object.keys(updatedSchema));
      
      const updatedSchemas = {
        ...schemas,
        [selectedSchema]: updatedSchema
      };
      
      console.log('🔧 [API EDITOR] All schemas after update:', Object.keys(updatedSchemas));
      
      setSchemas(updatedSchemas);
      updateSpecWithSchemas(updatedSchemas);
      setSchemaDialogOpen(false);
      setUnsavedChanges(true);
      toast.success('Schema actualizado');
    } catch (error) {
      console.error('❌ [API EDITOR] Schema JSON parse error:', error);
      toast.error('JSON inválido en el schema');
    }
  };

  const handleSchemaDelete = (schemaName) => {
    const updatedSchemas = { ...schemas };
    delete updatedSchemas[schemaName];
    
    setSchemas(updatedSchemas);
    updateSpecWithSchemas(updatedSchemas);
    setUnsavedChanges(true);
    toast.success('Schema eliminado');
  };

  const updateSpecWithSchemas = (updatedSchemas) => {
    console.log('🔧 [API EDITOR] Updating spec with schemas:', Object.keys(updatedSchemas));
    console.log('🔧 [API EDITOR] Current spec data length before update:', specData.length);
    
    try {
      const spec = JSON.parse(specData);
      if (!spec.components) spec.components = {};
      spec.components.schemas = updatedSchemas;
      
      const updatedSpecData = JSON.stringify(spec, null, 2);
      console.log('🔧 [API EDITOR] Updated spec data length:', updatedSpecData.length);
      console.log('🔧 [API EDITOR] Schemas in updated spec:', Object.keys(spec.components.schemas));
      
      setSpecData(updatedSpecData);
    } catch (error) {
      console.error('❌ [API EDITOR] Error updating spec with schemas:', error);
    }
  };

  // Update basic API info
  const updateAPIMutation = useMutation({
    mutationFn: (data) => apiService.updateAPI(id, data),
    onSuccess: () => {
      toast.success('API actualizada exitosamente');
      setUnsavedChanges(false);
      queryClient.invalidateQueries(['api-detail', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Error actualizando la API');
    }
  });

  // Update API specification
  const updateSpecMutation = useMutation({
    mutationFn: (data) => apiService.updateAPISpec(id, data),
    onSuccess: () => {
      toast.success('Especificación actualizada exitosamente');
      setUnsavedChanges(false);
      queryClient.invalidateQueries(['api-detail', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Error actualizando la especificación');
    }
  });

  // Handle form changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  // Handle spec changes
  const handleSpecChange = (value) => {
    setSpecData(value);
    setUnsavedChanges(true);
    
    // Validate JSON
    try {
      JSON.parse(value);
      setSpecError('');
    } catch (error) {
      setSpecError('JSON inválido: ' + error.message);
    }
  };

  // Save basic info
  const handleSaveBasicInfo = () => {
    console.log('🔧 [API EDITOR] Attempting to save basic info:', formData);
    console.log('🔧 [API EDITOR] Current API data:', api);
    
    // Validate required fields
    if (!formData.name || formData.name.trim().length === 0) {
      toast.error('El nombre de la API es requerido');
      return;
    }
    
    // Always include required fields (like name) and any changed fields
    const updatedFields = {
      name: formData.name, // Always include name as it's required by backend
    };
    
    // Include other fields regardless of whether they changed
    // This ensures we send all form data to maintain consistency
    if (formData.description !== undefined) {
      updatedFields.description = formData.description;
    }
    if (formData.status !== undefined) {
      updatedFields.status = formData.status;
    }
    if (formData.visibility !== undefined) {
      updatedFields.visibility = formData.visibility;
    }
    if (formData.category !== undefined) {
      updatedFields.category = formData.category;
    }
    if (formData.tags !== undefined) {
      updatedFields.tags = formData.tags;
    }
    
    console.log('🔧 [API EDITOR] Sending update fields:', updatedFields);
    
    updateAPIMutation.mutate(updatedFields);
  };

  // Save specification
  const handleSaveSpec = () => {
    console.log('🔧 [API EDITOR] Attempting to save specification');
    console.log('🔧 [API EDITOR] Current spec data length:', specData.length);
    
    try {
      const spec = JSON.parse(specData);
      console.log('🔧 [API EDITOR] Parsed spec keys:', Object.keys(spec));
      console.log('🔧 [API EDITOR] Has components:', !!spec.components);
      console.log('🔧 [API EDITOR] Has schemas:', !!(spec.components?.schemas));
      console.log('🔧 [API EDITOR] Schemas count:', spec.components?.schemas ? Object.keys(spec.components.schemas).length : 0);
      console.log('🔧 [API EDITOR] Schema names:', spec.components?.schemas ? Object.keys(spec.components.schemas) : []);
      
      updateSpecMutation.mutate({
        spec,
        changelog: 'Especificación actualizada desde el editor'
      });
    } catch (error) {
      console.error('❌ [API EDITOR] JSON parse error:', error);
      toast.error('JSON inválido. Por favor corrige los errores antes de guardar.');
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleFormChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
      setAddTagOpen(false);
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    handleFormChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Parse spec for Swagger UI
  const getParsedSpec = () => {
    try {
      return JSON.parse(specData);
    } catch (error) {
      return null;
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando editor...
        </Typography>
      </Container>
    );
  }

  if (error || !api) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Error cargando la API para editar
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
          onClick={() => navigate(`/apis/${id}`)}
          sx={{ mb: 2 }}
        >
          Volver a detalles
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Editar API: {api.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Personaliza la información y especificación de tu API
            </Typography>
          </Box>
          
          {unsavedChanges && (
            <Alert severity="warning" sx={{ ml: 2 }}>
              Tienes cambios sin guardar
            </Alert>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Información Básica" icon={<DescriptionIcon />} />
          <Tab label="Especificación OpenAPI" icon={<CodeIcon />} />
          <Tab label="Schemas de Datos" icon={<SettingsIcon />} />
          <Tab label="Vista Previa Swagger" icon={<PreviewIcon />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información Básica de la API
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre de la API"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    label="Categoría"
                  >
                    <MenuItem value="customer-management">Gestión de Clientes</MenuItem>
                    <MenuItem value="account-management">Gestión de Cuentas</MenuItem>
                    <MenuItem value="payment-processing">Procesamiento de Pagos</MenuItem>
                    <MenuItem value="lending">Préstamos</MenuItem>
                    <MenuItem value="risk-management">Gestión de Riesgos</MenuItem>
                    <MenuItem value="compliance">Cumplimiento</MenuItem>
                    <MenuItem value="analytics">Analíticas</MenuItem>
                    <MenuItem value="other">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    label="Estado"
                  >
                    <MenuItem value="draft">Borrador</MenuItem>
                    <MenuItem value="review">En Revisión</MenuItem>
                    <MenuItem value="published">Publicado</MenuItem>
                    <MenuItem value="deprecated">Obsoleto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Visibilidad</InputLabel>
                  <Select
                    value={formData.visibility}
                    onChange={(e) => handleFormChange('visibility', e.target.value)}
                    label="Visibilidad"
                  >
                    <MenuItem value="private">Privado</MenuItem>
                    <MenuItem value="company">Empresa</MenuItem>
                    <MenuItem value="public">Público</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Etiquetas
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  <Chip
                    label="+ Agregar etiqueta"
                    onClick={() => setAddTagOpen(true)}
                    color="primary"
                    variant="outlined"
                    icon={<AddIcon />}
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveBasicInfo}
                disabled={updateAPIMutation.isLoading}
              >
                {updateAPIMutation.isLoading ? 'Guardando...' : 'Guardar Información'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Especificación OpenAPI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Edita la especificación OpenAPI de tu API. Asegúrate de que el JSON sea válido.
            </Typography>
            
            {specError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {specError}
              </Alert>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={20}
              value={specData}
              onChange={(e) => handleSpecChange(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }
              }}
            />
            
            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSpec}
                disabled={updateSpecMutation.isLoading || !!specError}
              >
                {updateSpecMutation.isLoading ? 'Guardando...' : 'Guardar Especificación'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setTabValue(2)}
                disabled={!!specError}
              >
                Vista Previa
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Schemas de Datos BIAN
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Gestiona los modelos de datos de tu API. Puedes editar los schemas por defecto de BIAN y agregar campos personalizados.
            </Typography>
            
            {/* Add new schema */}
            <Box mb={3}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    label="Nombre del nuevo schema"
                    value={newSchemaName}
                    onChange={(e) => setNewSchemaName(e.target.value)}
                    placeholder="Ej: CustomerProfile, TransactionData"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleSchemaCreate}
                    disabled={!newSchemaName.trim()}
                    fullWidth
                  >
                    Crear Schema
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            {/* Schemas list */}
            {Object.keys(schemas).length > 0 ? (
              <Grid container spacing={2}>
                {Object.entries(schemas).map(([schemaName, schema]) => (
                  <Grid item xs={12} md={6} key={schemaName}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" color="primary">
                            {schemaName}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleSchemaEdit(schemaName)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleSchemaDelete(schemaName)}
                            >
                              Eliminar
                            </Button>
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Tipo: {schema.type || 'object'}
                        </Typography>
                        
                        {schema.description && (
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {schema.description}
                          </Typography>
                        )}
                        
                        {schema.properties && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Propiedades ({Object.keys(schema.properties).length}):
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {Object.keys(schema.properties).slice(0, 5).map((prop) => (
                                <Chip
                                  key={prop}
                                  label={prop}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                              {Object.keys(schema.properties).length > 5 && (
                                <Chip
                                  label={`+${Object.keys(schema.properties).length - 5} más`}
                                  size="small"
                                  color="primary"
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">
                No se encontraron schemas en la especificación OpenAPI. 
                Los schemas definen la estructura de los datos que tu API maneja.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vista Previa Swagger UI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Visualiza y prueba tu API con Swagger UI
            </Typography>
            
            {getParsedSpec() ? (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <SwaggerUI spec={getParsedSpec()} />
              </Paper>
            ) : (
              <Alert severity="warning">
                No se puede mostrar la vista previa. Verifica que la especificación OpenAPI sea válida.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Tag Dialog */}
      <Dialog open={addTagOpen} onClose={() => setAddTagOpen(false)}>
        <DialogTitle>Agregar Etiqueta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nueva etiqueta"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTagOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddTag} variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schema Edit Dialog */}
      <Dialog 
        open={schemaDialogOpen} 
        onClose={() => setSchemaDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Editar Schema: {selectedSchema}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Edita la estructura JSON del schema. Puedes agregar nuevas propiedades, 
            cambiar tipos de datos y definir validaciones.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={editingSchema || ''}
            onChange={(e) => setEditingSchema(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchemaDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSchemaSave} variant="contained">
            Guardar Schema
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default APIEditor; 