import {useState} from 'react'
import {useParams, useNavigate, Link} from 'react-router-dom'
import {useForm} from 'react-hook-form'
import {yupResolver} from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {Calendar, Clock, Users, Loader2} from 'lucide-react'
import {Button} from '../../components/ui/Button'
import {Input} from '../../components/ui/Input'
import {Avatar} from '../../components/ui/Avatar'
import {useAuthStore} from '../../store/authStore'
import {useRoom, useJoinRoom} from '../../hooks/useRooms'
import {appRoutes} from '../../routes/appRoutes'

const guestSchema = yup.object({
    guest_name: yup.string().required('نام الزامی است').min(2, 'حداقل ۲ کاراکتر'),
})

const statusConfig = {
    live: {label: 'در جریان', dot: 'bg-green-500'},
    scheduled: {label: 'زمان‌بندی شده', dot: 'bg-olive-500'},
    ended: {label: 'پایان یافته', dot: 'bg-olive-700'},
}

export default function JoinPage() {
    const {slug} = useParams()
    const navigate = useNavigate()
    const {token, user} = useAuthStore()
    const [mode, setMode] = useState(token ? 'select' : 'guest')

    const {data: room, isLoading, isError} = useRoom(slug)
    const {mutate: joinRoom, isPending} = useJoinRoom(slug)

    const {register, handleSubmit, formState: {errors}} = useForm({
        resolver: yupResolver(guestSchema),
    })

    // function handleJoinAsUser() {
    //     joinRoom({})
    // }
    //
    // function handleJoinAsGuest(data) {
    //     // joinRoom({guest_name: data.guest_name})
    //     sessionStorage.setItem('guest_name', data.guest_name)
    //     joinRoom({guest_name: data.guest_name})
    // }

    function handleJoinAsUser() {
        navigate(`/room/${slug}`)
    }

    function handleJoinAsGuest(data) {
        sessionStorage.setItem('guest_name', data.guest_name)
        navigate(`/room/${slug}`)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-olive-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-olive-500 animate-spin"/>
            </div>
        )
    }

    if (isError || !room) {
        return (
            <div className="min-h-screen bg-olive-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-olive-100 text-lg font-bold mb-2">رویداد یافت نشد</p>
                    <p className="text-olive-500 text-sm mb-6">لینک اشتباه است یا رویداد حذف شده</p>
                    <Link to="/">
                        <Button variant="secondary">بازگشت به خانه</Button>
                    </Link>
                </div>
            </div>
        )
    }

    const status = statusConfig[room.status] || statusConfig.scheduled

    return (
        <div className="min-h-screen bg-olive-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md flex flex-col gap-4">

                {/* Event Info */}
                <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <span
                            className={`w-2 h-2 rounded-full ${status.dot} ${room.status === 'live' ? 'animate-pulse' : ''}`}/>
                        <span className="text-olive-400 text-sm">{status.label}</span>
                    </div>

                    <h1 className="text-olive-100 text-xl font-bold mb-1">{room.title}</h1>
                    {room.description && (
                        <p className="text-olive-500 text-sm mb-4">{room.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-olive-600 text-sm">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4"/>
                {room.active_participants_count}/{room.max_participants} نفر
            </span>
                        {room.scheduled_at && (
                            <>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4"/>
                    {new Date(room.scheduled_at).toLocaleDateString('fa-IR')}
                </span>
                                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4"/>
                                    {new Date(room.scheduled_at).toLocaleTimeString('fa-IR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Join Options */}
                {room.status === 'ended' ? (
                    <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6 text-center">
                        <p className="text-olive-400 mb-4">این رویداد پایان یافته است</p>
                        <Link to="/">
                            <Button variant="secondary">بازگشت به خانه</Button>
                        </Link>
                    </div>
                ) : mode === 'select' ? (
                    <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6 flex flex-col gap-3">
                        <h2 className="text-olive-100 font-bold mb-2">ورود به جلسه</h2>

                        {token ? (
                            <>
                                <div
                                    className="flex items-center gap-3 p-3 bg-olive-950 rounded-xl border border-olive-700">
                                    <Avatar name={user?.display_name || user?.username} size="sm"/>
                                    <div className="min-w-0">
                                        <p className="text-olive-100 text-sm font-medium truncate">{user?.display_name || user?.username}</p>
                                        <p className="text-olive-600 text-xs truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <Button fullWidth size="lg" loading={isPending} onClick={handleJoinAsUser}>
                                    ورود با حساب کاربری
                                </Button>
                                <Button fullWidth variant="ghost" onClick={() => setMode('guest')}>
                                    ورود به عنوان مهمان
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link to={`${appRoutes.auth.login}?next=/join/${slug}`} className="w-full">
                                    <Button fullWidth size="lg">ورود با حساب کاربری</Button>
                                </Link>
                                <Button fullWidth variant="secondary" size="lg" onClick={() => setMode('guest')}>
                                    ورود به عنوان مهمان
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <button
                                onClick={() => setMode('select')}
                                className="text-olive-500 hover:text-olive-300 transition-colors"
                            >
                                ←
                            </button>
                            <h2 className="text-olive-100 font-bold">ورود به عنوان مهمان</h2>
                        </div>

                        <form onSubmit={handleSubmit(handleJoinAsGuest)} className="flex flex-col gap-4">
                            <Input
                                label="نام شما"
                                placeholder="نامی که دیگران می‌بینند"
                                error={errors.guest_name?.message}
                                {...register('guest_name')}
                            />
                            <Button type="submit" fullWidth size="lg" loading={isPending}>
                                ورود به جلسه
                            </Button>
                        </form>
                    </div>
                )}

            </div>
        </div>
    )
}