import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { useCreateRoom } from '../../hooks/useRooms'

const schema = yup.object({
  title: yup.string().required('عنوان رویداد الزامی است'),
  slug: yup.string()
    .required('شناسه رویداد الزامی است')
    .matches(/^[a-z0-9-]+$/, 'فقط حروف انگلیسی کوچک، اعداد و خط تیره'),
  description: yup.string(),
  scheduled_at: yup.string(),
  max_participants: yup.number()
    .typeError('عدد وارد کنید')
    .min(2, 'حداقل ۲ نفر')
    .max(2000, 'حداکثر ۵۰۰ نفر')
    .required(),
  is_private: yup.boolean(),
})

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
}

export default function CreateEventPage() {
  const { mutate: createRoom, isPending } = useCreateRoom()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { title: '', slug: '', description: '', scheduled_at: '', max_participants: 100, is_private: false },
  })

  const slug = watch('slug')

  function onSubmit(data) {
    createRoom({
      ...data,
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null,
    })
  }

  return (
    <div className="min-h-full bg-[#f4f7fb] p-4 sm:p-6">
      <div className="max-w-2xl">

        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl text-[#8d98aa] hover:bg-[#edf2ff] hover:text-[#4f7cff] transition-all">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[#101827] font-bold text-lg">رویداد جدید</h1>
            <p className="text-[#8d98aa] text-sm">اطلاعات سمینار یا جلسه خود را وارد کنید</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            <Input
              label="عنوان رویداد"
              placeholder="مثال: سمینار مدیریت پروژه"
              error={errors.title?.message}
              className="meet-auth-input"
              {...register('title', {
                onChange: (e) => setValue('slug', slugify(e.target.value))
              })}
            />

            <div>
              <Input
                label="شناسه رویداد (لینک)"
                placeholder="project-management"
                error={errors.slug?.message}
                className="meet-auth-input"
                {...register('slug')}
              />
              {slug && !errors.slug && (
                <p className="text-[#8d98aa] text-xs mt-1.5">لینک جلسه: meet.avestro.ir/join/{slug}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#536074]">توضیحات (اختیاری)</label>
              <textarea
                placeholder="توضیحاتی درباره رویداد..."
                rows={3}
                className="w-full bg-[#f8faff] border border-[#e1e6ef] rounded-xl px-4 py-2.5 text-[#101827] placeholder:text-[#a6afbd] outline-none focus:ring-2 focus:ring-[#4f7cff]/15 focus:border-[#9eb6ff] transition-all resize-none"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="تاریخ و ساعت برگزاری (اختیاری)"
                type="datetime-local"
                error={errors.scheduled_at?.message}
                className="meet-auth-input"
                {...register('scheduled_at')}
              />
              <Input
                label="حداکثر شرکت‌کنندگان"
                type="number"
                error={errors.max_participants?.message}
                className="meet-auth-input"
                {...register('max_participants')}
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-[#f8faff] rounded-xl border border-[#e5eaf2]">
              <input
                type="checkbox"
                id="is_private"
                className="w-4 h-4 accent-[#4f7cff] cursor-pointer"
                {...register('is_private')}
              />
              <label htmlFor="is_private" className="text-[#536074] text-sm cursor-pointer">
                رویداد خصوصی
                <span className="text-[#9aa4b4] text-xs mr-1">(فقط با لینک مستقیم)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isPending} size="lg">ایجاد رویداد</Button>
              <Link to="/dashboard">
                <Button variant="ghost" size="lg" type="button">انصراف</Button>
              </Link>
            </div>

          </form>
        </Card>
      </div>
    </div>
  )
}