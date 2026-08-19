import { memo } from 'react'
import { useParticipants } from '../hooks/useParticipants'
import { ParticipantItem } from './ParticipantItem'

export const ParticipantList = memo(
  function ParticipantList() {
    const { participants, count } = useParticipants()

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-olive-700 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-olive-100">
              شرکت‌کنندگان
            </h3>

            <span className="text-xs text-olive-500">
              {count} نفر
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {participants.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-olive-500">
                شرکت‌کننده‌ای وجود ندارد
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              {participants.map((participant) => (
                <ParticipantItem
                  key={participant.id}
                  participant={participant}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)