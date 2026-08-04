import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Globe, Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import toast from 'react-hot-toast'

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 50)
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    date: '',
    time: '',
    capacity: '۱۰۰',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (form.title) setForm((f) => ({ ...f, slug: slugify(form.title) }))
  }, [form.title])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'عنوان رویداد الزامی است'
    if (!form.date) e.date = 'تاریخ الزامی است'
    if (!form.time) e.time = 'ساعت الزامی است'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1300))
    toast.success('رویداد با موفقیت ایجاد شد')
    navigate(`/join/${form.slug || 'new-event'}`)
    setLoading(false)
  }

  const previewLink = `austro.meet/${form.slug || 'slug-رویداد'}`

  return (
    <div className="min-h-full bg-olive-950 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-olive-500 hover:text-olive-300 transition-colors p-1"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-olive-100" style={{ fontWeight: 700 }}>رویداد جدید</h1>
          <p className="text-olive-500 text-sm">یک جلسه آنلاین بسازید</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <h2 className="text-olive-300 text-sm mb-4">اطلاعات اصلی</h2>
          <div className="flex flex-col gap-4">
            <Input
              label="عنوان رویداد"
              placeholder="مثال: جلسه بررسی طرح سالانه"
              value={form.title}
              onChange={set('title')}
              error={errors.title}
              name="title"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-olive-300">آدرس (Slug)</label>
              <div className="flex items-center bg-olive-900 border border-olive-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-olive-500/50 focus-within:border-olive-500 transition-all">
                <span className="px-3 text-olive-600 text-sm border-l border-olive-700 py-2.5 shrink-0 bg-olive-800">
                  austro.meet/
                </span>
                <input
                  value={form.slug}
                  onChange={set('slug')}
                  placeholder="slug-roeidad"
                  className="flex-1 bg-transparent px-3 py-2.5 text-olive-100 placeholder:text-olive-700 focus:outline-none text-sm"
                  style={{ direction: 'ltr' }}
                />
              </div>
              <p className="text-olive-600 text-xs flex items-center gap-1">
                پیش‌نمایش: <span className="text-olive-400">{previewLink}</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-olive-300">توضیحات (اختیاری)</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="توضیحات رویداد را وارد کنید..."
                rows={3}
                className="bg-olive-900 border border-olive-700 rounded-xl px-4 py-2.5 text-olive-100 placeholder:text-olive-600 focus:outline-none focus:ring-2 focus:ring-olive-500/50 focus:border-olive-500 transition-all resize-none text-sm"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-olive-300 text-sm mb-4">زمان‌بندی</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="تاریخ"
              type="date"
              value={form.date}
              onChange={set('date')}
              error={errors.date}
              name="date"
            />
            <Input
              label="ساعت"
              type="time"
              value={form.time}
              onChange={set('time')}
              error={errors.time}
              name="time"
            />
          </div>
          <div className="mt-4">
            <Input
              label="حداکثر شرکت‌کنندگان"
              type="number"
              value={form.capacity}
              onChange={set('capacity')}
              placeholder="۱۰۰"
              name="capacity"
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-olive-100 text-sm">حریم خصوصی</p>
              <p className="text-olive-500 text-xs mt-0.5">
                {isPrivate ? 'فقط با لینک مستقیم قابل دسترسی' : 'همه می‌توانند در رویداد شرکت کنند'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${isPrivate ? 'text-olive-400' : 'text-olive-600'}`}>
                {isPrivate ? (
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> خصوصی
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> عمومی
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsPrivate((v) => !v)}
                className={[
                  'w-12 h-6 rounded-full transition-all duration-200 relative',
                  isPrivate ? 'bg-olive-500' : 'bg-olive-700',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200',
                    isPrivate ? 'right-1' : 'left-1',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={loading} fullWidth>
            ایجاد رویداد
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            انصراف
          </Button>
        </div>
      </form>
    </div>
  )
}
