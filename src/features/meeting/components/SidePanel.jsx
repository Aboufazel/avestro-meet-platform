import { memo } from 'react'

import { useMeetingStore } from '../store/meeting-store'

import {
  selectActivePanelTab,
  selectIsPanelOpen,
} from '../store/meeting-selectors'

import { ParticipantList } from './ParticipantList'
import { ChatPanel } from './ChatPanel'

export const SidePanel = memo(
  function SidePanel() {
    const isOpen =
      useMeetingStore(selectIsPanelOpen)

    const activeTab =
      useMeetingStore(selectActivePanelTab)

    if (!isOpen) return null

    return (
      <aside
        className="
          w-80
          border-r
          border-olive-800
          bg-olive-950
          shrink-0
        "
      >
        {activeTab === 'participants' && (
          <ParticipantList />
        )}

        {activeTab === 'chat' && (
          <ChatPanel />
        )}
      </aside>
    )
  }
)