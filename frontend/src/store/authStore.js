import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      
      setUser: (user) => set({ user }),
      
      setToken: (token) => set({ token }),
      
      setLoading: (loading) => set({ loading }),
      
      login: (user, token) => {
        set({ user, token, loading: false })
      },
      
      logout: () => {
        set({ user: null, token: null, loading: false })
        localStorage.removeItem('auth-storage')
      },
      
      updateUser: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } })
        }
      }
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
) 