import React from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper
} from '@mui/material'
import { 
  Api, 
  Business, 
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Code as CodeIcon
} from '@mui/icons-material'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { userService, companyService } from '../services/api'

const Dashboard = () => {
  const navigate = useNavigate()
  
  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    userService.getDashboard
  )

  const { data: companiesData } = useQuery(
    'my-companies',
    companyService.getMyCompanies
  )

  const stats = dashboardData?.data?.stats || {}
  const companies = companiesData?.data?.companies || []
  const hasCompanies = companies.length > 0

  const nextSteps = [
    {
      id: 'create-company',
      title: 'Crear una empresa',
      description: 'Las APIs se organizan por empresa',
      completed: hasCompanies,
      action: () => navigate('/companies'),
      buttonText: hasCompanies ? 'Ver empresas' : 'Crear empresa'
    },
    {
      id: 'search-bian',
      title: 'Buscar APIs BIAN de referencia',
      description: 'Encuentra APIs estándar para usar como base',
      completed: false,
      disabled: !hasCompanies,
      action: () => navigate('/bian-search'),
      buttonText: 'Buscar APIs BIAN'
    },
    {
      id: 'create-api',
      title: 'Crear tu primera API',
      description: 'Personaliza y crea APIs basadas en estándares BIAN',
      completed: false,
      disabled: !hasCompanies,
      action: () => navigate('/apis'),
      buttonText: 'Crear API'
    }
  ]

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido a tu centro de gestión de APIs BIAN
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Api color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">APIs</Typography>
              </Box>
              <Typography variant="h3">
                {isLoading ? '-' : stats.apis || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total APIs creadas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Business color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Empresas</Typography>
              </Box>
              <Typography variant="h3">
                {isLoading ? '-' : companies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Organizaciones donde participas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DashboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Rol</Typography>
              </Box>
              <Typography variant="h3" sx={{ textTransform: 'capitalize' }}>
                {isLoading ? '-' : stats.role || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tu nivel de acceso
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Welcome Message & Quick Actions */}
      {!hasCompanies ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            ¡Bienvenido al Generador de APIs BIAN! 🎉
          </Typography>
          <Typography variant="body2">
            Para comenzar a crear APIs BIAN personalizadas, primero necesitas crear una empresa. 
            Las APIs se organizan y gestionan dentro de empresas para mejor control de acceso y colaboración.
          </Typography>
        </Alert>
      ) : (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'success.50', borderLeft: 4, borderColor: 'success.main' }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'success.dark' }}>
            ✅ ¡Configuración inicial completa!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ya tienes {companies.length} empresa{companies.length > 1 ? 's' : ''} configurada{companies.length > 1 ? 's' : ''}. 
            Ahora puedes buscar APIs BIAN de referencia y crear tus propias APIs personalizadas.
          </Typography>
        </Paper>
      )}

      {/* Next Steps */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Siguientes Pasos
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Sigue estos pasos para aprovechar al máximo el generador de APIs BIAN.
        </Typography>

        <Grid container spacing={2}>
          {nextSteps.map((step, index) => (
            <Grid item xs={12} md={4} key={step.id}>
              <Card 
                sx={{ 
                  opacity: step.disabled ? 0.6 : 1,
                  transition: 'all 0.2s',
                  ...(step.completed && {
                    borderColor: 'success.main',
                    borderWidth: 2,
                    borderStyle: 'solid'
                  }),
                  '&:hover': step.disabled ? {} : {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="start" gap={2} mb={2}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: step.completed ? 'success.main' : step.disabled ? 'grey.300' : 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {step.completed ? <CheckIcon /> : index + 1}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {step.description}
                      </Typography>
                    </Box>
                  </Box>

                  {step.completed && (
                    <Chip 
                      label="Completado" 
                      color="success" 
                      size="small" 
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Button
                    fullWidth
                    variant={step.completed ? "outlined" : "contained"}
                    onClick={step.action}
                    disabled={step.disabled}
                    size="small"
                  >
                    {step.buttonText}
                  </Button>

                  {step.disabled && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Primero completa el paso anterior
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Companies Quick View */}
      {hasCompanies && (
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Mis Empresas
          </Typography>
          <Grid container spacing={2}>
            {companies.slice(0, 3).map((company) => (
              <Grid item xs={12} md={4} key={company._id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 }
                  }}
                  onClick={() => navigate(`/companies/${company._id}`)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {company.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {company.industry || 'Sin industria definida'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {companies.length > 3 && (
              <Grid item xs={12} md={4}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => navigate('/companies')}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      +{companies.length - 3} más
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ver todas las empresas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* APIs Quick View */}
      {hasCompanies && stats.totalAPIs > 0 && (
        <Box mt={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">
              Mis APIs Recientes
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/apis')}
              size="small"
            >
              Ver todas las APIs
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Accede rápidamente a tus APIs más recientes
          </Typography>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CodeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {stats.totalAPIs} API{stats.totalAPIs > 1 ? 's' : ''} creada{stats.totalAPIs > 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Gestiona y organiza todas tus APIs BIAN
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/apis')}
                startIcon={<CodeIcon />}
              >
                Ver Mis APIs
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}
    </Container>
  )
}

export default Dashboard 