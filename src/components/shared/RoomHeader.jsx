import { memo, useEffect, useState } from 'react'
import { Mic, Check, Circle, Copy, Volume2, VolumeX, Wifi } from 'lucide-react'
import { useRoom } from '../../hooks/useRooms.js'
import { useAuthStore } from '../../store/authStore'

function Timer({ isConnected }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => { if (!isConnected) return; const interval = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(interval) }, [isConnected])
  const format = (n) => `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor((n % 3600) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  return <span className="text-[11px] text-white/45 tabular-nums hidden sm:block">{format(seconds)}</span>
}
function RecordingTimer({ seconds }) {
  const format = (n) => `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor((n % 3600) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
  return <span className="text-[11px] text-[var(--room-danger)] tabular-nums">{format(seconds)}</span>
}

export const RoomHeader = memo(function RoomHeader({ slug, isConnected, onCopyLink, isMeetingMuted, onToggleMeetingMute, isRecording, recordingSeconds, onToggleRecording, isVoiceRecording, voiceRecordingSeconds, onToggleVoiceRecording }) {
  const [copied, setCopied] = useState(false)
  const { data: room, isLoading, isError } = useRoom(slug)
  const currentUser = useAuthStore((s) => s.user)
  const isHost = room?.host?.id === currentUser?.id
  const handleCopy = () => { onCopyLink?.(); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <header className="h-[62px] bg-[var(--room-surface)]/95 backdrop-blur-xl border-b border-[var(--room-border)] flex items-center justify-between px-3 sm:px-5 shrink-0 relative z-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/avestro-logo.png" alt="اَوسترو" className="w-8 h-8 shrink-0 rounded-lg" />
        <div className="hidden sm:block min-w-0"><p className="text-white text-xs font-medium">اَوسترو میت</p><p className="text-[9px] text-white/25 mt-0.5 tracking-wide">AVESTRO MEET</p></div>
        <span className="text-white/15 hidden sm:block">/</span>
        <span className="text-white/60 text-xs truncate max-w-[130px] sm:max-w-[250px]">{(isLoading && !isError) ? slug : room?.title}</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/[.035] border border-white/[.06] px-3 py-2"><span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--room-mint)] shadow-[0_0_0_4px_rgba(84,217,176,.08)]' : 'bg-[var(--room-warning)] animate-pulse'}`} /><span className="text-[10px] text-white/55">{isConnected ? 'متصل' : 'در حال اتصال...'}</span><Timer isConnected={isConnected} /></div>

        {isHost && <button type="button" onClick={onToggleVoiceRecording} title={isVoiceRecording ? 'توقف ضبط صدا' : 'شروع ضبط صدا'} className={`hidden md:flex items-center gap-1.5 text-[10px] border rounded-xl px-2.5 py-2 transition-colors ${isVoiceRecording ? 'text-[var(--room-danger)] border-[var(--room-danger)]/30 bg-[var(--room-danger)]/10' : 'text-white/45 border-[var(--room-border)] hover:text-white/80 hover:bg-white/[.07]'}`}>{isVoiceRecording ? <><span className="w-1.5 h-1.5 rounded-full bg-[var(--room-danger)] animate-pulse" /><RecordingTimer seconds={voiceRecordingSeconds} /></> : <Mic className="w-3.5 h-3.5" />}<span>{isVoiceRecording ? 'ضبط صدا' : 'ضبط صدا'}</span></button>}
        {isHost && <button type="button" onClick={onToggleRecording} title={isRecording ? 'توقف ضبط جلسه' : 'شروع ضبط جلسه'} className={`hidden md:flex items-center gap-1.5 text-[10px] border rounded-xl px-2.5 py-2 transition-colors ${isRecording ? 'text-[var(--room-danger)] border-[var(--room-danger)]/30 bg-[var(--room-danger)]/10' : 'text-white/45 border-[var(--room-border)] hover:text-white/80 hover:bg-white/[.07]'}`}>{isRecording ? <><span className="w-1.5 h-1.5 rounded-full bg-[var(--room-danger)] animate-pulse" /><RecordingTimer seconds={recordingSeconds} /></> : <Circle className="w-3.5 h-3.5" />}<span>{isRecording ? 'در حال ضبط' : 'ضبط جلسه'}</span></button>}

        <button type="button" onClick={onToggleMeetingMute} title={isMeetingMuted ? 'روشن کردن صدای جلسه' : 'خاموش کردن صدای جلسه'} className={`hidden sm:flex items-center gap-1.5 text-[10px] border rounded-xl px-2.5 py-2 transition-colors ${isMeetingMuted ? 'text-[var(--room-danger)] border-[var(--room-danger)]/30 bg-[var(--room-danger)]/10' : 'text-white/45 border-[var(--room-border)] hover:text-white/80 hover:bg-white/[.07]'}`}>{isMeetingMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}<span>{isMeetingMuted ? 'صدا خاموش' : 'صدای جلسه'}</span></button>

        <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 text-[10px] text-white/55 hover:text-white border border-[var(--room-border)] bg-white/[.025] rounded-xl px-2.5 py-2 transition-colors">{copied ? <Check className="w-3.5 h-3.5 text-[var(--room-mint)]" /> : <Copy className="w-3.5 h-3.5" />}<span className="hidden sm:block">{copied ? 'کپی شد' : 'کپی لینک'}</span></button>
        <div className="flex items-center gap-1.5 mr-1"><span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--room-mint)]' : 'bg-[var(--room-warning)] animate-pulse'}`} /><Wifi className={`w-4 h-4 ${isConnected ? 'text-[var(--room-mint)]' : 'text-[var(--room-warning)]'}`} /></div>
      </div>
    </header>
  )
})
