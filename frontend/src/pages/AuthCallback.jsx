import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/api'
import toast from 'react-hot-toast'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setToken, login, logout } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('message')

    if (token) {
      // Store token first
      setToken(token)
      
      // Then fetch user info
      authService.getMe()
        .then(response => {
          login(response.data.user, token)
          toast.success('Login successful!')
          navigate('/dashboard')
        })
        .catch(error => {
          console.error('Failed to fetch user:', error)
          logout()
          toast.error('Failed to authenticate user')
          navigate('/login')
        })
    } else if (error) {
      toast.error(`Login failed: ${error}`)
      navigate('/login')
    } else {
      toast.error('Invalid authentication response')
      navigate('/login')
    }
  }, [searchParams, setToken, login, logout, navigate])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        Completing authentication...
      </Typography>
    </Box>
  )
}

export default AuthCallback 