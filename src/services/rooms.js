import api from './api'

export const roomsService = {
  list: () => api.get('/rooms/'),
  create: (data) => api.post('/rooms/', data),
  detail: (slug) => api.get(`/rooms/${slug}/`),
  join: (slug, data) => api.post(`/rooms/${slug}/join/`, data),
  leave: (slug) => api.post(`/rooms/${slug}/leave/`),
  end: (slug) => api.post(`/rooms/${slug}/end/`),
  update: (slug, data) => api.patch(`/rooms/${slug}/edit/`, data),
}
