import axios from 'axios'
import toast from 'react-hot-toast'

// Get backend URL from environment variable (with fallback for development)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage)
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
    } else if (error.response?.status === 403) {
      toast.error('Access denied')
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.')
    }
    
    return Promise.reject(error)
  }
)

// Auth services
export const authService = {
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/profile', data),
}

// Company services
export const companyService = {
  getMyCompanies: () => api.get('/companies/my'),
  getCompany: (id) => api.get(`/companies/${id}`),
  createCompany: (data) => api.post('/companies', data),
}

// API services
export const apiService = {
  createAPI: (data) => api.post('/apis', data),
  getCompanyAPIs: (companyId, params = {}) => 
    api.get(`/apis/company/${companyId}`, { params }),
  getAPI: (id, version = null) => 
    api.get(`/apis/${id}`, { params: version ? { version } : {} }),
  updateAPISpec: (id, data) => api.put(`/apis/${id}/spec`, data),
  enrichAPI: (id, data) => api.post(`/apis/${id}/enrich`, data),
}

// User services
export const userService = {
  getDashboard: () => api.get('/users/dashboard'),
}

export default api 