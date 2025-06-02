import React from 'react'
import { Container, Typography, Box } from '@mui/material'

const Companies = () => {
  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Companies
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your organizations and team access
        </Typography>
      </Box>
      
      <Typography variant="body1">
        Company management interface coming soon...
      </Typography>
    </Container>
  )
}

export default Companies 