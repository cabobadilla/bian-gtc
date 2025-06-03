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
  Paper,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
  Lightbulb as LightbulbIcon,
  SmartToy as SmartToyIcon,
  Database as DatabaseIcon,
  AutoAwesome as AutoAwesomeIcon,
  Insights as InsightsIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
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
    language: 'es'
  })
  const [searchParams, setSearchParams] = useState(null)
  const [showInterpretation, setShowInterpretation] = useState(false)

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
    () => bianService.searchAPIs(searchParams.q, searchParams),
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
    setShowInterpretation(true)
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

  const getSourceInfo = (source) => {
    switch (source) {
      case 'ai-intelligent':
        return {
          icon: <SmartToyIcon />,
          color: 'primary',
          label: 'IA Inteligente',
          description: 'Generado por AI con interpretación de lenguaje natural'
        }
      case 'database':
        return {
          icon: <DatabaseIcon />,
          color: 'success',
          label: 'Base de Datos',
          description: 'APIs almacenadas en la base de datos BIAN'
        }
      case 'examples':
        return {
          icon: <TrendingUpIcon />,
          color: 'info',
          label: 'Ejemplos Populares',
          description: 'APIs de ejemplo más populares'
        }
      case 'fallback-enhanced':
        return {
          icon: <AutoAwesomeIcon />,
          color: 'warning',
          label: 'Sugerencias Contextuales',
          description: 'Sugerencias basadas en el contexto de búsqueda'
        }
      default:
        return {
          icon: <CodeIcon />,
          color: 'default',
          label: 'Estándar',
          description: 'Resultado estándar'
        }
    }
  }

  const renderSearchInterpretation = () => {
    if (!searchResults?.data?.interpretation) return null

    const interpretation = searchResults.data.interpretation

    return (
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <InsightsIcon color="primary" />
            <Typography variant="h6">Interpretación de la Búsqueda</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Consulta Original
                </Typography>
                <Typography variant="body2">
                  "{interpretation.query}"
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Intención Detectada
                </Typography>
                <Typography variant="body2">
                  {interpretation.intent}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                <Typography variant="subtitle2" color="info.main" gutterBottom>
                  Dominio BIAN Identificado
                </Typography>
                <Typography variant="body2">
                  {interpretation.domain}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  Palabras Clave
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {interpretation.keywords?.map((keyword, index) => (
                    <Chip 
                      key={index} 
                      label={keyword} 
                      size="small" 
                      variant="outlined"
                      color="warning"
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    )
  }

  const renderSourceBadge = (source) => {
    const sourceInfo = getSourceInfo(source)
    
    return (
      <Chip
        icon={sourceInfo.icon}
        label={sourceInfo.label}
        color={sourceInfo.color}
        variant="outlined"
        size="small"
        title={sourceInfo.description}
      />
    )
  }

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
          🔍 Búsqueda Inteligente de APIs BIAN
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Busca APIs BIAN usando lenguaje natural. Nuestra IA interpreta tu consulta y encuentra las APIs más relevantes.
        </Typography>
        
        {/* Company indicator */}
        <Box mt={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Chip 
            icon={<BusinessIcon />}
            label={`${companies.length} empresa${companies.length > 1 ? 's' : ''} disponible${companies.length > 1 ? 's' : ''}`}
            color="success"
            variant="outlined"
          />
          <Chip 
            icon={<SmartToyIcon />}
            label="Búsqueda potenciada por IA"
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="end">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="¿Qué tipo de API necesitas?"
              placeholder="Ej: gestión de perfiles de clientes, procesamiento de pagos, consulta de saldos..."
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
              helperText="Describe en lenguaje natural lo que necesitas"
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
                <MenuItem value="Customer Management">Customer Management</MenuItem>
                <MenuItem value="Account Management">Account Management</MenuItem>
                <MenuItem value="Payment Order">Payment Order</MenuItem>
                <MenuItem value="Risk Assessment">Risk Assessment</MenuItem>
                <MenuItem value="Compliance">Compliance</MenuItem>
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
              size="large"
              onClick={handleSearch}
              disabled={isSearching}
              startIcon={isSearching ? <CircularProgress size={20} /> : <AIIcon />}
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </Grid>
        </Grid>

        {/* Language toggle */}
        <Box mt={2} display="flex" gap={1} alignItems="center">
          <TranslateIcon color="action" />
          <Typography variant="body2" color="text.secondary">
            Idioma:
          </Typography>
          <Chip
            label="Español"
            variant={filters.language === 'es' ? 'filled' : 'outlined'}
            onClick={() => handleFilterChange('language', 'es')}
            size="small"
            clickable
          />
          <Chip
            label="English"
            variant={filters.language === 'en' ? 'filled' : 'outlined'}
            onClick={() => handleFilterChange('language', 'en')}
            size="small"
            clickable
          />
        </Box>
      </Paper>

      {/* Search Results */}
      {searchResults && (
        <Box>
          {/* Results Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h5">
                Resultados de búsqueda
              </Typography>
              {renderSourceBadge(searchResults.data.source)}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {searchResults.data.count} resultado{searchResults.data.count !== 1 ? 's' : ''} encontrado{searchResults.data.count !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {/* Search Interpretation */}
          {renderSearchInterpretation()}

          {/* Search note */}
          {searchResults.data.note && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <InfoIcon />
                <Typography variant="body2">
                  {searchResults.data.note}
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Results Grid */}
          <Grid container spacing={3}>
            {searchResults.data.results.map((api) => (
              <Grid item xs={12} md={6} lg={4} key={api._id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3
                    }
                  }}
                  onClick={() => handleAPIClick(api)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="div" sx={{ flexGrow: 1, wordWrap: 'break-word' }}>
                        {api.name}
                      </Typography>
                      <Chip
                        label={api.complexity}
                        color={getComplexityColor(api.complexity)}
                        size="small"
                        sx={{ ml: 1, flexShrink: 0 }}
                      />
                    </Box>
                    
                    <Chip 
                      icon={<LayersIcon />}
                      label={api.serviceDomain}
                      variant="outlined"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {api.localizedDescription || api.description}
                    </Typography>
                    
                    {/* Service Operations */}
                    {api.serviceOperations && api.serviceOperations.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary">
                          Operaciones principales:
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                          {api.serviceOperations.slice(0, 3).map((op, index) => (
                            <Chip 
                              key={index}
                              label={`${op.method} ${op.name}`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                          {api.serviceOperations.length > 3 && (
                            <Chip 
                              label={`+${api.serviceOperations.length - 3} más`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                    
                    {/* Tags */}
                    {api.tags && api.tags.length > 0 && (
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {api.tags.slice(0, 3).map((tag) => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Loading state */}
      {isSearching && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              🤖 Analizando tu consulta...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nuestra IA está interpretando tu búsqueda para encontrar las APIs más relevantes
            </Typography>
          </Box>
        </Box>
      )}

      {/* Error state */}
      {searchError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error al buscar APIs: {searchError.message}
        </Alert>
      )}

      {/* Popular APIs section when no search */}
      {!searchParams && popularAPIs && (
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <TrendingUpIcon color="primary" />
            <Typography variant="h5">APIs Populares</Typography>
          </Box>
          
          <Grid container spacing={3}>
            {popularAPIs.data.apis.map((api) => (
              <Grid item xs={12} md={6} lg={4} key={api._id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                  onClick={() => handleAPIClick(api)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="div" sx={{ flexGrow: 1, wordWrap: 'break-word' }}>
                        {api.name}
                      </Typography>
                      <Chip
                        label={api.complexity}
                        color={getComplexityColor(api.complexity)}
                        size="small"
                        sx={{ ml: 1, flexShrink: 0 }}
                      />
                    </Box>
                    
                    <Chip 
                      icon={<LayersIcon />}
                      label={api.serviceDomain}
                      variant="outlined"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary">
                      {api.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Quick Search Suggestions */}
      {!searchParams && (
        <Box mt={6}>
          <Divider sx={{ mb: 3 }} />
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <LightbulbIcon color="warning" />
            <Typography variant="h6">
              💡 Ejemplos de búsqueda en lenguaje natural
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            {[
              'Necesito APIs para gestionar perfiles de clientes y sus datos demográficos',
              'Busco funcionalidades de procesamiento de pagos instantáneos',
              'Requiero APIs para consultar saldos de cuenta en tiempo real',
              'Necesito gestión de riesgo crediticio y evaluación de clientes',
              'Busco APIs de cumplimiento normativo y reportes regulatorios',
              'Requiero análisis de comportamiento de clientes y transacciones'
            ].map((suggestion, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'primary.50',
                      borderColor: 'primary.main'
                    }
                  }}
                  variant="outlined"
                  onClick={() => {
                    setSearchQuery(suggestion)
                    setSearchParams({ q: suggestion, ...filters })
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {suggestion}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  )
}

export default BIANSearch 