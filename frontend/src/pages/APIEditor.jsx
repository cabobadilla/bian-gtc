import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Typography, Box } from '@mui/material'

const APIEditor = () => {
  const { apiId } = useParams()

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          API Editor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Editing API: {apiId}
        </Typography>
      </Box>
      
      <Typography variant="body1">
        API editor interface coming soon...
      </Typography>
    </Container>
  )
}

export default APIEditor 