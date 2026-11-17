export const appRoutes = {
  landing: '/',
  pricing: '/pricing',
  billingResult: '/billing/result',
  auth: {
    login: '/login',
    register: '/register',
    passwordLogin: '/login/password',
  },
  dashboard: {
    indexPage: '/dashboard',
    createEvent: '/dashboard/create',
    rooms: '/dashboard/rooms',
    reports: '/dashboard/reports',
    reportClass: '/dashboard/reports/:slug',
    pricing: '/dashboard/pricing',
    editEvent: '/dashboard/edit/:slug',
    settings: '/dashboard/settings',
    subscription: '/dashboard/subscription',
    people: '/dashboard/people',
    profile: '/dashboard/profile',
    referrals: '/dashboard/referrals',
  },
  event: {
    join: '/join/:slug',
    room: '/room/:slug',
  },
}
