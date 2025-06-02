import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, Button, Avatar } from '@mui/material'
import { useAuthStore } from '../../store/authStore'

const Layout = () => {
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
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
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout 