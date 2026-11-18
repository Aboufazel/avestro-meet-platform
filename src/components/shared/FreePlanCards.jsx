import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import {Gift, Loader2, Users, Video, CalendarClock, Clock3, GraduationCap, MonitorPlay} from 'lucide-react'
import toast from 'react-hot-toast'
import {paymentsService} from '../../services/payments'
import {useAuthStore} from '../../store/authStore'
import {freePlanExplanation, isHoursPlan} from '../../utils/freePlan'

const fa = (n) => Number(n).toLocaleString('fa-IR')

function Card({plan, busy, onClaim}) {
    const Icon = plan.room_kind === 'class' ? GraduationCap : MonitorPlay
    const hours = isHoursPlan(plan)
    return <article className="flex flex-col rounded-[24px] border border-[#cfeee2] bg-white p-5 shadow-[0_12px_36px_rgba(20,35,65,.05)]">
        <div className="mb-4 flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8faf4] text-[#2eaf89]"><Icon size={20}/></span>
            <span className="rounded-full bg-[#e8faf4] px-3 py-1 text-xs font-bold text-[#1f8f6e]">رایگان</span>
        </div>
        <h3 className="text-base font-extrabold text-[#101827]">{plan.name}</h3>
        {plan.description && <p className="mt-1.5 text-xs leading-6 text-[#68758a]">{plan.description}</p>}
        <ul className="my-4 grid grid-cols-3 gap-2 text-center">
            <li className="rounded-xl bg-[#f6f8fc] px-2 py-3"><Users size={16} className="mx-auto mb-1.5 text-[#4f7cff]"/><b className="block text-sm">{fa(plan.users)}</b><span className="text-[11px] text-[#8d98aa]">کاربر</span></li>
            <li className="rounded-xl bg-[#f6f8fc] px-2 py-3"><Video size={16} className="mx-auto mb-1.5 text-[#4f7cff]"/><b className="block text-sm">{fa(plan.images)}</b><span className="text-[11px] text-[#8d98aa]">تصویر</span></li>
            {hours
                ? <li className="rounded-xl bg-[#f6f8fc] px-2 py-3"><Clock3 size={16} className="mx-auto mb-1.5 text-[#4f7cff]"/><b className="block text-sm">{fa(plan.usage_hours)}</b><span className="text-[11px] text-[#8d98aa]">ساعت استفاده</span></li>
                : <li className="rounded-xl bg-[#f6f8fc] px-2 py-3"><CalendarClock size={16} className="mx-auto mb-1.5 text-[#4f7cff]"/><b className="block text-sm">{fa(plan.duration_days)}</b><span className="text-[11px] text-[#8d98aa]">روز</span></li>}
        </ul>
        <p className="mb-4 rounded-xl bg-[#f0fbf7] px-3 py-2.5 text-xs leading-6 text-[#2f6b58]">{freePlanExplanation(plan)}</p>
        <button type="button" disabled={busy} onClick={() => onClaim(plan)}
                className="meet-primary-btn mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin"/> : <Gift size={16}/>} دریافت رایگان
        </button>
    </article>
}

/**
 * کارت‌های پلن رایگان بالای پلن‌ساز. اگر کاربر واجد شرایط نباشد (قبلاً پلن رایگان گرفته یا هر اشتراکی داشته)
 * سرور لیست خالی می‌دهد و هیچ چیزی نمایش داده نمی‌شود.
 */
export default function FreePlanCards() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const authenticated = useAuthStore((s) => Boolean(s.token))
    const {data} = useQuery({
        queryKey: ['free-plans', authenticated],
        queryFn: () => paymentsService.freePlans().then((r) => r.data),
    })
    const claim = useMutation({
        mutationFn: (plan) => paymentsService.claimFreePlan(plan.slug),
        onSuccess: () => {
            toast.success('پلن رایگان شما فعال شد')
            queryClient.invalidateQueries({queryKey: ['free-plans']})
            queryClient.invalidateQueries({queryKey: ['my-subscription']})
            navigate('/dashboard/subscription')
        },
        onError: (error) => {
            toast.error(error.response?.data?.detail || 'دریافت پلن رایگان ممکن نشد')
            queryClient.invalidateQueries({queryKey: ['free-plans']})
        },
    })
    const plans = data?.plans || []
    if (!plans.length) return null

    const onClaim = (plan) => {
        if (!authenticated) {
            navigate(`/register?free=${encodeURIComponent(plan.slug)}&next=${encodeURIComponent('/dashboard/subscription')}`)
            return
        }
        claim.mutate(plan)
    }

    return <section aria-labelledby="free-plans-title" className="mx-auto mb-10 max-w-5xl">
        <div className="mb-4 text-center">
            <h2 id="free-plans-title" className="text-lg font-extrabold text-[#101827] sm:text-xl">امتحان رایگان</h2>
            <p className="mt-1.5 text-xs leading-6 text-[#68758a]">با همه امکانات، بدون پرداخت؛ فقط با شماره موبایل.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => <Card key={plan.id} plan={plan} busy={claim.isPending && claim.variables?.id === plan.id} onClaim={onClaim}/>)}
        </div>
        <div className="mx-auto mt-8 flex max-w-md items-center gap-3 text-[11px] text-[#a6afbd]"><span className="h-px flex-1 bg-[#e1e6ef]"/>یا پلن اختصاصی خودتان را بسازید<span className="h-px flex-1 bg-[#e1e6ef]"/></div>
    </section>
}
