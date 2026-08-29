import { memo, useEffect, useState } from 'react'
import { Wifi, WifiOff, Copy, Check, Volume2, VolumeX, Circle, Square } from 'lucide-react'

function Timer({ isConnected }) {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        if (!isConnected) return
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000)
        return () => clearInterval(interval)
    }, [isConnected])

    const format = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600)
        const m = Math.floor((totalSeconds % 3600) / 60)
        const s = totalSeconds % 60
        const pad = (n) => String(n).padStart(2, '0')
        return `${pad(h)}:${pad(m)}:${pad(s)}`
    }

    return (
        <span className="text-xs text-olive-500 tabular-nums hidden sm:block">
            {format(seconds)}
        </span>
    )
}

function RecordingTimer({ seconds }) {
    const format = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600)
        const m = Math.floor((totalSeconds % 3600) / 60)
        const s = totalSeconds % 60
        const pad = (n) => String(n).padStart(2, '0')
        return `${pad(h)}:${pad(m)}:${pad(s)}`
    }

    return (
        <span className="text-xs text-red-400 tabular-nums">
            {format(seconds)}
        </span>
    )
}

export const RoomHeader = memo(function RoomHeader({
    slug,
    isConnected,
    onCopyLink,
    isMeetingMuted,
    onToggleMeetingMute,
    isRecording,
    recordingSeconds,
    onToggleRecording,
}) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        onCopyLink?.()
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <header className="h-14 bg-olive-900 border-b border-olive-800 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <img src="/avestro-logo.png" alt="اَوسترو" className="w-7 h-7 shrink-0" />
                <span className="text-olive-100 font-medium text-sm hidden sm:block">اَوسترو میت</span>
                <span className="text-olive-600 text-sm hidden sm:block">·</span>
                <span className="text-olive-500 text-sm truncate max-w-[120px] sm:max-w-none">{slug}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <Timer isConnected={isConnected} />

                <div className="flex items-center gap-1">
                    {isConnected ? (
                        <Wifi className="w-4 h-4 text-olive-500" />
                    ) : (
                        <WifiOff className="w-4 h-4 text-olive-600 animate-pulse" />
                    )}
                    <span className="text-xs text-olive-500 hidden sm:block">
                        {isConnected ? 'متصل' : 'در حال اتصال...'}
                    </span>
                </div>

                {/* دکمه‌ی ضبط جلسه */}
                <button
                    type="button"
                    onClick={onToggleRecording}
                    title={isRecording ? 'توقف ضبط جلسه' : 'شروع ضبط جلسه'}
                    className={`flex items-center gap-1.5 text-xs transition-colors border rounded-lg px-2.5 py-1.5
                        ${isRecording
                            ? 'text-red-400 border-red-500/50 bg-red-500/10 hover:bg-red-500/20'
                            : 'text-olive-500 border-olive-800 hover:text-olive-300'
                        }`}
                >
                    {isRecording ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <RecordingTimer seconds={recordingSeconds} />
                        </>
                    ) : (
                        <Circle className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:block">{isRecording ? 'در حال ضبط' : 'ضبط جلسه'}</span>
                </button>

                <button
                    type="button"
                    onClick={onToggleMeetingMute}
                    title={isMeetingMuted ? 'روشن کردن صدای جلسه' : 'خاموش کردن صدای جلسه'}
                    className={`flex items-center gap-1.5 text-xs transition-colors border rounded-lg px-2.5 py-1.5
                        ${isMeetingMuted
                            ? 'text-red-400 border-red-500/40 hover:text-red-300 hover:border-red-400'
                            : 'text-olive-500 border-olive-800 hover:text-olive-300'
                        }`}
                >
                    {isMeetingMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:block">{isMeetingMuted ? 'صدا خاموش' : 'صدای جلسه'}</span>
                </button>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-olive-500 hover:text-olive-300 transition-colors border border-olive-800 rounded-lg px-2.5 py-1.5"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:block">{copied ? 'کپی شد' : 'کپی لینک'}</span>
                </button>
            </div>
        </header>
    )
})