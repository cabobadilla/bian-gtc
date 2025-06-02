import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('message')

    if (token) {
      // Store token and fetch user info
      login(null, token)
      toast.success('Login successful!')
      navigate('/dashboard')
    } else if (error) {
      toast.error(`Login failed: ${error}`)
      navigate('/login')
    } else {
      toast.error('Invalid authentication response')
      navigate('/login')
    }
  }, [searchParams, login, navigate])

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