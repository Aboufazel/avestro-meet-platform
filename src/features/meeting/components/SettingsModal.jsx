import { memo, useEffect, useState } from 'react'
import { X, Mic, Video, Volume2, Gauge, MonitorUp } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'
import { selectIsSettingsOpen } from '../store/meeting-selectors'
import {
  getDevices,
  getCurrentDevices,
  getVideoQuality,
  isAudioOutputChangeAvailable,
  setAudioInputDevice,
  setVideoInputDevice,
  setAudioOutputDevice,
  setVideoQuality,
  setScreenShareMode,
} from '../store/meeting-actions'
import { DEFAULT_VIDEO_QUALITY, SCREEN_SHARE_PROFILES, getScreenShareMode } from '../jitsi/jitsi-config'

const QUALITY_OPTIONS = [
  { label: 'پایین (۱۸۰p) — مناسب اینترنت ضعیف', value: 180 },
  { label: 'استاندارد (۳۶۰p) — پیش‌فرض', value: 360 },
  { label: 'خوب (۴۸۰p) — مصرف اینترنت بیشتر', value: 480 },
  { label: 'بالا (۷۲۰p) — مصرف اینترنت بسیار بیشتر', value: 720 },
]

const SHARE_MODE_OPTIONS = [
  { value: 'text', hint: 'کمترین مصرف اینترنت؛ برای اسلاید، PDF و متن' },
  { value: 'balanced', hint: 'پیش‌فرض؛ اسکرول و حرکت ماوس روان است' },
  { value: 'motion', hint: 'روان‌ترین؛ برای پخش ویدیو و انیمیشن (مصرف بیشتر)' },
]

export const SettingsModal = memo(function SettingsModal() {
  const isOpen = useMeetingStore(selectIsSettingsOpen)
  const closeSettings = useMeetingStore((s) => s.closeSettings)

  const [tab, setTab] = useState('devices')
  const [devices, setDevices] = useState({ audioInput: [], audioOutput: [], videoInput: [] })
  const [selectedAudioInput, setSelectedAudioInput] = useState('')
  const [selectedVideoInput, setSelectedVideoInput] = useState('')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('')
  // مقدارهای هنگام باز شدن مودال: فقط چیزی که کاربر واقعاً عوض کرده اعمال می‌شود
  const [initial, setInitial] = useState({ audioInput: '', videoInput: '', audioOutput: '', quality: DEFAULT_VIDEO_QUALITY })
  const [quality, setQuality] = useState(DEFAULT_VIDEO_QUALITY)
  const [outputSupported, setOutputSupported] = useState(true)
  const [shareMode, setShareMode] = useState(getScreenShareMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined
    let alive = true
    setError('')
    getDevices().then((d) => {
      if (!alive) return
      const current = getCurrentDevices()
      const savedOutput = useMeetingStore.getState().selectedAudioOutputId
      // دستگاه «فعلی» را انتخاب نشان بده (نه اولین دستگاه لیست)
      const pick = (list, id) => (id && list.some((item) => item.deviceId === id) ? id : '')
      const next = {
        audioInput: pick(d.audioInput, current.audioInput),
        videoInput: pick(d.videoInput, current.videoInput),
        audioOutput: pick(d.audioOutput, savedOutput || current.audioOutput),
      }
      const currentQuality = getVideoQuality()
      setDevices(d)
      setSelectedAudioInput(next.audioInput)
      setSelectedVideoInput(next.videoInput)
      setSelectedAudioOutput(next.audioOutput)
      setQuality(currentQuality)
      setInitial({ ...next, quality: currentQuality })
      setOutputSupported(isAudioOutputChangeAvailable())
    })
    return () => { alive = false }
  }, [isOpen])

  if (!isOpen) return null

  const handleApply = async () => {
    setLoading(true)
    setError('')
    try {
      const failed = []
      if (selectedAudioInput && selectedAudioInput !== initial.audioInput) {
        if (!(await setAudioInputDevice(selectedAudioInput))) failed.push('میکروفون')
      }
      if (selectedVideoInput && selectedVideoInput !== initial.videoInput) {
        if (!(await setVideoInputDevice(selectedVideoInput))) failed.push('دوربین')
      }
      if (outputSupported && selectedAudioOutput && selectedAudioOutput !== initial.audioOutput) {
        if (!(await setAudioOutputDevice(selectedAudioOutput))) failed.push('خروجی صدا')
      }
      if (quality !== initial.quality) await setVideoQuality(quality)

      if (failed.length) {
        setError(`تغییر ${failed.join(' و ')} انجام نشد. اجازه‌ی مرورگر و اتصال دستگاه را بررسی کنید.`)
        return
      }
      closeSettings()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--room-bg)]/85 p-4">
      <div className="w-full max-w-2xl bg-[var(--room-surface)] border border-white/[.08] rounded-[26px] overflow-hidden flex flex-col md:flex-row max-h-[85vh]">

        {/* Sidebar tabs */}
        <div className="md:w-48 shrink-0 border-b md:border-b-0 md:border-l border-white/[.07] flex md:flex-col">
          <button
            onClick={() => setTab('devices')}
            className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-3 text-sm ${
              tab === 'devices' ? 'bg-[var(--room-blue)]/15 text-white' : 'text-white/45 hover:bg-white/[.04]'
            }`}
          >
            <Mic size={16} /> صدا و تصویر
          </button>
          <button
            onClick={() => setTab('quality')}
            className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-3 text-sm ${
              tab === 'quality' ? 'bg-[var(--room-blue)]/15 text-white' : 'text-white/45 hover:bg-white/[.04]'
            }`}
          >
            <Gauge size={16} /> کیفیت تصویر
          </button>
          <button
            onClick={() => setTab('share')}
            className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-3 text-sm ${
              tab === 'share' ? 'bg-[var(--room-blue)]/15 text-white' : 'text-white/45 hover:bg-white/[.04]'
            }`}
          >
            <MonitorUp size={16} /> اشتراک صفحه
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.07] shrink-0">
            <h3 className="text-white font-medium">تنظیمات</h3>
            <button onClick={closeSettings} className="text-white/45 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {tab === 'devices' && (
              <>
                <DeviceSelect
                  icon={<Mic size={16} />}
                  label="میکروفون"
                  value={selectedAudioInput}
                  onChange={setSelectedAudioInput}
                  options={devices.audioInput}
                />
                <DeviceSelect
                  icon={<Video size={16} />}
                  label="دوربین"
                  value={selectedVideoInput}
                  onChange={setSelectedVideoInput}
                  options={devices.videoInput}
                />
                {outputSupported ? (
                  <DeviceSelect
                    icon={<Volume2 size={16} />}
                    label="خروجی صدا"
                    value={selectedAudioOutput}
                    onChange={setSelectedAudioOutput}
                    options={devices.audioOutput}
                  />
                ) : (
                  <p className="text-xs text-white/45">
                    این مرورگر تغییر خروجی صدا را پشتیبانی نمی‌کند؛ خروجی را از تنظیمات خود سیستم عوض کنید.
                  </p>
                )}
                <p className="text-xs text-white/45">
                  اگر میکروفون یا دوربین الان بسته است، دستگاه جدید هنگام روشن‌کردن بعدی اعمال می‌شود
                  (با انتخاب دستگاه، چیزی خودکار روشن نمی‌شود).
                </p>
              </>
            )}

            {tab === 'share' && (
              <div className="space-y-2">
                <span className="text-sm text-white/55 block mb-2">حالت اشتراک‌گذاری صفحه (همان لحظه اعمال می‌شود)</span>
                {SHARE_MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      shareMode === opt.value
                        ? 'border-[var(--room-blue-2)]/40 bg-[var(--room-blue)]/10'
                        : 'border-white/[.07] hover:bg-white/[.04]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="share-mode"
                      checked={shareMode === opt.value}
                      onChange={() => { setShareMode(opt.value); setScreenShareMode(opt.value) }}
                      className="accent-[var(--room-blue)] mt-1"
                    />
                    <span>
                      <span className="text-sm text-white block">{SCREEN_SHARE_PROFILES[opt.value].label}</span>
                      <span className="text-xs text-white/45 block mt-0.5">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {tab === 'quality' && (
              <div className="space-y-2">
                <span className="text-sm text-white/55 block mb-1">کیفیت تصویر (ارسال دوربین و تماشای تصویر بزرگ)</span>
                <span className="text-xs text-white/45 block mb-2">
                  پیش‌فرض ۳۶۰p است. کیفیت بالاتر مصرف اینترنت شما و سرور را بیشتر می‌کند؛ فقط در صورت نیاز افزایش دهید.
                </span>
                {QUALITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      quality === opt.value
                        ? 'border-[var(--room-blue-2)]/40 bg-[var(--room-blue)]/10'
                        : 'border-white/[.07] hover:bg-white/[.04]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quality"
                      checked={quality === opt.value}
                      onChange={() => setQuality(opt.value)}
                      className="accent-[var(--room-blue)]"
                    />
                    <span className="text-sm text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="px-5 py-2 text-xs text-[#ff9b9b] border-t border-white/[.07] shrink-0">{error}</p>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[.07] shrink-0">
            <button
              onClick={closeSettings}
              className="px-4 py-2 rounded-lg text-sm text-white/45 hover:text-white"
            >
              انصراف
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm bg-[var(--room-blue)] text-white hover:bg-[var(--room-blue-2)] disabled:opacity-50"
            >
              {loading ? 'در حال اعمال...' : 'تایید'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

function DeviceSelect({ icon, label, value, onChange, options }) {
  return (
    <div>
      <span className="text-sm text-white/55 flex items-center gap-2 mb-2">
        {icon} {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl bg-[var(--room-surface-3)] border border-white/[.07] px-3 text-sm text-white outline-none"
      >
        {options.length === 0 && <option value="">دستگاهی یافت نشد</option>}
        {options.length > 0 && value === '' && <option value="">پیش‌فرض سیستم</option>}
        {options.map((d, index) => (
          <option key={d.deviceId || index} value={d.deviceId}>
            {d.label || `دستگاه ${index + 1}`}
          </option>
        ))}
      </select>
    </div>
  )
}