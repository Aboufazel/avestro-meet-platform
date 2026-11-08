import api from './api'

// گزارش برگزاری کلاس‌ها (فقط‌خواندنی). date همیشه میلادیِ «YYYY-MM-DD» است؛ نمایش شمسی در رابط انجام می‌شود.
export const classReportsService = {
  list: (archived = false) => api.get('/reports/classes/', { params: { archived: archived ? 1 : 0 } }),
  days: (slug) => api.get(`/reports/classes/${slug}/days/`),
  day: (slug, date) => api.get(`/reports/classes/${slug}/`, { params: { date } }),
  pdf: (slug, date) => api.get(`/reports/classes/${slug}/pdf/`, { params: { date }, responseType: 'blob' }),
}
