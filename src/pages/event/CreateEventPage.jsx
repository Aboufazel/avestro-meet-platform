import {useEffect, useMemo, useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {
    ArrowRight,
    ArrowLeft,
    CalendarDays,
    ShieldCheck,
    GraduationCap,
    PenTool,
    Hand,
    ClipboardCheck,
    Mic,
    Check,
    Loader2,
    Settings2,
    FileText,
    Sparkles,
    Lock,
    Users
} from 'lucide-react'
import toast from 'react-hot-toast'

import {Button} from '../../components/ui/Button'
import {Input} from '../../components/ui/Input'
import {Card} from '../../components/ui/Card'
import {JalaliDateTimePicker} from '../../components/ui/JalaliDateTimePicker'
import {roomsService} from '../../services/rooms'
import {paymentsService} from '../../services/payments'
import {RoomAccessSettings} from '../../components/shared/RoomAccessSettings'
import {readRoomBudget, limitHint, faNumber} from '../../utils/roomBudget'

const FEATURE_META = {
    whiteboard: {title: 'تخته تعاملی', hint: 'نوشتن و ترسیم هم‌زمان روی یک فضای مشترک', icon: PenTool},
    documents: {title: 'اشتراک فایل در کلاس', hint: 'نمایش و بررسی فایل‌های آموزشی در محیط کلاس', icon: FileText},
    speak_permission: {
        title: 'کنترل اجازه صحبت و تصویر',
        hint: 'مدیریت دسترسی شرکت‌کنندگان به میکروفون و دوربین',
        icon: Mic
    },
    raise_hand: {title: 'بلندکردن دست', hint: 'ارسال درخواست صحبت و مدیریت مشارکت‌کنندگان', icon: Hand},
    attendance: {title: 'حضور و غیاب', hint: 'ثبت و پیگیری وضعیت حضور شرکت‌کنندگان', icon: ClipboardCheck},
}

const FEATURE_ORDER = ['whiteboard', 'documents', 'speak_permission', 'raise_hand', 'attendance']
const ROOM_KIND_META = {
    meeting: {
        title: 'وبینار / جلسه آنلاین',
        heading: 'اطلاعات جلسه آنلاین',
        shortTitle: 'جلسه آنلاین',
        description: 'اطلاعات جلسه آنلاین و امکانات موردنیاز را تنظیم کنید.'
    },
    class: {
        title: 'کلاس آموزشی',
        heading: 'اطلاعات کلاس آموزشی',
        shortTitle: 'کلاس آموزشی',
        description: 'اطلاعات کلاس و امکانات آموزشی را تنظیم کنید.'
    },
}
const STEPS = ['اطلاعات اصلی', 'امکانات رویداد', 'بازبینی']

// سوییچ نوع اتاق: همیشه هر دو نوع دیده می‌شود؛ نوعی که در پلن نیست غیرفعال است.
const KIND_OPTIONS = [
    {
        id: 'class',
        title: 'کلاس آموزشی',
        hint: 'معلم و دانشجو؛ چیدمان کلاس، حضور و غیاب، تخته و فایل',
        icon: GraduationCap
    },
    {id: 'meeting', title: 'جلسه آنلاین / وبینار', hint: 'گفت‌وگوی گروهی، ارائه و رویداد', icon: Users},
]

function slugify(value) {
    return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-')
}

export default function CreateEventPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [step, setStep] = useState(0)
    const [selectedKind, setSelectedKind] = useState('')
    const [saving, setSaving] = useState(false)
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [slugTouched, setSlugTouched] = useState(false)
    const [description, setDescription] = useState('')
    const [teacherName, setTeacherName] = useState('')
    const [scheduledAt, setScheduledAt] = useState('')
    const [maxParticipants, setMaxParticipants] = useState('100')
    const [allocatedVideoStreams, setAllocatedVideoStreams] = useState('1')
    const {data: subscriptionInfo, isLoading: subscriptionLoading} = useQuery({
        queryKey: ['my-subscription'],
        queryFn: () => paymentsService.me().then((response) => response.data),
    })
    const activeSubscription = subscriptionInfo?.active
    // نوع رویداد فقط از Snapshot اشتراک فعال خوانده می‌شود؛ plan_kind صرفاً fallback
    // برای پاسخ‌هایی است که هنوز room_kinds_snapshot را در API ارائه نمی‌کنند.
    const allowedRoomKinds = useMemo(() => {
        const snapshotKinds = activeSubscription?.room_kinds_snapshot
        if (Array.isArray(snapshotKinds) && snapshotKinds.length) {
            return [...new Set(snapshotKinds.filter((value) => typeof value === 'string' && value.trim()))]
        }

        const planKind = activeSubscription?.custom_plan_snapshot?.plan_kind
        if (planKind === 'webinar') return ['meeting']
        if (planKind === 'class') return ['class']
        return []
    }, [activeSubscription])

    const kind = allowedRoomKinds.includes(selectedKind)
        ? selectedKind
        : (allowedRoomKinds[0] || '')
    const kindMeta = ROOM_KIND_META[kind] || {
        title: kind || 'رویداد',
        heading: 'اطلاعات رویداد',
        shortTitle: 'رویداد',
        description: 'اطلاعات رویداد و امکانات موردنیاز را تنظیم کنید.',
    }

    useEffect(() => {
        setSelectedKind((current) => (
            allowedRoomKinds.includes(current) ? current : (allowedRoomKinds[0] || '')
        ))
    }, [allowedRoomKinds])

    // سقف هر اتاق = کل کاربر/تصویر پلن (تعداد اتاق‌ها محدودیت ندارد). null = نامحدود.
    const budget = readRoomBudget(subscriptionInfo)
    const participantLimit = budget.usersTotal
    const imageLimit = budget.imagesTotal
    const [isPrivate, setIsPrivate] = useState(false)
    const [allowGuests, setAllowGuests] = useState(true)
    const [invitedPeople, setInvitedPeople] = useState([])
    const [configureFeatures, setConfigureFeatures] = useState(true)
    const [featureDraft, setFeatureDraft] = useState({})
    // فیلدهای ظرفیت و تصویر با کل پلن پر می‌شوند و کاربر می‌تواند کمترشان کند (فقط یک بار، تا ویرایش کاربر بازنویسی نشود)
    const [limitsPrefilled, setLimitsPrefilled] = useState(false)
    useEffect(() => {
        if (limitsPrefilled || !activeSubscription) return
        if (participantLimit != null) setMaxParticipants(String(participantLimit))
        if (imageLimit != null) setAllocatedVideoStreams(String(imageLimit))
        setLimitsPrefilled(true)
    }, [limitsPrefilled, activeSubscription, participantLimit, imageLimit])

    const {data: accountFeatures = [], isLoading: featuresLoading, isError: featuresError} = useQuery({
        queryKey: ['account-features'],
        queryFn: () => roomsService.accountFeatures().then((response) => response.data),
        enabled: step >= 1,
    })

    // پاسخ سرویس ممکن است آرایه‌ی مستقیم یا شیء دارای features/results باشد.
    // این مرحله فقط بر اساس کلیدهای موردنیاز کاربر رندر می‌شود؛ applies_to و نوع رویداد فیلتر نمی‌شوند.
    const featurePayload = accountFeatures?.data ?? accountFeatures
    const featureSource = Array.isArray(featurePayload)
        ? featurePayload
        : Array.isArray(featurePayload?.features)
            ? featurePayload.features
            : Array.isArray(featurePayload?.results)
                ? featurePayload.results
                : []

    const availableFeatures = useMemo(() => {
        const byKey = new Map(featureSource.filter(Boolean).map((feature) => [feature.key, feature]))
        return FEATURE_ORDER.map((key) => byKey.get(key)).filter(Boolean)
    }, [featureSource])

    function toggleFeature(key, enabled) {
        setFeatureDraft((current) => ({...current, [key]: {...(current[key] || {}), enabled}}))
    }

    function updateFeatureSetting(key, name, value, feature) {
        setFeatureDraft((current) => ({
            ...current,
            [key]: {
                ...(current[key] || {}),
                settings: {...(current[key]?.settings || feature.settings || {}), [name]: value},
            },
        }))
    }

    function isFeatureEnabled(feature) {
        if (feature.reason === 'not_in_plan') return false
        return featureDraft[feature.key]?.enabled ?? Boolean(feature.enabled)
    }

    async function handleCreate() {
        if (!title.trim()) {
            toast.error(`عنوان ${kindMeta.shortTitle} را وارد کنید`);
            setStep(0);
            return
        }
        if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) {
            toast.error('شناسه لینک معتبر نیست');
            setStep(0);
            return
        }
        const capacity = Number(maxParticipants)
        if (!Number.isInteger(capacity) || capacity < 2 || (participantLimit != null && capacity > participantLimit)) {
            toast.error(participantLimit != null ? `ظرفیت باید بین ۲ تا ${faNumber(participantLimit)} نفر باشد (کل پلن)` : 'ظرفیت باید حداقل ۲ نفر باشد');
            setStep(0);
            return
        }

        const imageAllocation = Number(allocatedVideoStreams)
        if (!Number.isInteger(imageAllocation) || imageAllocation < 1 || (imageLimit != null && imageAllocation > imageLimit)) {
            toast.error(imageLimit != null ? `سهم تصاویر باید بین ۱ تا ${faNumber(imageLimit)} باشد (کل پلن)` : 'سهم تصاویر باید حداقل ۱ باشد');
            setStep(0);
            return
        }
        if (!allowGuests && invitedPeople.length === 0) {
            toast.error('با غیرفعال‌بودن ورود مهمان، حداقل یک نفر را برای جلسه انتخاب کنید');
            setStep(0);
            return
        }
        if (!kind || !allowedRoomKinds.includes(kind)) {
            toast.error('نوع رویداد در پلن فعال شما مشخص نیست')
            return
        }

        setSaving(true)
        try {
            const payload = {
                title: title.trim(),
                slug: slug.trim(),
                description,
                ...(kind === 'class' ? {teacher_name: teacherName.trim()} : {}),
                scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
                max_participants: capacity,
                allocated_video_streams: imageAllocation,
                feature_selection: configureFeatures ? Object.fromEntries(availableFeatures.filter((feature) => feature.reason !== 'not_in_plan').map((feature) => [feature.key, {
                    enabled: isFeatureEnabled(feature),
                    settings: {...(feature.settings || {}), ...(featureDraft[feature.key]?.settings || {})}
                }])) : {},
                is_private: isPrivate,
                allow_guests: allowGuests,
                invited_people: invitedPeople,
                // Backend currently distinguishes classroom from ordinary meeting.
                kind,
            }
            const response = await roomsService.create(payload)
            const room = response.data

            await queryClient.invalidateQueries({queryKey: ['rooms']})
            toast.success(`${kindMeta.shortTitle} و تنظیمات آن با موفقیت ساخته شد`)
            await queryClient.invalidateQueries({queryKey: ['my-subscription']})
            navigate(`/join/${room.slug}`)
        } catch (error) {
            const data = error.response?.data
            const detail = data?.detail || data?.max_participants?.[0] || data?.allocated_video_streams?.[0]
            toast.error(detail || (data?.slug ? 'این شناسه قبلاً استفاده شده است' : 'ایجاد رویداد با خطا مواجه شد'))
            queryClient.invalidateQueries({queryKey: ['my-subscription']})
        } finally {
            setSaving(false)
        }
    }

    if (subscriptionLoading) return <div className="min-h-full p-6 flex justify-center items-center"><Card
        className="!p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#4f7cff]"/><p
        className="mt-3 text-sm text-[#68758a]">در حال بررسی اشتراک شما…</p></Card></div>
    if (!activeSubscription) return <div className="min-h-full p-4 sm:p-8 flex items-center justify-center"><Card
        className="!p-6 sm:!p-10 max-w-lg text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#4f7cff]"/><h1
        className="mt-4 text-xl font-bold text-[#101827]">برای ساخت جلسه به اشتراک فعال نیاز دارید</h1><p
        className="mt-2 text-sm leading-7 text-[#68758a]">جلسات و لینک‌های قبلی شما باقی می‌مانند؛ برای ساخت رویداد
        جدید، ابتدا یک پلن انتخاب کنید.</p><Link to="/pricing"
                                                 className="meet-primary-btn inline-flex mt-5 rounded-xl px-5 py-3 text-sm">مشاهده
        تعرفه‌ها</Link></Card></div>
    if (!kind) return <div className="min-h-full p-4 sm:p-8 flex items-center justify-center"><Card
        className="!p-6 sm:!p-10 max-w-lg text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#4f7cff]"/><h1
        className="mt-4 text-xl font-bold text-[#101827]">نوع رویدادی برای پلن شما تعریف نشده است</h1><p
        className="mt-2 text-sm leading-7 text-[#68758a]">اطلاعات نوع رویداد در اشتراک فعال دریافت نشد. لطفاً تنظیمات
        پلن را بررسی کنید یا با پشتیبانی تماس بگیرید.</p></Card></div>


    return (
        <div dir="rtl" className="min-h-full overflow-x-hidden bg-[#f4f7fb] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-4xl">
                <div className="mb-5 flex items-center gap-3 sm:mb-6">
                    <Link to="/dashboard"
                          aria-label="بازگشت به داشبورد"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#68758a] transition hover:bg-[#edf2ff] hover:text-[#3d66e8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/25">
                        <ArrowRight className="h-5 w-5"/>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-[#101827] sm:text-xl">ساخت رویداد جدید</h1>
                        <p className="mt-1 text-xs leading-6 text-[#68758a] sm:text-sm">{kindMeta.description}</p>
                    </div>
                </div>

                <nav aria-label="مراحل ساخت رویداد" className="mb-5 rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:mb-6 sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-[#253247]">مرحله {faNumber(step + 1)} از {faNumber(STEPS.length)}</span>
                        <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-xs font-semibold text-[#3d66e8]" aria-live="polite">{STEPS[step]}</span>
                    </div>
                    <ol className="grid grid-cols-3 gap-2">
                        {STEPS.map((label, index) => (
                            <li key={label} aria-current={index === step ? 'step' : undefined} className="min-w-0">
                                <div className={`h-1.5 rounded-full ${index <= step ? 'bg-[#4f7cff]' : 'bg-[#e9edf4]'}`} aria-hidden="true" />
                                <p className={`mt-2 truncate text-[11px] sm:text-xs ${index === step ? 'font-bold text-[#3d66e8]' : index < step ? 'font-medium text-[#536074]' : 'text-[#9aa4b4]'}`}>
                                    <span className="ml-1">{faNumber(index + 1)}.</span>{label}
                                </p>
                            </li>
                        ))}
                    </ol>
                </nav>

                <Card className="!p-4 sm:!p-7 lg:!p-8">
                    {step === 0 && (
                        <section aria-labelledby="event-details-heading" className="space-y-5">
                            <div className="sr-only" id="event-details-heading">اطلاعات اصلی {kindMeta.shortTitle}</div>
                            <div className="mb-2 flex items-center gap-3">
                                <span
                                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${kind === 'class' ? 'bg-[#edf2ff] text-[#4f7cff]' : 'bg-[#e8faf4] text-[#2eaf89]'}`}>{kind === 'class' ?
                                    <GraduationCap className="h-5 w-5"/> : <Users className="h-5 w-5"/>}</span>
                                <div><h2 className="font-bold text-[#101827]">{kindMeta.heading}</h2><p
                                    className="mt-1 text-xs text-[#8d98aa]">{kindMeta.description}</p></div>
                            </div>
                            <fieldset className="rounded-2xl border border-[#dfe6f2] bg-[#f8faff] p-3 sm:p-4">
                                <legend className="px-2 text-sm font-bold text-[#253247]">نوع رویداد را انتخاب کنید</legend>
                                <p className="mb-3 px-1 text-xs leading-6 text-[#68758a]">پیش‌نمایش زیر تفاوت فضای داخل هر نوع اتاق را نشان می‌دهد.</p>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {KIND_OPTIONS.map(({id, title: optionTitle, hint, icon: Icon}) => {
                                        const allowed = allowedRoomKinds.includes(id)
                                        const checked = kind === id
                                        return (
                                            <label key={id} className={`relative block min-w-0 ${allowed ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                <input
                                                    type="radio"
                                                    name="room-kind"
                                                    value={id}
                                                    checked={checked}
                                                    disabled={!allowed}
                                                    onChange={() => setSelectedKind(id)}
                                                    className="peer sr-only"
                                                    aria-describedby={`room-kind-${id}-hint${allowed ? '' : ' room-kind-locked-hint'}`}
                                                />
                                                <span className={`block h-full overflow-hidden rounded-2xl border-2 bg-white transition-colors focus-within:ring-4 focus-within:ring-[#4f7cff]/20 ${checked ? 'border-[#4f7cff] shadow-[0_8px_24px_rgba(79,124,255,.10)]' : allowed ? 'border-[#e1e6ef] hover:border-[#b9c8ef]' : 'border-[#e8eaf0] opacity-65'}`}>
                                                    <span className="flex items-center justify-between gap-3 px-4 pt-4">
                                                        <span className="flex min-w-0 items-center gap-3">
                                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${checked ? 'bg-[#edf2ff] text-[#3d66e8]' : 'bg-[#f0f3f8] text-[#68758a]'}`}>
                                                                <Icon className="h-5 w-5" aria-hidden="true" />
                                                            </span>
                                                            <span className="min-w-0">
                                                                <span className="block text-sm font-bold text-[#101827]">{optionTitle}</span>
                                                                <span className="mt-1 block text-[11px] leading-5 text-[#68758a]" id={`room-kind-${id}-hint`}>{hint}</span>
                                                            </span>
                                                        </span>
                                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${checked ? 'border-[#4f7cff] bg-[#4f7cff] text-white' : 'border-[#cbd4e2] bg-white text-transparent'}`} aria-hidden="true">
                                                            <Check className="h-3.5 w-3.5" />
                                                        </span>
                                                    </span>
                                                    <span className="mx-4 mt-4 block overflow-hidden rounded-xl border border-[#e7ebf2] bg-[#f7f9fc] p-3" aria-hidden="true">
                                                        {id === 'class' ? (
                                                            <span className="flex h-[104px] gap-2">
                                                                <span className="flex w-1/4 flex-col gap-2 rounded-lg bg-white p-2">
                                                                    <span className="h-2 w-3/4 rounded bg-[#dce5f7]" />
                                                                    <span className="h-2 w-full rounded bg-[#e9edf4]" />
                                                                    <span className="h-2 w-4/5 rounded bg-[#e9edf4]" />
                                                                    <span className="mt-auto h-5 rounded-md bg-[#edf2ff]" />
                                                                </span>
                                                                <span className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg bg-white p-2">
                                                                    <span className="flex items-center justify-between"><span className="h-2 w-1/3 rounded bg-[#dce5f7]" /><span className="h-2 w-1/5 rounded bg-[#e9edf4]" /></span>
                                                                    <span className="grid flex-1 grid-cols-3 gap-2">
                                                                        <span className="rounded-md bg-[#e8eefb]" /><span className="rounded-md bg-[#e8eefb]" /><span className="rounded-md bg-[#e8eefb]" />
                                                                    </span>
                                                                    <span className="h-2 w-2/5 rounded bg-[#dce5f7]" />
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex h-[104px] flex-col gap-2">
                                                                <span className="flex items-center justify-between"><span className="h-2 w-1/4 rounded bg-[#dce5f7]" /><span className="h-2 w-1/6 rounded bg-[#e9edf4]" /></span>
                                                                <span className="grid flex-1 grid-cols-3 gap-2">
                                                                    <span className="rounded-lg bg-[#dfe7f5]" /><span className="rounded-lg bg-[#dfe7f5]" /><span className="rounded-lg bg-[#dfe7f5]" />
                                                                </span>
                                                                <span className="mx-auto h-3 w-2/5 rounded-full bg-[#e9edf4]" />
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                                        <span className="text-[11px] font-medium text-[#68758a]">{id === 'class' ? 'چیدمان آموزشی با فضای محتوای کلاس' : 'چیدمان جلسه با نمایش شرکت‌کنندگان'}</span>
                                                        {!allowed ? (
                                                            <span id="room-kind-locked-hint" className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2.5 py-1 text-[10px] font-semibold text-[#8b5b13]">
                                                                <Lock className="h-3 w-3" aria-hidden="true" /> در پلن شما نیست
                                                            </span>
                                                        ) : checked ? (
                                                            <span className="text-[11px] font-bold text-[#3d66e8]">انتخاب‌شده</span>
                                                        ) : (
                                                            <span className="text-[11px] font-semibold text-[#68758a]">برای انتخاب لمس کنید</span>
                                                        )}
                                                    </span>
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                                <p className="mt-3 px-1 text-[11px] leading-5 text-[#8d98aa]">پیش‌نمایش‌ها شماتیک‌اند؛ چیدمان نهایی در موبایل و دسکتاپ متناسب با اندازه صفحه تنظیم می‌شود.</p>
                                {allowedRoomKinds.length < KIND_OPTIONS.length && (
                                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-6 text-[#68758a]">
                                        فقط نوع‌های موجود در پلن فعال قابل انتخاب‌اند. برای دسترسی به نوع دیگر،{' '}
                                        <Link to="/dashboard/pricing" className="font-bold text-[#3d66e8] underline underline-offset-2">پلن مناسب را از تعرفه‌ها</Link> تهیه کنید.
                                    </p>
                                )}
                            </fieldset>
                            <Input label={`عنوان ${kindMeta.shortTitle}`}
                                   placeholder={kind === 'class' ? 'مثلاً آموزش طراحی رابط کاربری' : 'مثلاً وبینار معرفی محصول'}
                                   value={title} onChange={(event) => {
                                setTitle(event.target.value);
                                if (!slugTouched) setSlug(slugify(event.target.value))
                            }} className="meet-auth-input"/>
                            <div>
                                <Input label={`شناسه ${kindMeta.shortTitle} (لینک)`} placeholder="project-management"
                                       value={slug} onChange={(event) => {
                                    setSlugTouched(true);
                                    setSlug(slugify(event.target.value))
                                }} className="meet-auth-input"/>
                                <p className="mt-1.5 text-xs text-[#8d98aa]">لینک ورود:
                                    meet.avestro.ir/join/{slug || 'your-event'}</p>
                            </div>
                            {kind === 'class' && (
                                <div>
                                    <Input label="نام معلم (اختیاری)" placeholder="مثلاً خانم احمدی" value={teacherName}
                                           maxLength={150} onChange={(event) => setTeacherName(event.target.value)}
                                           className="meet-auth-input"/>
                                    <p className="mt-1.5 text-xs text-[#8d98aa]">در گزارش حضور و غیاب نمایش داده می‌شود.
                                        اگر خالی بماند، نام صاحب حساب نوشته می‌شود.</p>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="event-description" className="text-sm font-medium text-[#536074]">توضیحات <span className="font-normal text-[#8d98aa]">(اختیاری)</span></label>
                                <textarea id="event-description" value={description} onChange={(event) => setDescription(event.target.value)}
                                          rows={3} maxLength={1000} placeholder="توضیح کوتاهی درباره رویداد..."
                                          className="min-h-[104px] w-full resize-y rounded-xl border border-[#d9e1ed] bg-white px-4 py-3 text-sm leading-6 text-[#101827] outline-none transition placeholder:text-[#9aa4b4] focus:border-[#7d9cff] focus:ring-4 focus:ring-[#4f7cff]/15" />
                                <p className="text-left text-[11px] text-[#8d98aa]">{faNumber(description.length)} از ۱۰۰۰ نویسه</p>
                            </div>
                            <fieldset className="rounded-2xl border border-[#e5eaf2] bg-[#fbfcfe] p-3 sm:p-4">
                                <legend className="px-2 text-sm font-bold text-[#536074]">زمان و ظرفیت رویداد</legend>
                                <div className="grid gap-4 sm:grid-cols-2">
                                <JalaliDateTimePicker label="تاریخ و ساعت برگزاری (اختیاری)" value={scheduledAt}
                                                      onChange={setScheduledAt}/>
                                <Input label="حداکثر شرکت‌کنندگان" type="number" min="2"
                                       max={participantLimit ?? undefined} value={maxParticipants}
                                       onChange={(event) => setMaxParticipants(event.target.value)}
                                       className="meet-auth-input"/>
                                <Input label="سهم تصاویر هم‌زمان این اتاق" type="number" min="1"
                                       max={imageLimit ?? undefined} value={allocatedVideoStreams}
                                       onChange={(event) => setAllocatedVideoStreams(event.target.value)}
                                       className="meet-auth-input"/>
                                </div>
                                <div className="mt-3 space-y-1 text-xs leading-6 text-[#68758a]">
                                    <p>{limitHint({total: budget.usersTotal, unit: 'نفر'})}</p>
                                    <p>{limitHint({total: budget.imagesTotal, unit: 'تصویر'})}</p>
                                </div>
                            </fieldset>
                            <label
                                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#e5eaf2] bg-white p-4 transition hover:border-[#b9c8ef]">
                                <input type="checkbox" checked={isPrivate}
                                       onChange={(event) => setIsPrivate(event.target.checked)}
                                       className="h-4 w-4 accent-[#4f7cff]"/>
                                <span className="text-sm text-[#536074]">{kindMeta.shortTitle} خصوصی <span
                                    className="text-xs text-[#9aa4b4]">(فقط با لینک مستقیم)</span></span>
                            </label>
                            <RoomAccessSettings allowGuests={allowGuests} onAllowGuests={setAllowGuests}
                                                selected={invitedPeople} onSelected={setInvitedPeople}/>
                        </section>
                    )}

                    {step === 1 && (
                        <section aria-labelledby="event-features-heading">
                            <div className="mb-5 flex items-center gap-3">
                                <span
                                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Settings2
                                    className="h-5 w-5"/></span>
                                <div><h2 id="event-features-heading" className="font-bold text-[#101827]">امکانات و
                                    تنظیمات {kindMeta.shortTitle}</h2><p
                                    className="mt-1 text-xs text-[#8d98aa]">قابلیت‌های قابل تنظیم این رویداد نمایش داده
                                    شده‌اند. وضعیت هر قابلیت مطابق پاسخ سرویس و پلن حساب شماست.</p></div>
                            </div>
                            <label
                                className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfe7f5] bg-[#f8faff] p-4">
                                <input type="checkbox" checked={configureFeatures}
                                       onChange={(event) => setConfigureFeatures(event.target.checked)}
                                       className="mt-1 h-4 w-4 accent-[#4f7cff]"/>
                                <span><span className="block text-sm font-semibold text-[#101827]">تنظیم امکانات در همین مرحله</span><span
                                    className="mt-1 block text-xs leading-5 text-[#8d98aa]">در صورت غیرفعال کردن، رویداد با تنظیمات فعلی حساب ساخته می‌شود و می‌توانید بعداً آن‌ها را تغییر دهید.</span></span>
                            </label>
                            {!configureFeatures ? (
                                <div
                                    className="rounded-xl border border-dashed border-[#dce3ef] p-6 text-center text-sm text-[#8d98aa]">تنظیمات
                                    این مرحله رد می‌شود و بعداً قابل انجام است.</div>
                            ) : featuresLoading ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#8d98aa]">
                                    <Loader2 className="h-4 w-4 animate-spin"/> در حال دریافت امکانات حساب…</div>
                            ) : featuresError ? (
                                <div
                                    className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">دریافت
                                    تنظیمات با خطا مواجه شد. می‌توانید این مرحله را رد کنید و بعداً از تنظیمات حساب
                                    انجام دهید.</div>
                            ) : (
                                <div className="space-y-3">
                                    {availableFeatures.length === 0 && (
                                        <div
                                            className="rounded-xl border border-dashed border-[#dce3ef] p-6 text-center text-sm leading-7 text-[#68758a]">پاسخ
                                            سرویس دریافت شد، اما هیچ‌کدام از پنج قابلیت موردنیاز در فهرست آن وجود ندارد.
                                            کلیدهای whiteboard، documents، speak_permission، raise_hand و attendance را
                                            در پاسخ API بررسی کنید.</div>
                                    )}
                                    {availableFeatures.map((feature) => {
                                        const meta = FEATURE_META[feature.key] || {
                                            title: feature.title,
                                            hint: 'این امکان بر اساس پلن و تنظیمات حساب قابل مدیریت است.',
                                            icon: Sparkles
                                        }
                                        const Icon = meta.icon
                                        const enabled = isFeatureEnabled(feature)
                                        const locked = feature.reason === 'not_in_plan'
                                        return (
                                            <div key={feature.key}
                                                 className={`group rounded-2xl border p-4 sm:p-5 transition-all ${enabled ? 'border-[#cfe9df] bg-gradient-to-l from-[#f0fbf6] to-white shadow-[0_8px_24px_rgba(35,155,114,.06)]' : locked ? 'border-[#e8eaf0] bg-[#fafbfe]' : 'border-[#e5eaf2] bg-white hover:border-[#cbd8ff] hover:shadow-sm'}`}>
                                                <div className="flex items-start gap-3">
                                                    <input id={`feature-${feature.key}`} type="checkbox"
                                                           checked={enabled} disabled={locked}
                                                           onChange={(event) => toggleFeature(feature.key, event.target.checked)}
                                                           className="mt-1 h-4 w-4 accent-[#4f7cff] disabled:opacity-40"/>
                                                    <label htmlFor={`feature-${feature.key}`}
                                                           className={`flex min-w-0 flex-1 items-start gap-3 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                        <span
                                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${enabled ? 'bg-[#def5eb] text-[#21966e]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}><Icon
                                                            className="h-4 w-4"/></span>
                                                        <span className="min-w-0 flex-1"><span
                                                            className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#101827]">{meta.title}{locked &&
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2.5 py-1 text-[10px] font-medium text-[#9b681b]"><Lock
                                                                className="h-3 w-3"/> خارج از پلن</span>}</span><span
                                                            className="mt-1 block text-xs leading-5 text-[#8d98aa]">{meta.hint}</span></span>
                                                    </label>
                                                    {enabled && <Check className="h-4 w-4 text-[#2eaf89]"/>}
                                                </div>
                                                {locked && <Link to="/pricing"
                                                                 className="inline-block mr-7 mt-2 text-[11px] text-[#4f7cff] underline">مشاهده
                                                    پلن‌های دارای این امکان</Link>}
                                                {enabled && feature.key === 'whiteboard' && (
                                                    <label
                                                        className="mt-3 mr-7 flex cursor-pointer items-center gap-2 rounded-lg bg-[#f8faff] p-3 text-xs text-[#536074]">
                                                        <input type="checkbox"
                                                               checked={Boolean(featureDraft.whiteboard?.settings?.students_can_draw ?? feature.settings?.students_can_draw)}
                                                               onChange={(event) => updateFeatureSetting('whiteboard', 'students_can_draw', event.target.checked, feature)}
                                                               className="h-4 w-4 accent-[#4f7cff]"/>
                                                        شرکت‌کنندگان بتوانند روی تخته بنویسند
                                                    </label>
                                                )}
                                                {enabled && feature.key === 'speak_permission' && (
                                                    <div
                                                        className="mt-3 mr-7 grid gap-3 rounded-lg bg-[#f8faff] p-3 sm:grid-cols-2">
                                                        {[['audio_default', 'وضعیت اولیه میکروفون'], ['video_default', 'وضعیت اولیه دوربین']].map(([name, label]) => (
                                                            <label key={name} className="text-xs text-[#536074]">{label}
                                                                <select
                                                                    value={featureDraft.speak_permission?.settings?.[name] || feature.settings?.[name] || 'muted'}
                                                                    onChange={(event) => updateFeatureSetting('speak_permission', name, event.target.value, feature)}
                                                                    className="mt-1.5 w-full rounded-lg border border-[#dfe5ef] bg-white px-3 py-2 text-sm">
                                                                    <option value="muted">بسته (با اجازه مدیر باز شود)
                                                                    </option>
                                                                    <option value="open">باز</option>
                                                                </select>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {step === 2 && (
                        <section aria-labelledby="event-review-heading">
                            <div className="mb-5 flex items-center gap-3"><span
                                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8faf4] text-[#2eaf89]"><ShieldCheck
                                className="h-5 w-5"/></span>
                                <div><h2 id="event-review-heading" className="font-bold text-[#101827]">بازبینی و ساخت {kindMeta.shortTitle}</h2><p
                                    className="mt-1 text-xs text-[#8d98aa]">قبل از ساخت، اطلاعات را بررسی کنید.</p>
                                </div>
                            </div>
                            <div className="divide-y divide-[#eef1f5] rounded-xl border border-[#e5eaf2] px-4">
                                {[
                                    ['نوع اتاق', kindMeta.title],
                                    ['عنوان', title || '—'],
                                    ['شناسه لینک', slug || '—'],
                                    ['ظرفیت', `${maxParticipants} نفر`],
                                    ['دسترسی', isPrivate ? 'خصوصی' : 'با لینک'],
                                    ['ورود مهمان', allowGuests ? 'مجاز' : 'غیرمجاز (فقط با کد ملی)'],
                                    ['افراد انتخاب‌شده', `${invitedPeople.length.toLocaleString('fa-IR')} نفر`],
                                    ['امکانات', configureFeatures ? 'تنظیم در این مرحله' : 'رد شده؛ تنظیم بعداً'],
                                ].map(([label, value]) => <div key={label}
                                                               className="flex items-center justify-between gap-4 py-3 text-sm">
                                    <span className="text-[#8d98aa]">{label}</span><span
                                    className="text-left font-medium text-[#101827]">{value}</span></div>)}
                            </div>
                            <div className="mt-5 rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div><h3 className="text-sm font-bold text-[#101827]">خلاصه امکانات و تنظیمات</h3><p
                                        className="mt-1 text-xs text-[#8d98aa]">وضعیتی که برای این رویداد انتخاب
                                        کرده‌اید</p></div>
                                    <span
                                        className="rounded-full bg-[#edf2ff] px-3 py-1 text-[11px] font-semibold text-[#4f7cff]">مرحله ۳</span>
                                </div>
                                {!configureFeatures ? (
                                    <div
                                        className="rounded-xl bg-[#f8faff] px-4 py-3 text-sm leading-6 text-[#68758a]">از
                                        تنظیم امکانات صرف‌نظر کرده‌اید؛ می‌توانید بعداً از بخش تنظیمات حساب آن‌ها را
                                        انجام دهید.</div>
                                ) : featuresLoading ? (
                                    <div className="flex items-center gap-2 py-3 text-xs text-[#8d98aa]"><Loader2
                                        className="h-4 w-4 animate-spin"/> در حال بارگذاری خلاصه تنظیمات…</div>
                                ) : featuresError ? (
                                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">امکان
                                        دریافت خلاصه تنظیمات وجود ندارد؛ می‌توانید پس از ساخت، آن‌ها را از تنظیمات حساب
                                        بررسی کنید.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {availableFeatures.map((feature) => {
                                            const meta = FEATURE_META[feature.key] || {
                                                title: feature.title,
                                                hint: 'امکان قابل مدیریت در این حساب',
                                                icon: Sparkles
                                            }
                                            const Icon = meta.icon
                                            const enabled = isFeatureEnabled(feature)
                                            return (
                                                <div key={feature.key}
                                                     className="flex items-start gap-3 rounded-xl bg-[#f8faff] px-3 py-3">
                                                    <span
                                                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-[#e7f8f1] text-[#239b72]' : 'bg-[#edf0f5] text-[#9aa4b4]'}`}><Icon
                                                        className="h-4 w-4"/></span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2"><span
                                                            className="text-xs font-semibold text-[#253247]">{meta.title}</span><span
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enabled ? 'bg-[#e7f8f1] text-[#239b72]' : 'bg-[#edf0f5] text-[#7d899b]'}`}>{enabled ? 'فعال' : 'غیرفعال'}</span>
                                                        </div>
                                                        {enabled && feature.key === 'whiteboard' &&
                                                            <p className="mt-1 text-[11px] text-[#7d899b]">نوشتن
                                                                شرکت‌کنندگان: {(featureDraft.whiteboard?.settings?.students_can_draw ?? feature.settings?.students_can_draw) ? 'مجاز' : 'غیرفعال'}</p>}
                                                        {enabled && feature.key === 'speak_permission' &&
                                                            <p className="mt-1 text-[11px] text-[#7d899b]">میکروفون: {(featureDraft.speak_permission?.settings?.audio_default || feature.settings?.audio_default || 'muted') === 'open' ? 'باز' : 'بسته'} ·
                                                                دوربین: {(featureDraft.speak_permission?.settings?.video_default || feature.settings?.video_default || 'muted') === 'open' ? 'باز' : 'بسته'}</p>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            <p className="mt-4 rounded-xl bg-[#f8faff] p-4 text-xs leading-6 text-[#68758a]">
                                <CalendarDays className="ml-1 inline h-4 w-4 text-[#4f7cff]"/> پس از ساخت، لینک ورود
                                رویداد در اختیار شما قرار می‌گیرد و می‌توانید آن را با شرکت‌کنندگان به اشتراک بگذارید.
                            </p>
                        </section>
                    )}

                    <div
                        className="sticky bottom-0 z-10 -mx-4 mt-7 flex flex-col-reverse gap-3 border-t border-[#e8edf4] bg-white/95 px-4 pb-1 pt-4 backdrop-blur sm:static sm:mx-0 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:border-t sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5 sm:backdrop-blur-0">
                        <div className="flex gap-2 sm:order-1">
                            {step > 0 &&
                                <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}><ArrowRight
                                    className="ml-1 h-4 w-4"/> قبلی</Button>}
                            <Link to="/dashboard"><Button type="button" variant="ghost">انصراف</Button></Link>
                        </div>
                        {
                            (step < 2) ? (
                                <Button type="button" size="lg" fullWidth className="sm:!w-auto"
                                        disabled={step === 1 && configureFeatures && featuresLoading} onClick={() => {
                                    if (step === 0) {
                                        if (!title.trim()) {
                                            toast.error(`عنوان ${kindMeta.shortTitle} الزامی است`);
                                            return
                                        }
                                        if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) {
                                            toast.error('شناسه لینک معتبر نیست');
                                            return
                                        }
                                        if (Number(maxParticipants) < 2 || (participantLimit != null && Number(maxParticipants) > participantLimit)) {
                                            toast.error('ظرفیت از کل پلن بیشتر است');
                                            return
                                        }
                                        if (Number(allocatedVideoStreams) < 1 || (imageLimit != null && Number(allocatedVideoStreams) > imageLimit)) {
                                            toast.error('سهم تصاویر از کل پلن بیشتر است');
                                            return
                                        }
                                    }
                                    if (step === 1 && configureFeatures && featuresError) {
                                        setConfigureFeatures(false)
                                    }
                                    setStep((current) => current + 1)
                                }}>ادامه <ArrowLeft className="mr-1 h-4 w-4"/></Button>
                            ) : (
                                <Button type="button" size="lg" fullWidth className="sm:!w-auto" loading={saving} disabled={saving}
                                        onClick={handleCreate}><Check
                                    className="ml-1 h-4 w-4"/> ساخت {kindMeta.shortTitle}</Button>
                            )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
