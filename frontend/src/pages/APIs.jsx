import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService, companyService } from '../services/api';
import toast from 'react-hot-toast';

const APIs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAPI, setSelectedAPI] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Debug effect for dialog state
  useEffect(() => {
    console.log('🔧 [FRONTEND] deleteDialogOpen state changed:', deleteDialogOpen);
    console.log('🔧 [FRONTEND] selectedAPI when dialog state changed:', selectedAPI);
  }, [deleteDialogOpen, selectedAPI]);

  // Get user's companies
  const { data: companiesData } = useQuery(
    'my-companies',
    companyService.getMyCompanies
  );

  const companies = companiesData?.data?.companies || [];

  // Get APIs for all companies
  const { data: apisData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-apis', selectedCompany, statusFilter],
    queryFn: async () => {
      if (companies.length === 0) return { data: { apis: [] } };
      
      // If no company selected, get APIs from all companies
      if (!selectedCompany) {
        const allAPIs = [];
        for (const company of companies) {
          try {
            const response = await apiService.getCompanyAPIs(company._id, {
              status: statusFilter || undefined
            });
            const companyAPIs = response.data.apis.map(api => ({
              ...api,
              companyName: company.name
            }));
            allAPIs.push(...companyAPIs);
          } catch (error) {
            console.error(`Error fetching APIs for company ${company.name}:`, error);
          }
        }
        return { data: { apis: allAPIs } };
      } else {
        const response = await apiService.getCompanyAPIs(selectedCompany, {
          status: statusFilter || undefined
        });
        const companyName = companies.find(c => c._id === selectedCompany)?.name;
        return {
          data: {
            apis: response.data.apis.map(api => ({
              ...api,
              companyName
            }))
          }
        };
      }
    },
    enabled: companies.length > 0
  });

  const apis = apisData?.data?.apis || [];

  // Delete API mutation
  const deleteAPIMutation = useMutation({
    mutationFn: (apiId) => {
      console.log('🔧 [FRONTEND] deleteAPIMutation - mutationFn called with apiId:', apiId);
      return apiService.deleteAPI(apiId);
    },
    onMutate: (apiId) => {
      console.log('🔧 [FRONTEND] deleteAPIMutation - onMutate called with apiId:', apiId);
    },
    onSuccess: (data) => {
      console.log('🔧 [FRONTEND] deleteAPIMutation - onSuccess called with data:', data);
      toast.success('API eliminada exitosamente');
      setDeleteDialogOpen(false);
      setSelectedAPI(null);
      // Invalidate and refetch APIs
      queryClient.invalidateQueries(['user-apis']);
      refetch();
    },
    onError: (error) => {
      console.error('❌ [FRONTEND] deleteAPIMutation - onError called with error:', error);
      console.error('❌ [FRONTEND] Error response:', error.response);
      console.error('❌ [FRONTEND] Error data:', error.response?.data);
      toast.error(error.response?.data?.error || 'Error eliminando la API');
      setDeleteDialogOpen(false);
    },
    onSettled: (data, error) => {
      console.log('🔧 [FRONTEND] deleteAPIMutation - onSettled called with data:', data, 'error:', error);
    }
  });

  // Filter APIs by search term
  const filteredAPIs = apis.filter(api =>
    api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMenuOpen = (event, api) => {
    setAnchorEl(event.currentTarget);
    setSelectedAPI(api);
  };

  const handleMenuClose = () => {
    console.log('🔧 [FRONTEND] handleMenuClose called, deleteDialogOpen:', deleteDialogOpen);
    setAnchorEl(null);
    // Only reset selectedAPI if we're not opening the delete dialog
    if (!deleteDialogOpen) {
      console.log('🔧 [FRONTEND] Resetting selectedAPI to null');
      setSelectedAPI(null);
    } else {
      console.log('🔧 [FRONTEND] Keeping selectedAPI because delete dialog is open');
    }
  };

  const handleViewAPI = (api) => {
    navigate(`/apis/${api._id}`);
    handleMenuClose();
  };

  const handleEditAPI = (api) => {
    navigate(`/apis/${api._id}/edit`);
    handleMenuClose();
  };

  const handleDeleteAPI = (api) => {
    console.log('🔧 [FRONTEND] handleDeleteAPI called with:', api);
    setSelectedAPI(api);
    setDeleteDialogOpen(true);
    // Don't call handleMenuClose here, just close the menu
    setAnchorEl(null);
  };

  const confirmDeleteAPI = () => {
    console.log('🔧 [FRONTEND] confirmDeleteAPI called');
    console.log('🔧 [FRONTEND] selectedAPI:', selectedAPI);
    if (selectedAPI) {
      console.log('🔧 [FRONTEND] Attempting to delete API:', selectedAPI._id);
      deleteAPIMutation.mutate(selectedAPI._id);
    } else {
      console.error('❌ [FRONTEND] No selected API to delete');
    }
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

  if (companies.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          Necesitas crear una empresa antes de poder gestionar APIs.
          <Button 
            variant="contained" 
            sx={{ ml: 2 }}
            onClick={() => navigate('/companies')}
          >
            Crear Empresa
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Mis APIs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona y organiza todas tus APIs BIAN
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/bian-search')}
        >
          Crear Nueva API
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar APIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Empresa</InputLabel>
                <Select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  label="Empresa"
                >
                  <MenuItem value="">Todas las empresas</MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company._id} value={company._id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos los estados</MenuItem>
                  <MenuItem value="draft">Borrador</MenuItem>
                  <MenuItem value="review">En revisión</MenuItem>
                  <MenuItem value="published">Publicado</MenuItem>
                  <MenuItem value="deprecated">Obsoleto</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* APIs List */}
      {isLoading ? (
        <Box textAlign="center" py={4}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Cargando APIs...
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error cargando las APIs. Intenta recargar la página.
        </Alert>
      ) : filteredAPIs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {apis.length === 0 ? 'No tienes APIs creadas' : 'No se encontraron APIs'}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {apis.length === 0 
                ? 'Comienza creando tu primera API basada en estándares BIAN'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </Typography>
            {apis.length === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/bian-search')}
              >
                Crear Primera API
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredAPIs.map((api) => (
            <Grid item xs={12} md={6} lg={4} key={api._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 4,
                    cursor: 'pointer'
                  }
                }}
                onClick={() => handleViewAPI(api)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" component="h3" noWrap>
                      {api.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, api);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {api.description || 'Sin descripción'}
                  </Typography>
                  
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Chip 
                      label={api.status}
                      color={getStatusColor(api.status)}
                      size="small"
                    />
                    <Chip 
                      icon={getVisibilityIcon(api.visibility)}
                      label={api.visibility}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  
                  {api.tags && api.tags.length > 0 && (
                    <Box display="flex" gap={0.5} mb={2} flexWrap="wrap">
                      {api.tags.slice(0, 3).map((tag, index) => (
                        <Chip 
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {api.tags.length > 3 && (
                        <Chip 
                          label={`+${api.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary">
                    {api.companyName} • v{api.currentVersion}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          console.log('🔧 [FRONTEND] Ver detalles clicked for API:', selectedAPI?._id);
          handleViewAPI(selectedAPI);
        }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Ver detalles
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('🔧 [FRONTEND] Editar clicked for API:', selectedAPI?._id);
          handleEditAPI(selectedAPI);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('🔧 [FRONTEND] Eliminar menu item clicked for API:', selectedAPI?._id);
          handleDeleteAPI(selectedAPI);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          console.log('🔧 [FRONTEND] Delete dialog closed');
          setDeleteDialogOpen(false);
          setSelectedAPI(null);
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Eliminar API"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que quieres eliminar la API "{selectedAPI?.name}"? 
            Esta acción no se puede deshacer y se perderán todos los datos asociados.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              console.log('🔧 [FRONTEND] Cancelar button clicked');
              setDeleteDialogOpen(false);
              setSelectedAPI(null);
            }}
            disabled={deleteAPIMutation.isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              console.log('🔧 [FRONTEND] Eliminar button clicked in dialog');
              confirmDeleteAPI();
            }}
            color="error"
            variant="contained"
            disabled={deleteAPIMutation.isLoading}
            autoFocus
          >
            {deleteAPIMutation.isLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default APIs; 