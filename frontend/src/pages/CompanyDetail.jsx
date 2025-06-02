import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Typography, Box } from '@mui/material'

const CompanyDetail = () => {
  const { companyId } = useParams()

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Company Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Company ID: {companyId}
        </Typography>
      </Box>
      
      <Typography variant="body1">
        Company details interface coming soon...
      </Typography>
    </Container>
  )
}

export default CompanyDetail 