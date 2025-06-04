import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Avatar, 
  Tabs, 
  Tab,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material'
import { 
  Circle as CircleIcon,
  Warning as WarningIcon 
} from '@mui/icons-material'
import { useAuthStore } from '../../store/authStore'
import { useQuery } from 'react-query'
import axios from 'axios'
import { getAPIUrl } from '../../services/api'

// Server status component
const ServerStatus = () => {
  const [status, setStatus] = useState('checking') // 'online', 'offline', 'checking'
  
  // Health check query
  const { data: healthData, error: healthError, isLoading } = useQuery(
    'server-health',
    async () => {
      const baseURL = getAPIUrl()
      const response = await axios.get(`${baseURL}/health`, {
        timeout: 5000 // 5 second timeout for health check
      })
      return response.data
    },
    {
      refetchInterval: 30000, // Check every 30 seconds
      retry: 2,
      retryDelay: 1000,
      onSuccess: () => {
        setStatus('online')
      },
      onError: (error) => {
        console.log('❌ [SERVER STATUS] Health check failed:', error.message)
        setStatus('offline')
      }
    }
  )

  // CORS test function
  const testCORS = async () => {
    try {
      const baseURL = getAPIUrl()
      console.log('🔧 [CORS TEST] Testing CORS with baseURL:', baseURL)
      
      // Test GET request
      const getResponse = await axios.get(`${baseURL}/cors-test`)
      console.log('✅ [CORS TEST] GET request successful:', getResponse.data)
      
      // Test POST request
      const postResponse = await axios.post(`${baseURL}/cors-test`, {
        test: 'CORS test data',
        timestamp: new Date().toISOString()
      })
      console.log('✅ [CORS TEST] POST request successful:', postResponse.data)
      
      alert('✅ CORS test successful! Check console for details.')
    } catch (error) {
      console.error('❌ [CORS TEST] CORS test failed:', error)
      alert(`❌ CORS test failed: ${error.message}`)
    }
  }

  useEffect(() => {
    if (isLoading) {
      setStatus('checking')
    } else if (healthError) {
      setStatus('offline')
    } else if (healthData) {
      setStatus('online')
    }
  }, [isLoading, healthError, healthData])

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: '#4caf50',
          text: 'Servidor Online',
          icon: <CircleIcon sx={{ fontSize: 12, color: '#4caf50' }} />
        }
      case 'offline':
        return {
          color: '#f44336',
          text: 'Servidor Offline',
          icon: <CircleIcon sx={{ fontSize: 12, color: '#f44336' }} />
        }
      case 'checking':
        return {
          color: '#ff9800',
          text: 'Verificando...',
          icon: <CircularProgress size={12} sx={{ color: '#ff9800' }} />
        }
      default:
        return {
          color: '#9e9e9e',
          text: 'Estado Desconocido',
          icon: <WarningIcon sx={{ fontSize: 12, color: '#9e9e9e' }} />
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Tooltip title={`${statusConfig.text}${healthData ? ` • Uptime: ${Math.floor(healthData.uptime / 60)}m` : ''}`}>
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.text}
          size="small"
          variant="outlined"
          sx={{
            borderColor: statusConfig.color,
            color: statusConfig.color,
            '& .MuiChip-icon': {
              color: statusConfig.color
            }
          }}
        />
      </Tooltip>
      {/* CORS Test Button (only show in development or when server is offline) */}
      {(import.meta.env.DEV || status === 'offline') && (
        <Button
          size="small"
          variant="outlined"
          onClick={testCORS}
          sx={{ 
            color: 'white', 
            borderColor: 'white',
            minWidth: 'auto',
            px: 1,
            fontSize: '0.75rem'
          }}
        >
          Test CORS
        </Button>
      )}
    </Box>
  )
}

const Layout = () => {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const handleLogout = () => {
    logout()
  }

  const getCurrentTab = () => {
    if (location.pathname === '/dashboard') return 0
    if (location.pathname === '/bian-search') return 1
    if (location.pathname.startsWith('/companies')) return 2
    if (location.pathname.startsWith('/apis')) return 3
    return 0
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BIAN API Generator
          </Typography>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ServerStatus />
              <Avatar
                src={user.avatar}
                alt={user.name}
                sx={{ width: 32, height: 32 }}
              />
              <Typography variant="body2">
                {user.name}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
        
        {/* Navigation Tabs */}
        {user && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.1)' }}>
            <Tabs 
              value={getCurrentTab()} 
              textColor="inherit"
              TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
            >
              <Tab 
                label="Dashboard" 
                component={Link} 
                to="/dashboard"
                sx={{ color: 'white' }}
              />
              <Tab 
                label="🔍 Buscar APIs BIAN" 
                component={Link} 
                to="/bian-search"
                sx={{ color: 'white' }}
              />
              <Tab 
                label="Empresas" 
                component={Link} 
                to="/companies"
                sx={{ color: 'white' }}
              />
              <Tab 
                label="📋 Mis APIs" 
                component={Link} 
                to="/apis"
                sx={{ color: 'white' }}
              />
            </Tabs>
          </Box>
        )}
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout 