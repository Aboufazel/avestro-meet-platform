import { memo, useEffect, useState } from 'react'
import { X, Mic, Video, Volume2, Gauge, MonitorUp } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'
import { selectIsSettingsOpen } from '../store/meeting-selectors'
import {
  getDevices,
  setAudioInputDevice,
  setVideoInputDevice,
  setAudioOutputDevice,
  setVideoQuality,
  setScreenShareMode,
} from '../store/meeting-actions'
import { LOCAL_VIDEO_CONFIG, SCREEN_SHARE_PROFILES, getScreenShareMode } from '../jitsi/jitsi-config'

const QUALITY_OPTIONS = [
  { label: 'پایین (۱۸۰p) — مناسب اینترنت ضعیف', value: 180 },
  { label: 'متوسط (۳۶۰p)', value: 360 },
  { label: 'خوب (۴۸۰p)', value: 480 },
  { label: 'بالا (۷۲۰p)', value: 720 },
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
  // پیش‌فرض همان مقدار tier دستگاه است، نه عدد ثابت؛ تا «تایید» بدون تغییر،
  // کیفیت را بی‌دلیل پایین نیاورد.
  const [quality, setQuality] = useState(LOCAL_VIDEO_CONFIG.maxHeight)
  const [qualityTouched, setQualityTouched] = useState(false)
  const [shareMode, setShareMode] = useState(getScreenShareMode)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    getDevices().then((d) => {
      setDevices(d)
      if (d.audioInput[0]) setSelectedAudioInput(d.audioInput[0].deviceId)
      if (d.videoInput[0]) setSelectedVideoInput(d.videoInput[0].deviceId)
      if (d.audioOutput[0]) setSelectedAudioOutput(d.audioOutput[0].deviceId)
    })
  }, [isOpen])

  if (!isOpen) return null

  const handleApply = async () => {
    setLoading(true)
    try {
      if (selectedAudioInput) await setAudioInputDevice(selectedAudioInput)
      if (selectedVideoInput) await setVideoInputDevice(selectedVideoInput)
      if (selectedAudioOutput) await setAudioOutputDevice(selectedAudioOutput)
      if (qualityTouched) await setVideoQuality(quality)
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
                <DeviceSelect
                  icon={<Volume2 size={16} />}
                  label="خروجی صدا"
                  value={selectedAudioOutput}
                  onChange={setSelectedAudioOutput}
                  options={devices.audioOutput}
                />
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
                <span className="text-sm text-white/55 block mb-2">کیفیت ویدیوی ارسالی</span>
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
                      onChange={() => { setQuality(opt.value); setQualityTouched(true) }}
                      className="accent-[var(--room-blue)]"
                    />
                    <span className="text-sm text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

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
        {options.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || 'دستگاه ناشناس'}
          </option>
        ))}
      </select>
    </div>
  )
}