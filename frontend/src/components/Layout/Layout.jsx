import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, Button, Avatar, Tabs, Tab } from '@mui/material'
import { useAuthStore } from '../../store/authStore'

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