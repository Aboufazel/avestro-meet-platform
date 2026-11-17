import api from './api'

export const referralsService = {
  me: () => api.get('/referrals/me/'),
}
