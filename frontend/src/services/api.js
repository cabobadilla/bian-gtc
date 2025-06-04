import axios from 'axios'
import toast from 'react-hot-toast'

// Get backend URL - auto-detect based on architecture
export const getAPIUrl = () => {
  // In development, use explicit env var or localhost fallback
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:10000/api'
  }
  
  // In production, prioritize explicit VITE_API_URL (current architecture)
  if (import.meta.env.VITE_API_URL) {
    console.log('🔗 Using explicit VITE_API_URL:', import.meta.env.VITE_API_URL)
    return import.meta.env.VITE_API_URL
  }
  
  // Production auto-detection based on current domain
  if (import.meta.env.PROD) {
    const currentOrigin = window.location.origin
    const currentHost = window.location.hostname
    
    // Current architecture: Frontend at bian-gtc, Backend at bian-api-backend
    if (currentHost === 'bian-gtc.onrender.com') {
      const backendUrl = 'https://bian-api-backend.onrender.com/api'
      console.log('🔗 bian-gtc frontend detected, using separate backend:', backendUrl)
      return backendUrl
    }
    
    // Legacy: separate frontend service
    if (currentHost === 'bian-api-frontend.onrender.com') {
      const backendUrl = 'https://bian-api-backend.onrender.com/api'
      console.log('🔗 Legacy frontend service detected, using backend:', backendUrl)
      return backendUrl
    }
    
    // Fallback for other production domains (unified architecture)
    const apiUrl = `${currentOrigin}/api`
    console.log('🔗 Unknown production domain, assuming unified architecture:', apiUrl)
    return apiUrl
  }
  
  // Final fallback
  console.warn('⚠️ Unexpected environment, falling back to localhost')
  return 'http://localhost:10000/api'
}

const API_BASE_URL = getAPIUrl()

// Debug logging - always show in production for troubleshooting
const isDebug = true // Always enable in production for now
const isProduction = import.meta.env.PROD

console.log('🏗️ BIAN API Frontend Initialization')
console.log('🔗 API Base URL:', API_BASE_URL)
console.log('🌍 Environment Mode:', import.meta.env.MODE)
console.log('🏭 Production Build:', isProduction)
console.log('📍 Current Origin:', window.location.origin)
console.log('📍 Current Hostname:', window.location.hostname)
console.log('🔧 Vite API URL Env:', import.meta.env.VITE_API_URL)

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper function to check if error is likely due to cold start
const isColdStartError = (error) => {
  return (
    error.code === 'ECONNABORTED' || 
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNREFUSED' ||
    (error.response?.status >= 500 && error.response?.status < 600)
  )
}

// Helper function to create retry wrapper
const withRetry = async (apiCall, maxRetries = 2, delay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      const isLastAttempt = attempt === maxRetries + 1
      const shouldRetry = isColdStartError(error) && !isLastAttempt
      
      if (shouldRetry) {
        console.log(`🔄 [RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`, {
          error: error.message,
          code: error.code,
          status: error.response?.status
        })
        
        // Show user-friendly message on first retry
        if (attempt === 1) {
          toast.loading('El servidor está iniciando, por favor espera...', {
            id: 'cold-start',
            duration: delay + 2000
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 1.5 // Exponential backoff
      } else {
        // Clear any loading toast
        toast.dismiss('cold-start')
        throw error
      }
    }
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (isDebug) {
      console.log(`🚀 [API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        fullUrl: `${config.baseURL}${config.url}`,
        data: config.data,
        params: config.params
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
    // Clear any cold start loading toast on successful response
    toast.dismiss('cold-start')
    
    if (isDebug) {
      console.log(`✅ [API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url}`, {
        status: response.status,
        data: response.data
      })
    }
    return response
  },
  (error) => {
    // Clear any cold start loading toast
    toast.dismiss('cold-start')
    
    console.error(`❌ [API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      fullUrl: `${error.config?.baseURL}${error.config?.url}`
    })

    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
    } else if (error.response?.status === 403) {
      toast.error('Access denied')
    } else if (error.response?.status === 404) {
      toast.error(`Endpoint not found: ${error.config?.url}`)
    } else if (error.response?.status >= 500) {
      if (isColdStartError(error)) {
        toast.error('El servidor está iniciando. Intenta de nuevo en unos segundos.')
      } else {
        toast.error('Server error. Please try again later.')
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('El servidor está tardando en responder. Puede estar iniciando, intenta de nuevo.')
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      toast.error('No se puede conectar al servidor. Puede estar iniciando, intenta de nuevo en unos segundos.')
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

// Company services with retry logic
export const companyService = {
  getMyCompanies: () => {
    if (isDebug) console.log('🏢 [COMPANY SERVICE] Getting my companies...')
    return withRetry(() => api.get('/companies/my'))
  },
  getCompany: (id) => {
    if (isDebug) console.log('🏢 [COMPANY SERVICE] Getting company:', id)
    return withRetry(() => api.get(`/companies/${id}`))
  },
  createCompany: (data) => {
    if (isDebug) console.log('🏢 [COMPANY SERVICE] Creating company:', data)
    return withRetry(() => api.post('/companies', data))
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
    
    // Use longer timeout for search operations
    return api.get(`/bian/search?${params}`, {
      timeout: 60000 // 60 seconds for search operations
    });
  },
  intelligentSearch: (data) => {
    return api.post('/bian/intelligent-search', data, {
      timeout: 45000 // 45 seconds for AI operations
    });
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
    return api.post(`/bian/${id}/explain`, data, {
      timeout: 30000 // 30 seconds for explanations
    });
  },
  createAPIFromReference: (id, data) => {
    return api.post(`/bian/${id}/create-api`, data, {
      timeout: 45000 // 45 seconds for API creation
    });
  }
}

// User services
export const userService = {
  getDashboard: () => api.get('/users/dashboard'),
}

export default api 