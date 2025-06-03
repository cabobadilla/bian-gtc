import axios from 'axios'
import toast from 'react-hot-toast'

// Get backend URL from environment variable (with fallback for development)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Debug logging
const isDebug = import.meta.env.VITE_DEBUG === 'ON' || import.meta.env.DEBUG === 'ON'

if (isDebug) {
  console.log('🐛 Frontend Debug mode enabled')
  console.log('🔗 API URL:', API_URL)
}

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
    if (isDebug) {
      console.log(`🚀 [API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers
      })
    }

    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage)
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`
          if (isDebug) {
            console.log('🔑 [API REQUEST] Auth token added')
          }
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error)
        if (isDebug) {
          console.error('❌ [API REQUEST] Failed to parse auth storage:', error)
        }
      }
    }
    return config
  },
  (error) => {
    if (isDebug) {
      console.error('❌ [API REQUEST] Request interceptor error:', error)
    }
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    if (isDebug) {
      console.log(`✅ [API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
        headers: response.headers
      })
    }
    return response
  },
  (error) => {
    if (isDebug) {
      console.error(`❌ [API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })
    }

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
  getMyCompanies: () => {
    if (isDebug) console.log('🏢 [COMPANY SERVICE] Getting my companies...')
    return api.get('/companies/my')
  },
  getCompany: (id) => {
    if (isDebug) console.log('🏢 [COMPANY SERVICE] Getting company:', id)
    return api.get(`/companies/${id}`)
  },
  createCompany: (data) => {
    if (isDebug) console.log('🏢 [COMPANY SERVICE] Creating company:', data)
    return api.post('/companies', data)
  },
}

// API services
export const apiService = {
  createAPI: (data) => api.post('/apis', data),
  getCompanyAPIs: (companyId, params = {}) => 
    api.get(`/apis/company/${companyId}`, { params }),
  getAPI: (id, version = null) => 
    api.get(`/apis/${id}`, { params: version ? { version } : {} }),
  updateAPI: (id, data) => api.put(`/apis/${id}`, data),
  updateAPISpec: (id, data) => api.put(`/apis/${id}/spec`, data),
  enrichAPI: (id, data) => api.post(`/apis/${id}/enrich`, data),
  deleteAPI: (id) => {
    if (isDebug) console.log('🗑️ [API SERVICE] Deleting API:', id)
    return api.delete(`/apis/${id}`)
  },
}

// BIAN Reference services
export const bianService = {
  searchAPIs: (query, filters = {}) => {
    const params = new URLSearchParams({
      q: query || '',
      ...filters
    });
    return api.get(`/bian/search?${params}`);
  },
  intelligentSearch: (data) => {
    return api.post('/bian/intelligent-search', data);
  },
  getPopularAPIs: (limit = 6) => {
    return api.get(`/bian/popular?limit=${limit}`);
  },
  getServiceDomains: () => {
    return api.get('/bian/domains');
  },
  getAPIDetails: (id, options = {}) => {
    const params = new URLSearchParams(options);
    return api.get(`/bian/${id}?${params}`);
  },
  generateExplanation: (id, data) => {
    return api.post(`/bian/${id}/explain`, data);
  },
  createAPIFromReference: (id, data) => {
    return api.post(`/bian/${id}/create-api`, data);
  }
}

// User services
export const userService = {
  getDashboard: () => api.get('/users/dashboard'),
}

export default api 