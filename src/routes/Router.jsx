import {createBrowserRouter, RouterProvider} from 'react-router-dom'
import {appRoutes} from './appRoutes'

import AuthProvider from '../providers/AuthProvider'

import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import CreateEventPage from '../pages/event/CreateEventPage'
import JoinPage from '../pages/event/JoinPage'
import RoomPage from '../pages/room/RoomPage'
import LandingPage from '../pages/landing/LandingPage'
import {AppMainPage} from "../components/layout/AppMainPage.jsx";
import GuestRoute from '../components/shared/GuestRoute'

const router = createBrowserRouter([
    {
        path: '/',
        element: <LandingPage/>
    },
    {
        path: appRoutes.auth.login,
        element: (
            <GuestRoute>
                <LoginPage/>
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
                path: appRoutes.dashboard.createEvent,
                element: <CreateEventPage/>
            },
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
