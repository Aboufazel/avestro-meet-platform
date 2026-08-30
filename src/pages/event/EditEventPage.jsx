import {Link, useNavigate, useParams} from 'react-router-dom'
import {useEffect} from 'react'
import {useForm} from 'react-hook-form'
import {yupResolver} from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {ArrowRight, Loader2} from 'lucide-react'

import {Button} from '../../components/ui/Button'
import {Input} from '../../components/ui/Input'
import {Card} from '../../components/ui/Card'
import {useRoom, useUpdateRoom} from '../../hooks/useRooms'


const schema = yup.object({
    slug: yup
        .string()
        .required('شناسه رویداد الزامی است')
        .matches(
            /^[\p{L}\p{N}_-]+$/u,
            'فقط حروف، اعداد، خط تیره و _ مجاز است'
        ),

    title: yup
        .string()
        .required('عنوان رویداد الزامی است'),

    description: yup
        .string()
        .nullable(),

    scheduled_at: yup
        .string()
        .nullable(),

    max_participants: yup
        .number()
        .typeError('عدد وارد کنید')
        .min(2, 'حداقل ۲ نفر')
        .max(500, 'حداکثر ۵۰۰ نفر')
        .required('ظرفیت الزامی است'),

    is_private: yup
        .boolean(),
})


export default function EditEventPage() {
    const {slug} = useParams()
    const navigate = useNavigate()

    const {
        data: room,
        isLoading: isRoomLoading,
        isError,
    } = useRoom(slug)

    const {
        mutate: updateRoom,
        isPending: isUpdating,
    } = useUpdateRoom(slug)


    const {
        register,
        watch,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm({
        resolver: yupResolver(schema),

        defaultValues: {
            title: '',
            description: '',
            scheduled_at: '',
            max_participants: 100,
            is_private: false,
        },
    })


    useEffect(() => {
        if (!room) return

        reset({
            slug: room.slug || '',
            title: room.title || '',
            description: room.description || '',
            scheduled_at: room.scheduled_at
                ? formatDateTimeLocal(room.scheduled_at)
                : '',
            max_participants: room.max_participants || 100,
            is_private: Boolean(room.is_private),
        })
    }, [room, reset])


    function onSubmit(data) {
        updateRoom(
            {
                slug: data.slug,
                title: data.title,
                description: data.description || '',
                max_participants: Number(data.max_participants),
                is_private: Boolean(data.is_private),
                scheduled_at: data.scheduled_at
                    ? new Date(data.scheduled_at).toISOString()
                    : null,
            },
            {
                onSuccess: () => {
                    navigate('/dashboard')
                },
            }
        )
    }


    if (isRoomLoading) {
        return (
            <div className="min-h-full bg-olive-950 p-4 sm:p-6">
                <div className="max-w-2xl">
                    <Card>
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-olive-500 animate-spin"/>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }


    if (isError || !room) {
        return (
            <div className="min-h-full bg-olive-950 p-4 sm:p-6">
                <div className="max-w-2xl">
                    <Card>
                        <div className="flex flex-col items-center justify-center py-14 text-center">
                            <p className="text-olive-300 mb-2">
                                رویداد پیدا نشد
                            </p>

                            <p className="text-olive-600 text-sm mb-5">
                                ممکن است رویداد حذف شده باشد یا دسترسی لازم را نداشته باشید.
                            </p>

                            <Link to="/dashboard">
                                <Button>
                                    بازگشت به داشبورد
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }


    if (room.status === 'ended') {
        return (
            <div className="min-h-full bg-olive-950 p-4 sm:p-6">
                <div className="max-w-2xl">
                    <Card>
                        <div className="flex flex-col items-center justify-center py-14 text-center">
                            <p className="text-olive-300 mb-2">
                                این رویداد پایان یافته است
                            </p>

                            <p className="text-olive-600 text-sm mb-5">
                                رویدادهای پایان‌یافته قابل ویرایش نیستند.
                            </p>

                            <Link to="/dashboard">
                                <Button>
                                    بازگشت به داشبورد
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }


    return (
        <div className="min-h-full bg-olive-950 p-4 sm:p-6">

            <div className="max-w-2xl">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">

                    <Link
                        to="/dashboard"
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-olive-500 hover:bg-olive-800 hover:text-olive-300 transition-all"
                    >
                        <ArrowRight className="w-5 h-5"/>
                    </Link>

                    <div>
                        <h1 className="text-olive-100 font-bold text-lg">
                            ویرایش رویداد
                        </h1>

                        <p className="text-olive-500 text-sm">
                            اطلاعات رویداد خود را ویرایش کنید
                        </p>
                    </div>

                </div>


                <Card>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex flex-col gap-5"
                    >

                        {/* Title */}
                        <Input
                            label="عنوان رویداد"
                            placeholder="مثال: سمینار مدیریت پروژه"
                            error={errors.title?.message}
                            {...register('title')}
                        />


                        <div>
                            <Input
                                label="شناسه رویداد (لینک)"
                                placeholder="project-management"
                                error={errors.slug?.message}
                                {...register('slug')}
                            />

                            {watch('slug') && !errors.slug && (
                                <p className="text-olive-600 text-xs mt-1.5">
                                    لینک جلسه: meet.avestro.ir/join/{watch('slug')}
                                </p>
                            )}
                        </div>


                        {/* Description */}
                        <div className="flex flex-col gap-1.5">

                            <label className="text-sm text-olive-300">
                                توضیحات (اختیاری)
                            </label>

                            <textarea
                                placeholder="توضیحاتی درباره رویداد..."
                                rows={3}
                                className="w-full bg-olive-950 border border-olive-700 rounded-xl px-4 py-2.5 text-olive-100 placeholder:text-olive-600 outline-none focus:ring-2 focus:ring-olive-500/50 focus:border-olive-500 transition-all resize-none"
                                {...register('description')}
                            />

                            {errors.description && (
                                <p className="text-red-400 text-xs">
                                    {errors.description.message}
                                </p>
                            )}

                        </div>


                        {/* Date + Participants */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <Input
                                label="تاریخ و ساعت برگزاری (اختیاری)"
                                type="datetime-local"
                                error={errors.scheduled_at?.message}
                                {...register('scheduled_at')}
                            />

                            <Input
                                label="حداکثر شرکت‌کنندگان"
                                type="number"
                                error={errors.max_participants?.message}
                                {...register('max_participants')}
                            />

                        </div>


                        {/* Private */}
                        <div className="flex items-center gap-3 p-4 bg-olive-950 rounded-xl border border-olive-700">

                            <input
                                type="checkbox"
                                id="is_private"
                                className="w-4 h-4 accent-olive-500 cursor-pointer"
                                {...register('is_private')}
                            />

                            <label
                                htmlFor="is_private"
                                className="text-olive-300 text-sm cursor-pointer"
                            >
                                رویداد خصوصی

                                <span className="text-olive-600 text-xs mr-1">
                  (فقط با لینک مستقیم)
                </span>
                            </label>

                        </div>


                        {/* Actions */}
                        <div className="flex gap-3 pt-2">

                            <Button
                                type="submit"
                                loading={isUpdating}
                                size="lg"
                            >
                                ذخیره تغییرات
                            </Button>

                            <Link to="/dashboard">
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    type="button"
                                >
                                    انصراف
                                </Button>
                            </Link>

                        </div>

                    </form>

                </Card>

            </div>

        </div>
    )
}


/**
 * تبدیل تاریخ ISO به فرمت مناسب datetime-local
 *
 * مثال:
 * 2026-09-01T18:00:00.000Z
 *
 * تبدیل می‌شود به:
 * 2026-09-01T21:30
 */
function formatDateTimeLocal(value) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    const pad = (number) =>
        String(number).padStart(2, '0')

    return [
        date.getFullYear(),
        '-',
        pad(date.getMonth() + 1),
        '-',
        pad(date.getDate()),
        'T',
        pad(date.getHours()),
        ':',
        pad(date.getMinutes()),
    ].join('')
}
