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
  Add as AddIcon
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

  // Get API details
  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['api-detail', id],
    queryFn: () => apiService.getAPI(id),
    onSuccess: (data) => {
      const api = data.data.api;
      setFormData({
        name: api.name,
        description: api.description || '',
        status: api.status,
        visibility: api.visibility,
        category: api.category,
        tags: api.tags || []
      });
      
      // Set OpenAPI spec
      if (api.currentVersionSpec) {
        setSpecData(JSON.stringify(api.currentVersionSpec, null, 2));
      }
    }
  });

  const api = apiData?.data?.api;

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
    updateAPIMutation.mutate(formData);
  };

  // Save specification
  const handleSaveSpec = () => {
    try {
      const spec = JSON.parse(specData);
      updateSpecMutation.mutate({
        spec,
        changelog: 'Especificación actualizada desde el editor'
      });
    } catch (error) {
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
    </Container>
  );
};

export default APIEditor; 