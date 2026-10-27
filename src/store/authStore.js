import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refresh: null,
      user: null,
      // refresh اختیاری است تا فراخوانی‌های قدیمی (setAuth(token, user)) خراب نشوند
      setAuth: (token, user, refresh) =>
        set((s) => ({ token, user, refresh: refresh !== undefined ? refresh : s.refresh })),
      login: (user, token, refresh = null) => set({ token, user, refresh }),
      // فقط توکن‌ها را عوض می‌کند (user و نقش‌ها دست‌نخورده می‌مانند)
      setTokens: (token, refresh) =>
        set((s) => ({ token, refresh: refresh || s.refresh })),
      logout: () => set({ token: null, refresh: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
)