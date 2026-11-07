import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileCheck2, UploadCloud, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsService } from '../../services/payments'

const fa = (v) => Number(v || 0).toLocaleString('fa-IR')
const statusText = { required: 'در انتظار بارگذاری مدرک', submitted: 'مدرک ارسال شده و در انتظار بررسی ادمین', approved: 'مدرک تأیید شده است', rejected: 'مدرک نیازمند اصلاح است' }

export default function GovernmentDocumentCard({ documentInfo }) {
  const [file, setFile] = useState(null)
  const queryClient = useQueryClient()
  const upload = useMutation({
    mutationFn: () => paymentsService.uploadGovernmentDocument(file),
    onSuccess: () => { toast.success('مدرک برای بررسی ارسال شد.'); setFile(null); queryClient.invalidateQueries({ queryKey: ['my-subscription'] }) },
    onError: (error) => toast.error(error.response?.data?.detail || 'بارگذاری مدرک انجام نشد.'),
  })
  if (!documentInfo || documentInfo.status === 'approved') return null
  return <section className="rounded-2xl border border-[#ead9b2] bg-[#fffaf0] p-4 sm:p-5" aria-labelledby="gov-doc-title">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0cf] text-[#94620b]"><FileCheck2 size={20}/></span>
      <div className="min-w-0 flex-1">
        <h2 id="gov-doc-title" className="font-extrabold text-[#503c18]">مدارک مدرسه دولتی</h2>
        <p className="mt-1 text-sm leading-6 text-[#735d35]">{statusText[documentInfo.status] || statusText.required}</p>
        {documentInfo.due_at && <p className="mt-1 text-xs text-[#806b46]">مهلت بارگذاری: {new Date(documentInfo.due_at).toLocaleDateString('fa-IR')}</p>}
        {documentInfo.admin_note && <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs leading-6 text-[#735d35]">یادداشت بررسی: {documentInfo.admin_note}</p>}
        {documentInfo.status !== 'submitted' && <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-xs text-[#503c18] file:ml-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#503c18]" />
          <button type="button" disabled={!file || upload.isPending} onClick={() => upload.mutate()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#795718] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {upload.isPending ? <Loader2 size={15} className="animate-spin"/> : <UploadCloud size={15}/>} ارسال مدرک
          </button>
        </div>}
        {documentInfo.status === 'submitted' && <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#806b46]"><AlertCircle size={14}/> پس از بررسی ادمین، نتیجه در همین بخش نمایش داده می‌شود.</p>}
        <p className="mt-2 text-[11px] text-[#806b46]">فرمت‌های مجاز: PDF و تصویر · حداکثر ۱۰ مگابایت</p>
      </div>
    </div>
  </section>
}
