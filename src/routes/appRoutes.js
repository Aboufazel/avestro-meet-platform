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
    rooms: '/dashboard/rooms',
    pricing: '/dashboard/pricing',
    editEvent: '/dashboard/edit/:slug',
    settings: '/dashboard/settings',
    subscription: '/dashboard/subscription',
    people: '/dashboard/people',
  },
  event: {
    join: '/join/:slug',
    room: '/room/:slug',
  },
}
