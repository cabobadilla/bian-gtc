import { useQuery } from 'react-query'
import { authService } from '../services/api'
import { useAuthStore } from '../store/authStore'

export const useAuth = () => {
  const { user, token, login, logout } = useAuthStore()
  
  const { data, isLoading, error } = useQuery(
    'auth-user',
    () => authService.getMe(),
    {
      enabled: !!token && !user,
      onSuccess: (response) => {
        login(response.data.user, token)
      },
      onError: () => {
        logout()
      },
      retry: false,
    }
  )

  return {
    user,
    token,
    isLoading,
    error,
    login,
    logout,
  }
} 