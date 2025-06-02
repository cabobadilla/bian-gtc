import React, { useState } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  IconButton
} from '@mui/material'
import { 
  Add as AddIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  Settings as SettingsIcon
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { companyService } from '../services/api'

const Companies = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: '',
    industry: '',
    size: '',
    country: ''
  })

  // Get user's companies
  const { data: companiesData, isLoading } = useQuery(
    'my-companies',
    companyService.getMyCompanies
  )

  // Create company mutation
  const createCompanyMutation = useMutation(
    companyService.createCompany,
    {
      onSuccess: (data) => {
        toast.success('Empresa creada exitosamente')
        setOpenCreateDialog(false)
        setCompanyForm({
          name: '',
          description: '',
          industry: '',
          size: '',
          country: ''
        })
        queryClient.invalidateQueries('my-companies')
        queryClient.invalidateQueries('dashboard')
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Error al crear empresa')
      }
    }
  )

  const handleInputChange = (field, value) => {
    setCompanyForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateCompany = () => {
    if (!companyForm.name.trim()) {
      toast.error('El nombre de la empresa es requerido')
      return
    }

    createCompanyMutation.mutate(companyForm)
  }

  const handleCompanyClick = (companyId) => {
    navigate(`/companies/${companyId}`)
  }

  const companies = companiesData?.data?.companies || []

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Empresas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestiona tus organizaciones y acceso de equipo
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            size="large"
          >
            Crear Empresa
          </Button>
        </Box>
      </Box>

      {/* No companies state */}
      {companies.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No tienes empresas aún
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Crear una empresa es el primer paso para organizar tus APIs BIAN.
              Las APIs se crean y organizan dentro de empresas.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              size="large"
            >
              Crear tu Primera Empresa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Companies Grid */}
      {companies.length > 0 && (
        <Grid container spacing={3}>
          {companies.map((company) => (
            <Grid item xs={12} md={6} lg={4} key={company._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}
                onClick={() => handleCompanyClick(company._id)}
              >
                <CardContent>
                  <Box display="flex" alignItems="start" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        src={company.logo}
                        sx={{ bgcolor: 'primary.main' }}
                      >
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {company.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {company.slug}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Open settings
                    }}>
                      <SettingsIcon />
                    </IconButton>
                  </Box>

                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mb: 2, minHeight: '3em' }}
                  >
                    {company.description || 'Sin descripción'}
                  </Typography>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    {company.industry && (
                      <Chip 
                        label={company.industry}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Chip 
                      icon={<PeopleIcon />}
                      label="Ver APIs"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Company Dialog */}
      <Dialog 
        open={openCreateDialog} 
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear Nueva Empresa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre de la Empresa *"
                  value={companyForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Banco Nacional"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  value={companyForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción breve de la empresa"
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Industria</InputLabel>
                  <Select
                    value={companyForm.industry}
                    label="Industria"
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    <MenuItem value="banking">Banca</MenuItem>
                    <MenuItem value="fintech">Fintech</MenuItem>
                    <MenuItem value="insurance">Seguros</MenuItem>
                    <MenuItem value="payments">Pagos</MenuItem>
                    <MenuItem value="cryptocurrency">Criptomonedas</MenuItem>
                    <MenuItem value="other">Otra</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tamaño</InputLabel>
                  <Select
                    value={companyForm.size}
                    label="Tamaño"
                    onChange={(e) => handleInputChange('size', e.target.value)}
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    <MenuItem value="startup">Startup (1-10)</MenuItem>
                    <MenuItem value="small">Pequeña (11-50)</MenuItem>
                    <MenuItem value="medium">Mediana (51-200)</MenuItem>
                    <MenuItem value="large">Grande (201-1000)</MenuItem>
                    <MenuItem value="enterprise">Empresa (1000+)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="País"
                  value={companyForm.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Ej: Colombia, México, Chile..."
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                📋 <strong>Información importante:</strong> Serás el administrador de esta empresa 
                y podrás invitar otros usuarios. Las APIs se organizan por empresa.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateCompany}
            disabled={createCompanyMutation.isLoading}
            startIcon={createCompanyMutation.isLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Crear Empresa
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default Companies 