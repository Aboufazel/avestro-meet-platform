import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentExternalId } from '../features/meeting/store/meeting-actions'

/**
 * آدرس WebSocket: از VITE_WS_BASE_URL (اگر بود) وگرنه از VITE_API_BASE_URL ساخته می‌شود.
 *   http://localhost:8000/api/v1        → ws://localhost:8000
 *   https://raya-api.avestro.ir/api/v1  → wss://raya-api.avestro.ir
 */
function wsBase() {
  const explicit = import.meta.env.VITE_WS_BASE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const api = import.meta.env.VITE_API_BASE_URL || ''
  return api.replace(/\/api\/v\d+\/?$/, '').replace(/^http/, 'ws')
}

/**
 * اتصال لحظه‌ای به سرور برای اجازه‌ی میکروفون/دوربین و دست‌بلندکردن.
 *
 *  me      : {moderated, hand_enabled, hand, audio, video} برای خودِ کاربر (null تا رسیدن اولین پیام)
 *  roster  : (فقط میزبان) حاضران آنلاین با hand_at، audio، video
 *  اکشن‌ها : raiseHand(bool) برای دانش‌آموز؛ grant/revoke/lowerHand برای میزبان
 */
export function useClassAccess(slug, { enabled = false } = {}) {
  const [me, setMe] = useState(null)
  const [roster, setRoster] = useState([])
  const [connected, setConnected] = useState(false)
  const [whiteboardState, setWhiteboardState] = useState(null)
  const [documentState, setDocumentState] = useState(null)
  const wsRef = useRef(null)
  const onScreenShareStateRef = useRef(null)
  const pendingMessagesRef = useRef([])

  useEffect(() => {
    if (!slug || !enabled) return undefined
    let closed = false
    let retry = 0
    let timer = null

    const connect = () => {
      const eid = getCurrentExternalId()
      if (!eid) {
        timer = setTimeout(connect, 500)
        return
      }
      const ws = new WebSocket(`${wsBase()}/ws/rooms/${encodeURIComponent(slug)}/?eid=${encodeURIComponent(eid)}`)
      wsRef.current = ws
      ws.onopen = () => {
        retry = 0
        setConnected(true)
        const queued = pendingMessagesRef.current.splice(0)
        queued.forEach((message) => ws.send(JSON.stringify(message)))
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'me') setMe(msg)
          else if (msg.type === 'roster') setRoster(msg.items || [])
          else if (msg.type === 'whiteboard_state') setWhiteboardState(msg)
          else if (msg.type === 'document_state') setDocumentState(msg)
          else if (msg.type === 'document_annotations') {
            setDocumentState((current) => (current?.document?.id === msg.document_id
              ? { ...current, annotations: { ...(current.annotations || {}), [String(msg.page)]: msg.objects || [] } }
              : current))
          } else if (msg.type === 'screenshare_state') onScreenShareStateRef.current?.(msg)
        } catch { /* پیام نامعتبر */ }
      }
      ws.onclose = (ev) => {
        setConnected(false)
        if (closed || ev.code === 4403) return
        retry += 1
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry, 10000))
      }
      ws.onerror = () => ws.close()
    }
    connect()

    return () => {
      closed = true
      clearTimeout(timer)
      wsRef.current?.close()
      wsRef.current = null
      pendingMessagesRef.current = []
      setConnected(false)
      setWhiteboardState(null)
      setDocumentState(null)
    }
  }, [slug, enabled])

  const send = useCallback((msg) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    else if (ws && ws.readyState === WebSocket.CONNECTING) pendingMessagesRef.current.push(msg)
  }, [])

  return {
    me,
    roster,
    connected,
    raiseHand: useCallback((raised) => send({ type: 'hand', raised }), [send]),
    grant: useCallback((key, audio = true, video = true) => send({ type: 'grant', key, audio, video }), [send]),
    revoke: useCallback((key) => send({ type: 'revoke', key }), [send]),
    lowerHand: useCallback((key) => send({ type: 'lower_hand', key }), [send]),
    whiteboardState,
    publishScreenShareState: useCallback((participantId, isSharing, seq) => send({
      type: 'screenshare_state',
      participant_id: participantId,
      is_sharing: Boolean(isSharing),
      seq: Number(seq) || 0,
    }), [send]),
    setOnScreenShareState: useCallback((handler) => { onScreenShareStateRef.current = handler }, []),
    updateWhiteboardObjects: useCallback((objects) => send({ type: 'whiteboard_update', objects }), [send]),
    setWhiteboardOpen: useCallback((is_open) => send({ type: 'whiteboard_open', is_open }), [send]),
    clearWhiteboard: useCallback(() => send({ type: 'whiteboard_clear' }), [send]),
    // ── صحنه‌ی سند (اشتراک فایل در کلاس) ──
    documentState,
    openDocument: useCallback((documentId) => send({ type: 'document_open', document_id: documentId }), [send]),
    closeDocument: useCallback(() => send({ type: 'document_close' }), [send]),
    setDocumentPage: useCallback((page) => {
      setDocumentState((current) => (current ? { ...current, page } : current))
      send({ type: 'document_page', page })
    }, [send]),
    setDocumentSettings: useCallback((settings) => {
      setDocumentState((current) => (current ? { ...current, ...settings } : current))
      send({ type: 'document_settings', ...settings })
    }, [send]),
    clearDocumentPage: useCallback((page) => {
      setDocumentState((current) => (current ? { ...current, annotations: { ...(current.annotations || {}), [String(page)]: [] } } : current))
      send({ type: 'document_clear_page', page })
    }, [send]),
    annotateDocument: useCallback((page, objects) => {
      setDocumentState((current) => (current ? { ...current, annotations: { ...(current.annotations || {}), [String(page)]: objects } } : current))
      send({ type: 'document_annotate', page, objects })
    }, [send]),
  }
}
