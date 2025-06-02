import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Typography, Box } from '@mui/material'

const APIDetail = () => {
  const { apiId } = useParams()

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          API Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          API ID: {apiId}
        </Typography>
      </Box>
      
      <Typography variant="body1">
        API details interface coming soon...
      </Typography>
    </Container>
  )
}

export default APIDetail 