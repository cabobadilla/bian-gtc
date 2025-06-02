import React from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid,
  Button,
  Chip,
  Avatar,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import { 
  Business as BusinessIcon,
  Api as ApiIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { useQuery } from 'react-query'
import { useParams, useNavigate } from 'react-router-dom'

import { companyService } from '../services/api'

const CompanyDetail = () => {
  const { companyId } = useParams()
  const navigate = useNavigate()

  const { data: companyData, isLoading, error } = useQuery(
    ['company-detail', companyId],
    () => companyService.getCompany(companyId)
  )

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          Error al cargar los detalles de la empresa: {error.message}
        </Alert>
      </Container>
    )
  }

  const company = companyData?.data?.company
  const userRole = companyData?.data?.userRole

  if (!company) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          Empresa no encontrada
        </Alert>
      </Container>
    )
  }

  const isAdmin = userRole === 'admin'

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="start" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar
              src={company.logo}
              sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}
            >
              <BusinessIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" gutterBottom>
                {company.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {company.description || 'Sin descripción'}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                {company.industry && (
                  <Chip label={company.industry} variant="outlined" size="small" />
                )}
                {company.size && (
                  <Chip label={company.size} variant="outlined" size="small" />
                )}
                {company.country && (
                  <Chip label={company.country} variant="outlined" size="small" />
                )}
                <Chip 
                  label={userRole} 
                  color={isAdmin ? 'primary' : 'default'}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
          
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => {
                // TODO: Navigate to company settings
              }}
            >
              Configuración
            </Button>
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ApiIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">APIs</Typography>
              </Box>
              <Typography variant="h3">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                APIs creadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Miembros</Typography>
              </Box>
              <Typography variant="h3">
                {(company.admins?.length || 0) + (company.members?.length || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usuarios con acceso
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Estado</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                Activa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Empresa operativa
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Acciones Rápidas
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gestiona las APIs y recursos de {company.name}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
              }}
              onClick={() => navigate('/bian-search')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Buscar APIs BIAN
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Encuentra APIs de referencia para usar como base
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
              }}
              onClick={() => navigate(`/companies/${companyId}/apis`)}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <ApiIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Ver APIs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestiona las APIs de esta empresa
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
              }}
              onClick={() => {
                // TODO: Navigate to create API
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <AddIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Crear API
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea una nueva API personalizada
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Company Info */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Información de la Empresa
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Slug" 
                    secondary={company.slug || 'Sin slug'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Industria" 
                    secondary={company.industry || 'No especificada'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tamaño" 
                    secondary={company.size || 'No especificado'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Próximos Pasos
              </Typography>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>🚀 Comienza a crear APIs</strong><br />
                  1. Busca APIs BIAN de referencia<br />
                  2. Personaliza según tus necesidades<br />
                  3. Genera especificaciones OpenAPI<br />
                  4. Colabora con tu equipo
                </Typography>
              </Alert>
              
              <Box mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/bian-search')}
                  startIcon={<SearchIcon />}
                >
                  Buscar APIs BIAN
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}

export default CompanyDetail 