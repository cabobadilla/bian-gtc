import React from 'react'
import { Container, Typography, Box } from '@mui/material'

const Profile = () => {
  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>
      
      <Typography variant="body1">
        Profile interface coming soon...
      </Typography>
    </Container>
  )
}

export default Profile 