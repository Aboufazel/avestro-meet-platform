import api from './api'

export const peopleService = {
  list: (params) => api.get('/people/', { params }),
  create: (data) => api.post('/people/', data),
  update: (id, data) => api.patch(`/people/${id}/`, data),
  remove: (id) => api.delete(`/people/${id}/`),
  template: () => api.get('/people/import/template/', { responseType: 'blob' }),
  importFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/people/import/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    })
  },
}
