import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

const LoadingScreen = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        Loading BIAN API Generator...
      </Typography>
    </Box>
  )
}

export default LoadingScreen 