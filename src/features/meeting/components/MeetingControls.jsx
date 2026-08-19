import { memo } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Users,
  MessageSquare,
} from 'lucide-react'

import { useMeetingStore } from '../store/meeting-store'
import {
  selectUnreadCount,
  selectActivePanelTab,
  selectIsPanelOpen,
} from '../store/meeting-selectors'

export const MeetingControls = memo(function MeetingControls({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,

  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}) {
  const unreadCount = useMeetingStore(selectUnreadCount)

  const activeTab = useMeetingStore(selectActivePanelTab)

  const isPanelOpen = useMeetingStore(selectIsPanelOpen)

  const togglePanel = useMeetingStore((s) => s.togglePanel)

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 rounded-2xl border border-olive-700 bg-olive-900/90 backdrop-blur-md p-2 shadow-xl">

        <ControlButton
          active={!isAudioMuted}
          onClick={onToggleAudio}
          icon={
            isAudioMuted
              ? <MicOff size={18} />
              : <Mic size={18} />
          }
        />

        <ControlButton
          active={!isVideoMuted}
          onClick={onToggleVideo}
          icon={
            isVideoMuted
              ? <VideoOff size={18} />
              : <Video size={18} />
          }
        />

        <ControlButton
          active={isScreenSharing}
          onClick={onToggleScreenShare}
          icon={<MonitorUp size={18} />}
        />

        <ControlButton
          active={isPanelOpen && activeTab === 'participants'}
          onClick={() => togglePanel('participants')}
          icon={<Users size={18} />}
        />

        <div className="relative">
          <ControlButton
            active={isPanelOpen && activeTab === 'chat'}
            onClick={() => togglePanel('chat')}
            icon={<MessageSquare size={18} />}
          />

          {unreadCount > 0 && (
            <span
              className="
                absolute
                -top-1
                -left-1
                min-w-5
                h-5
                rounded-full
                bg-red-500
                text-white
                text-[10px]
                flex
                items-center
                justify-center
                px-1
              "
            >
              {unreadCount}
            </span>
          )}
        </div>

        <ControlButton
          danger
          onClick={onLeave}
          icon={<PhoneOff size={18} />}
        />
      </div>
    </div>
  )
})

function ControlButton({
  icon,
  active = false,
  danger = false,
  onClick,
}) {
  let classes =
    'w-11 h-11 rounded-xl flex items-center justify-center transition-all'

  if (danger) {
    classes +=
      ' bg-red-600 hover:bg-red-500 text-white'
  } else if (active) {
    classes +=
      ' bg-olive-600 text-white'
  } else {
    classes +=
      ' bg-olive-800 text-olive-300 hover:bg-olive-700'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
    >
      {icon}
    </button>
  )
}