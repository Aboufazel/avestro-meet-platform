import api from './api'

export const paymentsService = {
  plans: () => api.get('/payments/plans/'),
  customConfig: () => api.get('/payments/custom-plan/config/'),
  customQuote: (data) => api.post('/payments/custom-plan/quote/', data),
  customCheckout: (data) => api.post('/payments/custom-plan/checkout/', data),
  uploadGovernmentDocument: (file) => { const body = new FormData(); body.append('file', file); return api.post('/payments/government-document/', body, { headers: { 'Content-Type': 'multipart/form-data' } }) },
  quote: (data) => api.post('/payments/quote/', data),
  checkout: (data) => api.post('/payments/checkout/', data),
  me: () => api.get('/payments/subscription/'),
  startReserved: (id) => api.post(`/payments/subscription/${id}/start/`),
  orders: () => api.get('/payments/orders/'),
  order: (id) => api.get(`/payments/orders/${id}/`),
}
