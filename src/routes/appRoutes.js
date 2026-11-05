export const appRoutes = {
  landing: '/',
  pricing: '/pricing',
  billingResult: '/billing/result',
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    indexPage: '/dashboard',
    createEvent: '/dashboard/create',
    editEvent: '/dashboard/edit/:slug',
    settings: '/dashboard/settings',
    subscription: '/dashboard/subscription',
  },
  event: {
    join: '/join/:slug',
    room: '/room/:slug',
  },
}
