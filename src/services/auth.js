import api from './api'

export const authService = {
  otpRequest: (phone) => api.post('/auth/otp/request/', { phone }),
  otpVerify: (data) => api.post('/auth/otp/verify/', data),
  login: (data) => api.post('/auth/login/', data),
  refresh: (data) => api.post('/auth/refresh/', data),
  me: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
}
