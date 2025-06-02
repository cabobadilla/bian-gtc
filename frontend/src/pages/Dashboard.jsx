import React from 'react'
import { Container, Typography, Box, Card, CardContent, Grid } from '@mui/material'
import { Api, Business, Dashboard as DashboardIcon } from '@mui/icons-material'
import { useQuery } from 'react-query'
import { userService } from '../services/api'

const Dashboard = () => {
  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    userService.getDashboard
  )

  const stats = dashboardData?.data?.stats || {}

  return (
    <Container maxWidth="lg">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to your BIAN API management center
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Api color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">APIs</Typography>
              </Box>
              <Typography variant="h3">
                {isLoading ? '-' : stats.apis || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total APIs created
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Business color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Companies</Typography>
              </Box>
              <Typography variant="h3">
                {isLoading ? '-' : stats.companies || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Organizations you belong to
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DashboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Role</Typography>
              </Box>
              <Typography variant="h3" sx={{ textTransform: 'capitalize' }}>
                {isLoading ? '-' : stats.role || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your access level
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Start by creating a company or joining an existing one to begin generating APIs.
        </Typography>
      </Box>
    </Container>
  )
}

export default Dashboard 