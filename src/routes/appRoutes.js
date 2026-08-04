export const appRoutes = {
  landing: '/',
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: {
    indexPage: '/dashboard',
    createEvent: '/dashboard/create',
  },
  event: {
    join: '/join/:slug',
    room: '/room/:slug',
  },
}
