import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import toast from 'react-hot-toast'
import {authService} from '../services/auth'
import {useAuthStore} from '../store/authStore'

export function useMe() {
    const token = useAuthStore((s) => s.token)
    return useQuery({
        queryKey: ['me'],
        queryFn: () => authService.me().then((r) => r.data),
        enabled: !!token,
        staleTime: 1000 * 60 * 5,
    })
}

export function useLogin() {
    const {setAuth} = useAuthStore()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data) => authService.login(data).then((r) => r.data),
        onSuccess: async (data) => {
            setAuth(data.access, null)  // اول token رو ست کن
            const me = await authService.me()  // بعد user رو بگیر
            setAuth(data.access, me.data)
            toast.success('خوش آمدید!')
            navigate('/dashboard')
        },
        onError: (error) => {
            const msg = error.response?.data?.detail || 'نام کاربری یا رمز عبور اشتباه است'
            toast.error(msg)
        },
    })
}

export function useRegister() {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: (data) => authService.register(data).then((r) => r.data),
        onSuccess: () => {
            toast.success('ثبت‌نام با موفقیت انجام شد')
            navigate('/login')
        },
        onError: (error) => {
            const data = error.response?.data
            if (data) {
                const firstError = Object.values(data)[0]
                toast.error(Array.isArray(firstError) ? firstError[0] : firstError)
            } else {
                toast.error('خطا در ثبت‌نام')
            }
        },
    })
}

export function useLogout() {
    const {logout} = useAuthStore()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return () => {
        logout()
        queryClient.clear()
        toast('خروج انجام شد', {icon: '👋'})
        navigate('/')
    }
}
