import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAuthStore } from './store/authStore'
import { useAuth } from './hooks/useAuth'

// Components
import Layout from './components/Layout/Layout'
import LoadingScreen from './components/LoadingScreen'

// Pages
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import AuthSuccess from './pages/AuthSuccess'
import AuthError from './pages/AuthError'
import BIANSearch from './pages/BIANSearch'
import BIANDetail from './pages/BIANDetail'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import APIs from './pages/APIs'
import APIDetail from './pages/APIDetail'
import APIEditor from './pages/APIEditor'
import APIWizard from './pages/APIWizard'
import Profile from './pages/Profile'

function App() {
  const { user, loading } = useAuthStore()
  const { isLoading: authLoading } = useAuth()

  if (loading || authLoading) {
    return <LoadingScreen />
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/auth/error" element={<AuthError />} />
        
        {/* Protected routes */}
        {user ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="bian-search" element={<BIANSearch />} />
            <Route path="bian/:id" element={<BIANDetail />} />
            <Route path="companies" element={<Companies />} />
            <Route path="companies/:companyId" element={<CompanyDetail />} />
            <Route path="companies/:companyId/apis" element={<APIs />} />
            <Route path="apis" element={<APIs />} />
            <Route path="apis/:id" element={<APIDetail />} />
            <Route path="apis/:id/edit" element={<APIEditor />} />
            <Route path="apis/create/:referenceId" element={<APIWizard />} />
            <Route path="apis/:id/wizard" element={<APIWizard />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Box>
  )
}

export default App 