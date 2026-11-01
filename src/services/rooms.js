import api from './api'

export const roomsService = {
  list: () => api.get('/rooms/'),
  create: (data) => api.post('/rooms/', data),
  detail: (slug) => api.get(`/rooms/${slug}/`),
  join: (slug, data) => api.post(`/rooms/${slug}/join/`, data),
  leave: (slug) => api.post(`/rooms/${slug}/leave/`),
  end: (slug) => api.post(`/rooms/${slug}/end/`),
  update: (slug, data) => api.patch(`/rooms/${slug}/edit/`, data),
  features: (slug) => api.get(`/rooms/${slug}/features/`),
  accountFeatures: () => api.get('/features/account/'),
  updateAccountFeature: (key, data) => api.patch(`/features/account/${key}/`, data),
  updateRoomFeature: (slug, key, data) => api.patch(`/rooms/${slug}/features/${key}/`, data),
  attendance: (slug) => api.get(`/rooms/${slug}/attendance/`),
  attendancePdf: (slug) => api.get(`/rooms/${slug}/attendance/pdf/`, { responseType: 'blob' }),
  clearAttendance: (slug) => api.delete(`/rooms/${slug}/attendance/`),
  markAttendance: (slug, data) => api.put(`/rooms/${slug}/attendance/`, data),
}
