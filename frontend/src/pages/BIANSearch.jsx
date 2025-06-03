import React, { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper
} from '@mui/material'
import { 
  Search as SearchIcon, 
  Translate as TranslateIcon,
  Psychology as AIIcon,
  Layers as LayersIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material'
import { useQuery, useMutation } from 'react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { bianService, companyService } from '../services/api'

const BIANSearch = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    serviceDomain: '',
    complexity: '',
    language: 'en'
  })
  const [searchParams, setSearchParams] = useState(null)

  // Check if user has companies
  const { data: companiesData, isLoading: companiesLoading } = useQuery(
    'my-companies',
    companyService.getMyCompanies
  )

  const companies = companiesData?.data?.companies || []
  const hasCompanies = companies.length > 0

  // Get service domains for filter
  const { data: domainsData } = useQuery(
    'bian-domains',
    bianService.getServiceDomains,
    {
      enabled: (companiesData?.data?.companies?.length || 0) > 0
    }
  )

  // Get popular APIs
  const { data: popularAPIs } = useQuery(
    'bian-popular',
    () => bianService.getPopularAPIs(6),
    {
      enabled: (companiesData?.data?.companies?.length || 0) > 0
    }
  )

  // Search APIs
  const { 
    data: searchResults, 
    isLoading: isSearching, 
    error: searchError 
  } = useQuery(
    ['bian-search', searchParams],
    () => bianService.searchAPIs(searchParams),
    {
      enabled: !!searchParams && (companiesData?.data?.companies?.length || 0) > 0,
      keepPreviousData: true
    }
  )

  const handleSearch = () => {
    if (!hasCompanies) {
      toast.error('Necesitas crear una empresa antes de buscar APIs')
      return
    }
    
    const params = {
      q: searchQuery,
      ...filters
    }
    setSearchParams(params)
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAPIClick = (api) => {
    navigate(`/bian/${api._id}`, { state: { api } })
  }

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'low': return 'success'
      case 'medium': return 'warning'
      case 'high': return 'error'
      default: return 'default'
    }
  }

  const APICard = ({ api, showPopularity = false }) => (
    <Card 
      sx={{ 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
      onClick={() => handleAPIClick(api)}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
            {api.name}
          </Typography>
          <Chip 
            label={api.complexity}
            color={getComplexityColor(api.complexity)}
            size="small"
          />
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 2, minHeight: '2.5em' }}
        >
          {api.localizedDescription || api.description}
        </Typography>
        
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip 
            icon={<LayersIcon />}
            label={api.serviceDomain}
            variant="outlined"
            size="small"
          />
          {showPopularity && (
            <Chip 
              label={`${api.popularity} usos`}
              variant="outlined"
              size="small"
              color="primary"
            />
          )}
        </Box>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          {api.serviceOperations?.slice(0, 3).map((op, index) => (
            <Chip 
              key={index}
              label={`${op.method} ${op.name}`}
              size="small"
              variant="outlined"
            />
          ))}
          {api.serviceOperations?.length > 3 && (
            <Chip 
              label={`+${api.serviceOperations.length - 3} más`}
              size="small"
              variant="outlined"
              color="secondary"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  )

  // Loading state
  if (companiesLoading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  // No companies state
  if (!hasCompanies) {
    return (
      <Container maxWidth="lg">
        <Box mb={4}>
          <Typography variant="h4" gutterBottom>
            🔍 Buscar APIs BIAN de Referencia
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Encuentra APIs BIAN estándar para usar como base en tus proyectos
          </Typography>
        </Box>

        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            Necesitas una empresa para continuar
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Para buscar y usar APIs BIAN de referencia, primero necesitas crear una empresa. 
            Las APIs se organizan por empresa para mejor gestión de permisos y colaboración en equipo.
          </Typography>

          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => navigate('/companies')}
            >
              Crear Empresa
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/dashboard')}
            >
              Ir al Dashboard
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>¿Por qué necesito una empresa?</strong><br />
              • Las APIs se organizan y gestionan por empresa<br />
              • Permite control de acceso y colaboración en equipo<br />
              • Facilita la gestión de múltiples proyectos<br />
              • Cumple con estándares de organización empresarial
            </Typography>
          </Alert>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          🔍 Buscar APIs BIAN de Referencia
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Encuentra APIs BIAN estándar para usar como base en tus proyectos
        </Typography>
        
        {/* Company indicator */}
        <Box mt={2}>
          <Chip 
            icon={<BusinessIcon />}
            label={`${companies.length} empresa${companies.length > 1 ? 's' : ''} disponible${companies.length > 1 ? 's' : ''}`}
            color="success"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar por nombre, función o dominio de servicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Dominio</InputLabel>
                <Select
                  value={filters.serviceDomain}
                  label="Dominio"
                  onChange={(e) => handleFilterChange('serviceDomain', e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {domainsData?.data?.domains?.map((domain) => (
                    <MenuItem key={domain.name} value={domain.name}>
                      {domain.name} ({domain.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Complejidad</InputLabel>
                <Select
                  value={filters.complexity}
                  label="Complejidad"
                  onChange={(e) => handleFilterChange('complexity', e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="low">Baja</MenuItem>
                  <MenuItem value="medium">Media</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button 
                fullWidth
                variant="contained" 
                onClick={handleSearch}
                disabled={isSearching}
                startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                Buscar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Popular APIs Section */}
      {!searchParams && popularAPIs?.data?.apis && (
        <Box mb={4}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🔥 APIs Más Populares
          </Typography>
          <Grid container spacing={2}>
            {popularAPIs.data.apis.map((api) => (
              <Grid item xs={12} md={6} lg={4} key={api._id}>
                <APICard api={api} showPopularity />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Search Results */}
      {searchParams && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              Resultados de búsqueda
            </Typography>
            {searchResults?.data && (
              <Typography variant="body2" color="text.secondary">
                {searchResults.data.count} resultado(s) encontrado(s)
              </Typography>
            )}
          </Box>

          {isSearching && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {searchError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Error al buscar APIs: {searchError.message}
            </Alert>
          )}

          {searchResults?.data?.results && (
            <Grid container spacing={3}>
              {searchResults.data.results.map((api) => (
                <Grid item xs={12} md={6} lg={4} key={api._id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                    onClick={() => handleAPIClick(api)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
                          {api.name}
                        </Typography>
                        <Chip 
                          label={api.complexity}
                          color={getComplexityColor(api.complexity)}
                          size="small"
                        />
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 2, minHeight: '2.5em' }}
                      >
                        {api.localizedDescription || api.description}
                      </Typography>
                      
                      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                        <Chip 
                          icon={<LayersIcon />}
                          label={api.serviceDomain}
                          variant="outlined"
                          size="small"
                        />
                        {api.popularity && (
                          <Chip 
                            label={`${api.popularity} usos`}
                            variant="outlined"
                            size="small"
                            color="primary"
                          />
                        )}
                      </Box>
                      
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {api.serviceOperations?.slice(0, 3).map((op, index) => (
                          <Chip 
                            key={index}
                            label={`${op.method} ${op.name}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {api.serviceOperations?.length > 3 && (
                          <Chip 
                            label={`+${api.serviceOperations.length - 3} más`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {searchResults?.data?.results?.length === 0 && !isSearching && (
            <Alert severity="info" sx={{ textAlign: 'center' }}>
              No se encontraron APIs que coincidan con tu búsqueda. 
              Intenta con otros términos o filtros.
            </Alert>
          )}
        </Box>
      )}

      {/* Quick Actions */}
      {!searchParams && (
        <Box mt={6}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            💡 Sugerencias de búsqueda
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {[
              'Customer Management',
              'Payment Processing',
              'Account Management',
              'Risk Assessment',
              'Compliance',
              'Analytics'
            ].map((suggestion) => (
              <Chip 
                key={suggestion}
                label={suggestion}
                variant="outlined"
                clickable
                onClick={() => {
                  setSearchQuery(suggestion)
                  setSearchParams({ q: suggestion, ...filters })
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Container>
  )
}

export default BIANSearch 