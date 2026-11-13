import {createBrowserRouter, RouterProvider} from 'react-router-dom'
import {appRoutes} from './appRoutes'

import AuthProvider from '../providers/AuthProvider'

import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import PasswordLoginPage from '../pages/auth/PasswordLoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import RoomsPage from '../pages/dashboard/RoomsPage'
import CreateEventPage from '../pages/event/CreateEventPage'
import JoinPage from '../pages/event/JoinPage'
import RoomPage from '../pages/room/RoomPage'
import LandingPage from '../pages/landing/LandingPage'
import {AppMainPage} from "../components/layout/AppMainPage.jsx";
import GuestRoute from '../components/shared/GuestRoute'
import EditEventPage from '../pages/event/EditEventPage'
import AccountSettingsPage from '../pages/settings/AccountSettingsPage'
import PricingPage from '../pages/landing/PricingPage'
import SubscriptionPage from '../pages/dashboard/SubscriptionPage'
import BillingResultPage from '../pages/landing/BillingResultPage'
import PeoplePage from '../pages/people/PeoplePage'
import ClassReportsPage from '../pages/dashboard/ClassReportsPage'
import ClassReportDetailPage from '../pages/dashboard/ClassReportDetailPage'
import ProfilePage from '../pages/settings/ProfilePage'
import ReferralsPage from '../pages/dashboard/ReferralsPage'

const router = createBrowserRouter([
    {
        path: '/',
        element: <LandingPage/>
    },
    { path: '/pricing', element: <PricingPage/> },
    { path: '/billing/result', element: <BillingResultPage/> },
    {
        path: appRoutes.auth.login,
        element: (
            <GuestRoute>
                <LoginPage/>
            </GuestRoute>
        )
    },
    {
        path: appRoutes.auth.passwordLogin,
        element: (
            <GuestRoute>
                <PasswordLoginPage/>
            </GuestRoute>
        )
    },
    {
        path: appRoutes.auth.register,
        element: (
            <GuestRoute>
                <RegisterPage/>
            </GuestRoute>
        )
    },
    {
        path: appRoutes.dashboard.indexPage,
        element: (
            <AuthProvider>
                <AppMainPage/>
            </AuthProvider>
        ),
        children: [
            {
                index: true,
                element: <DashboardPage/>
            },
            {
                path: appRoutes.dashboard.rooms,
                element: <RoomsPage/>
            },
            { path: appRoutes.dashboard.reports, element: <ClassReportsPage/> },
            { path: appRoutes.dashboard.reportClass, element: <ClassReportDetailPage/> },
            {
                path: appRoutes.dashboard.createEvent,
                element: <CreateEventPage/>
            },
            {
                path: appRoutes.dashboard.editEvent,
                element: <EditEventPage/>
            },
            {
                path: appRoutes.dashboard.settings,
                element: <AccountSettingsPage/>
            },
            { path: appRoutes.dashboard.subscription, element: <SubscriptionPage/> },
            { path: appRoutes.dashboard.pricing, element: <PricingPage/> },
            { path: appRoutes.dashboard.people, element: <PeoplePage/> },
            { path: appRoutes.dashboard.profile, element: <ProfilePage/> },
            { path: appRoutes.dashboard.referrals, element: <ReferralsPage/> },
        ]
    },
    {
        path: appRoutes.event.join,
        element: <JoinPage/>
    },
    {
        path: appRoutes.event.room,
        element: <RoomPage/>
    },
])

export default function Router() {
    return <RouterProvider router={router}/>
}
