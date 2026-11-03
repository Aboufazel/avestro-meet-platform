import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const AUTH_URLS = ['/auth/login/', '/auth/refresh/', '/auth/register/']

function readAuth() {
  try {
    const storage = localStorage.getItem('auth-storage')
    return storage ? JSON.parse(storage).state || {} : {}
  } catch {
    return {}
  }
}

function writeTokens(access, refresh) {
  try {
    const storage = JSON.parse(localStorage.getItem('auth-storage') || '{}')
    storage.state = { ...(storage.state || {}), token: access }
    if (refresh) storage.state.refresh = refresh
    localStorage.setItem('auth-storage', JSON.stringify(storage))
  } catch {
    // ignore
  }
}

/**
 * توکن را با refresh token تازه می‌کند (هم‌زمان فقط یک درخواست refresh).
 * کاربر همان کاربر می‌ماند؛ نقش (مدیر/میزبان) از خود توکن/سرور می‌آید.
 * خروجی: access جدید، یا null اگر refresh ممکن نبود.
 */
let refreshPromise = null
export function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const { refresh } = readAuth()
  if (!refresh) return Promise.resolve(null)

  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh/`, { refresh })
    .then((res) => {
      const { access, refresh: newRefresh } = res.data
      writeTokens(access, newRefresh)
      // state حافظه‌ی zustand را هم هماهنگ کن (import پویا برای جلوگیری از چرخه)
      import('../store/authStore').then(({ useAuthStore }) =>
        useAuthStore.getState().setTokens(access, newRefresh)
      )
      return access
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

export function forceLogout() {
  localStorage.removeItem('auth-storage')
  const next = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/login?next=${next}`
}

// اضافه کردن token به همه درخواست‌ها
api.interceptors.request.use((config) => {
  const { token } = readAuth()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// مدیریت خطاهای global
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    if (response?.status === 401 && config) {
      const isAuthEndpoint = AUTH_URLS.some((u) => (config.url || '').startsWith(u))
      const hadToken = Boolean(config.headers?.Authorization)

      // توکن منقضی شده: تازه‌سازی و تکرار همان درخواست (با همان هویت کاربر)
      if (!isAuthEndpoint && hadToken && !config._retried) {
        config._retried = true
        const access = await refreshAccessToken()
        if (access) {
          config.headers.Authorization = `Bearer ${access}`
          return api(config)
        }
        forceLogout()
        return Promise.reject(error)
      }

      if (!isAuthEndpoint && hadToken) {
        forceLogout()
      }
    }
    return Promise.reject(error)
  }
)

export default api