import React, { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Box, Container, CircularProgress, Typography, Alert } from '@mui/material'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const AuthSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()

  useEffect(() => {
    const handleAuthSuccess = () => {
      try {
        const token = searchParams.get('token')
        const userParam = searchParams.get('user')

        if (!token || !userParam) {
          throw new Error('Missing authentication data')
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam))

        // Set authentication in store
        login(user, token)

        // Show success message
        toast.success(`Welcome back, ${user.name}!`)

        // Redirect to dashboard
        navigate('/dashboard', { replace: true })

      } catch (error) {
        console.error('Auth success error:', error)
        toast.error('Authentication error. Please try again.')
        navigate('/login', { replace: true })
      }
    }

    handleAuthSuccess()
  }, [searchParams, navigate, login])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Box textAlign="center">
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Completing authentication...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we set up your session.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default AuthSuccess 