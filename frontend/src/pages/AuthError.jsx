import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Alert 
} from '@mui/material'
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material'

const AuthError = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const errorMessage = searchParams.get('message') || 'unknown_error'

  const getErrorDetails = (message) => {
    switch (message) {
      case 'authentication_failed':
        return {
          title: 'Authentication Failed',
          description: 'Unable to authenticate with Google. This might be due to a cancelled login or invalid credentials.',
        }
      case 'server_error':
        return {
          title: 'Server Error',
          description: 'An internal server error occurred during authentication. Please try again.',
        }
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during the login process.',
        }
    }
  }

  const errorDetails = getErrorDetails(errorMessage)

  const handleRetry = () => {
    navigate('/login', { replace: true })
  }

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
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom color="error.main">
              {errorDetails.title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {errorDetails.description}
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Error Code:</strong> {errorMessage}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
                size="large"
              >
                Try Again
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              If this problem persists, please contact support.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default AuthError 