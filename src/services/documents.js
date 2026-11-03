import api from './api'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const documentsService = {
  list: (slug) => api.get(`/rooms/${slug}/documents/`),
  upload: (slug, file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/rooms/${slug}/documents/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      onUploadProgress: (event) => onProgress?.(event.total ? Math.round((event.loaded * 100) / event.total) : 0),
    })
  },
  remove: (slug, id) => api.delete(`/rooms/${slug}/documents/${id}/`),
  // خودِ فایل برای نمایش؛ هویت مثل WebSocket کلاس با شناسه‌ی شرکت‌کننده است.
  fileUrl: (slug, id, eid) => `${API_BASE}/rooms/${slug}/documents/${id}/file/?eid=${encodeURIComponent(eid || '')}`,
}
