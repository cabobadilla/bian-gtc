import React from 'react'
import { Box, Container, Card, CardContent, Typography, Button } from '@mui/material'
import { Google as GoogleIcon } from '@mui/icons-material'
import { getAPIUrl } from '../services/api'

const Login = () => {
  const handleGoogleLogin = () => {
    // getAPIUrl() already includes /api, so just add /auth/google
    const googleAuthUrl = `${getAPIUrl()}/auth/google`
    console.log('🔗 [LOGIN] Redirecting to Google auth:', googleAuthUrl)
    window.location.href = googleAuthUrl
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
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" gutterBottom>
                BIAN API Generator
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Generate custom BIAN-compliant APIs with AI assistance
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{ py: 1.5 }}
            >
              Continue with Google
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center" mt={3}>
              Secure authentication powered by Google OAuth2
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default Login 