import api from './api'

export const notificationsService = {
  list: () => api.get('/notifications/'),
  unreadCount: () => api.get('/notifications/unread-count/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
}
