import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import toast from 'react-hot-toast'
import {authService} from '../services/auth'
import {paymentsService} from '../services/payments'
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
            setAuth(data.access, null, data.refresh)  // اول token و refresh رو ست کن
            const me = await authService.me()  // بعد user رو بگیر
            setAuth(data.access, me.data, data.refresh)
            toast.success('خوش آمدید!')

            // بازگشت به صفحه‌ی قبلی (مثلاً /join/slug) فقط برای مسیرهای داخلی
            const next = new URLSearchParams(window.location.search).get('next')
            const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
            navigate(safeNext, {replace: true})
        },
        onError: (error) => {
            const msg = error.response?.data?.detail || 'نام کاربری یا رمز عبور اشتباه است'
            toast.error(msg)
        },
    })
}

function safeNextPath() {
    const next = new URLSearchParams(window.location.search).get('next')
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}

function errorMessage(error, fallback) {
    const data = error.response?.data
    if (typeof data?.detail === 'string') return data.detail
    const first = data && Object.values(data)[0]
    return (Array.isArray(first) ? first[0] : first) || fallback
}

export function useOtpRequest() {
    return useMutation({
        mutationFn: (phone) => authService.otpRequest(phone).then((r) => r.data),
        onError: (error) => toast.error(errorMessage(error, 'ارسال کد ناموفق بود')),
    })
}

/**
 * تأیید کد؛ اگر ?free=<slug> در آدرس باشد، پلن رایگان همان‌جا (قبل از ورود به داشبورد) دریافت می‌شود.
 */
export function useOtpVerify() {
    const {setAuth} = useAuthStore()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data) => authService.otpVerify(data).then((r) => r.data),
        onSuccess: async (data) => {
            const params = new URLSearchParams(window.location.search)
            const freeSlug = params.get('free')
            let destination = safeNextPath() || '/dashboard'
            if (freeSlug) {
                try {
                    await paymentsService.claimFreePlan(freeSlug, {headers: {Authorization: `Bearer ${data.access}`}})
                    toast.success('پلن رایگان شما فعال شد')
                    destination = '/dashboard/subscription'
                } catch (error) {
                    toast.error(errorMessage(error, 'دریافت پلن رایگان ممکن نشد'))
                }
            }
            queryClient.clear()
            setAuth(data.access, data.user, data.refresh)
            if (!freeSlug) toast.success(data.is_new_user ? 'حساب شما ساخته شد' : 'خوش آمدید!')
            navigate(destination, {replace: true})
        },
        onError: (error) => toast.error(errorMessage(error, 'کد واردشده درست نیست')),
    })
}

export function useUpdateProfile() {
    const queryClient = useQueryClient()
    const {token, refresh, setAuth} = useAuthStore()
    return useMutation({
        mutationFn: (data) => authService.updateMe(data).then((r) => r.data),
        onSuccess: (user) => {
            setAuth(token, user, refresh)
            queryClient.invalidateQueries({queryKey: ['me']})
            toast.success('پروفایل ذخیره شد')
        },
        onError: (error) => toast.error(errorMessage(error, 'ذخیره‌ی پروفایل ناموفق بود')),
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