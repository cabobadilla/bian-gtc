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
  TextField
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
  Share as ShareIcon
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
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/apis/${id}/edit`)}
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

      {tabValue === 3 && (
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