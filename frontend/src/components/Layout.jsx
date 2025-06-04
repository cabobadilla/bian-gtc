import React, { useState } from 'react'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem, 
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery,
  Alert,
  Collapse
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Api as ApiIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Close as CloseIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useQuery } from 'react-query'
import { companyService } from '../services/api'

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const { user, logout } = useAuthStore()
  const [anchorEl, setAnchorEl] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [serverStatusOpen, setServerStatusOpen] = useState(false)

  // Monitor companies query to detect server issues
  const { error: companiesError, isLoading: companiesLoading } = useQuery(
    'my-companies',
    companyService.getMyCompanies,
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        console.error('❌ [LAYOUT] Server connection issue detected:', error);
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
          setServerStatusOpen(true);
        }
      },
      onSuccess: () => {
        setServerStatusOpen(false);
      }
    }
  )

  // Check if we should show server status warning
  const shouldShowServerWarning = companiesError && (
    companiesError.code === 'ECONNABORTED' || 
    companiesError.code === 'ERR_NETWORK' || 
    companiesError.code === 'ECONNREFUSED' ||
    companiesError.response?.status >= 500
  )

  // ... existing code ...
} 