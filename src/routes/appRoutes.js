export const appRoutes = {
  landing: '/',
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    indexPage: '/dashboard',
    createEvent: '/dashboard/create',
    editEvent: '/dashboard/edit/:slug',
    settings: '/dashboard/settings',
  },
  event: {
    join: '/join/:slug',
    room: '/room/:slug',
  },
}
