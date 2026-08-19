import { memo } from 'react'
import { Mic, MicOff, Video, VideoOff, Crown } from 'lucide-react'
import { useParticipants } from '../hooks/useParticipants'

export const ParticipantList = memo(function ParticipantList() {
  const { participants, count } = useParticipants()

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-olive-700 shrink-0">
        <span className="text-olive-400 text-xs">{count} شرکت‌کننده</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {participants.length === 0 ? (
          <p className="text-olive-600 text-sm text-center mt-8">منتظر شرکت‌کنندگان...</p>
        ) : (
          participants.map((p) => (
            <ParticipantItem key={p.id} participant={p} />
          ))
        )}
      </div>
    </div>
  )
})

export const ParticipantItem = memo(function ParticipantItem({ participant }) {
  const initial = participant.displayName?.[0]?.toUpperCase() || '?'

  return (
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
      ${participant.isActiveSpeaker ? 'bg-olive-800/60' : 'hover:bg-olive-800/40'}
    `}>
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-olive-700 flex items-center justify-center text-olive-100 text-sm font-medium">
          {initial}
        </div>
        {participant.isActiveSpeaker && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-olive-400 border-2 border-olive-900" />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-olive-100 text-sm truncate">
            {participant.displayName}
          </span>
          {participant.isLocal && (
            <span className="text-olive-600 text-xs">(شما)</span>
          )}
          {participant.isModerator && (
            <Crown className="w-3 h-3 text-olive-400 shrink-0" />
          )}
        </div>
      </div>

      {/* Media status */}
      <div className="flex items-center gap-1.5 shrink-0">
        {participant.isAudioMuted
          ? <MicOff className="w-3.5 h-3.5 text-red-400" />
          : <Mic className="w-3.5 h-3.5 text-olive-500" />
        }
        {participant.isVideoMuted
          ? <VideoOff className="w-3.5 h-3.5 text-red-400" />
          : <Video className="w-3.5 h-3.5 text-olive-500" />
        }
      </div>
    </div>
  )
})