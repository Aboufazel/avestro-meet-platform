import api from './api'

export const paymentsService = {
  plans: () => api.get('/payments/plans/'),
  quote: (data) => api.post('/payments/quote/', data),
  checkout: (data) => api.post('/payments/checkout/', data),
  me: () => api.get('/payments/subscription/'),
  orders: () => api.get('/payments/orders/'),
  order: (id) => api.get(`/payments/orders/${id}/`),
}
