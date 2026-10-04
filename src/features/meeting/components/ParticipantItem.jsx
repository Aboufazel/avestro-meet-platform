import { memo } from 'react'
import { Mic, MicOff, Video, VideoOff, Crown, Pin } from 'lucide-react'
import { useParticipants } from '../hooks/useParticipants'
import { useMeetingStore } from '../store/meeting-store'

export const ParticipantList = memo(function ParticipantList() {
  const { participants, count } = useParticipants()

  return (
    <div className="flex flex-col h-full text-white">
      <div className="px-4 py-3 border-b room-border shrink-0">
        <span className="text-white/45 text-xs">{count} شرکت‌کننده</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {participants.length === 0 ? (
          <p className="text-white/35 text-sm text-center mt-8">منتظر شرکت‌کنندگان...</p>
        ) : (
          participants.map((p) => <ParticipantItem key={p.id} participant={p} />)
        )}
      </div>
    </div>
  )
})

export const ParticipantItem = memo(function ParticipantItem({ participant }) {
  const pinnedParticipantId = useMeetingStore((s) => s.pinnedParticipantId)
  const initial = participant.displayName?.[0]?.toUpperCase() || '?'
  const isPinned = pinnedParticipantId === participant.id

  return (
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
      ${participant.isActiveSpeaker && !participant.isAudioMuted
        ? 'bg-[var(--room-mint-soft)]/10 ring-1 ring-[var(--room-mint)]/15'
        : 'hover:bg-white/[.04]'}
    `}>
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--room-surface-3)] border room-border flex items-center justify-center text-white text-sm font-medium">
          {initial}
        </div>
        {participant.isActiveSpeaker && !participant.isAudioMuted && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--room-mint)] border-2 border-[var(--room-surface)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-sm truncate">{participant.displayName}</span>
          {participant.isLocal && <span className="text-white/35 text-xs">(شما)</span>}
          {participant.isModerator && <Crown className="w-3 h-3 text-[var(--room-warning)] shrink-0" />}
        </div>
        {participant.isActiveSpeaker && !participant.isAudioMuted && (
          <span className="text-[10px] text-[var(--room-mint)]">در حال صحبت</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isPinned && <Pin className="w-3.5 h-3.5 text-[var(--room-blue-2)]" title="پین شده" />}
        {participant.isAudioMuted
          ? <MicOff className="w-3.5 h-3.5 text-[var(--room-danger)]" />
          : <Mic className="w-3.5 h-3.5 text-[var(--room-mint)]" />
        }
        {participant.isVideoMuted
          ? <VideoOff className="w-3.5 h-3.5 text-white/35" />
          : <Video className="w-3.5 h-3.5 text-[var(--room-mint)]" />
        }
      </div>
    </div>
  )
})
