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
  // نمای معلم روی تخته به تفکیک صفحه: { "<page>": { zoom, x, y, t } }؛
  // t زمان سرور است و نمای قدیمی‌تر نمای جدیدتر را بازنویسی نمی‌کند
  const [whiteboardViews, setWhiteboardViews] = useState({})
  const [documentState, setDocumentState] = useState(null)
  // نمای معلم روی صفحه‌های سند: { "<page>": { zoom, x, y, t } } (مثل تخته؛ زمان از سرور)
  const [documentViews, setDocumentViews] = useState({})
  const sentDocViewRef = useRef(false)
  const docIdRef = useRef(null)
  const wsRef = useRef(null)
  const sentViewRef = useRef(false) // میزبانی که خودش نما فرستاده، نمای ذخیره‌شده‌ی سرور را روی نمای خودش نمی‌نویسد
  const applyWhiteboardView = useCallback((page, view) => {
    if (!view) return
    const key = String(page || 1)
    setWhiteboardViews((current) => {
      const existing = current[key]
      return existing && (view.t || 0) < (existing.t || 0) ? current : { ...current, [key]: view }
    })
  }, [])
  const applyDocumentView = useCallback((page, view) => {
    if (!view) return
    const key = String(page || 1)
    setDocumentViews((current) => {
      const existing = current[key]
      return existing && (view.t || 0) < (existing.t || 0) ? current : { ...current, [key]: view }
    })
  }, [])
  // نوشته‌های یک صفحه‌ی تخته (به‌روزرسانی زنده یا خوش‌بینانه‌ی خودِ فرستنده)
  const setWhiteboardPageObjects = useCallback((page, objects) => {
    setWhiteboardState((current) => (current
      ? {
        ...current,
        pages: { ...(current.pages || {}), [String(page)]: objects },
        objects: page === current.page ? objects : current.objects,
      }
      : current))
  }, [])
  const onScreenShareStateRef = useRef(null)
  const pendingMessagesRef = useRef([])

  useEffect(() => {
    if (!slug || !enabled) return undefined
    let closed = false
    let sessionEnded = false
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
          else if (msg.type === 'whiteboard_state') {
            setWhiteboardState(msg)
            if (!sentViewRef.current) Object.entries(msg.views || {}).forEach(([page, view]) => applyWhiteboardView(page, view))
          } else if (msg.type === 'whiteboard_view') applyWhiteboardView(msg.page, msg.view)
          else if (msg.type === 'whiteboard_objects') setWhiteboardPageObjects(msg.page, msg.objects || [])
          else if (msg.type === 'document_state') {
            setDocumentState(msg)
            const docId = msg.document?.id || null
            if (docId !== docIdRef.current) { // سند عوض شد: نمای سند قبلی معنا ندارد
              docIdRef.current = docId
              sentDocViewRef.current = false
              setDocumentViews({})
            }
            if (!sentDocViewRef.current) Object.entries(msg.views || {}).forEach(([page, view]) => applyDocumentView(page, view))
          } else if (msg.type === 'document_view') applyDocumentView(msg.page, msg.view)
          else if (msg.type === 'document_annotations') {
            setDocumentState((current) => (current?.document?.id === msg.document_id
              ? { ...current, annotations: { ...(current.annotations || {}), [String(msg.page)]: msg.objects || [] } }
              : current))
          } else if (msg.type === 'screenshare_state') onScreenShareStateRef.current?.(msg)
          else if (msg.type === 'video_limit_reached') window.dispatchEvent(new CustomEvent('meet:video-limit-reached'))
          else if (msg.type === 'video_permission_required') window.dispatchEvent(new CustomEvent('meet:video-permission-required'))
          else if (msg.type === 'session_ended') {
            sessionEnded = true
            setMe((current) => ({ ...(current || {}), audio: false, video: false, hand: false }))
            setRoster([])
            window.dispatchEvent(new CustomEvent('meet:session-ended'))
            ws.close(4409, 'session ended')
          }
        } catch { /* پیام نامعتبر */ }
      }
      ws.onclose = (ev) => {
        setConnected(false)
        if (closed || sessionEnded || ev.code === 4403 || ev.code === 4409) return
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
      setWhiteboardViews({})
      sentViewRef.current = false
      setDocumentState(null)
      setDocumentViews({})
      sentDocViewRef.current = false
      docIdRef.current = null
    }
  }, [slug, enabled, applyWhiteboardView, setWhiteboardPageObjects, applyDocumentView])

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
    setVideoActive: useCallback((active) => send({ type: 'video_state', active: Boolean(active) }), [send]),
    grant: useCallback((key, audio = true, video = true) => send({ type: 'grant', key, audio, video }), [send]),
    revoke: useCallback((key) => send({ type: 'revoke', key }), [send]),
    lowerHand: useCallback((key) => send({ type: 'lower_hand', key }), [send]),
    whiteboardState,
    whiteboardViews,
    // فقط میزبان: نمای زنده‌ی یک صفحه (final=false حین حرکت، final=true پایان حرکت و ذخیره برای ورودهای دیرتر)
    sendWhiteboardView: useCallback((page, view, final = false) => {
      sentViewRef.current = true
      // زمان نما را سرور می‌گذارد؛ این فقط برای باز شدن دوباره‌ی تخته‌ی خود میزبان است
      setWhiteboardViews((current) => ({ ...current, [String(page)]: view }))
      send({ type: 'whiteboard_view', page, zoom: view.zoom, x: view.x, y: view.y, final: Boolean(final) })
    }, [send]),
    publishScreenShareState: useCallback((participantId, isSharing, seq) => send({
      type: 'screenshare_state',
      participant_id: participantId,
      is_sharing: Boolean(isSharing),
      seq: Number(seq) || 0,
    }), [send]),
    setOnScreenShareState: useCallback((handler) => { onScreenShareStateRef.current = handler }, []),
    updateWhiteboardObjects: useCallback((objects, page) => {
      setWhiteboardPageObjects(page, objects) // سرور به فرستنده برنمی‌گرداند
      send({ type: 'whiteboard_update', objects, page })
    }, [send, setWhiteboardPageObjects]),
    setWhiteboardPage: useCallback((page) => {
      setWhiteboardState((current) => (current
        ? { ...current, page, objects: current.pages?.[String(page)] || [] }
        : current))
      send({ type: 'whiteboard_page', page })
    }, [send]),
    addWhiteboardPage: useCallback(() => send({ type: 'whiteboard_add_page' }), [send]),
    setWhiteboardOpen: useCallback((is_open) => send({ type: 'whiteboard_open', is_open }), [send]),
    clearWhiteboard: useCallback(() => send({ type: 'whiteboard_clear' }), [send]),
    // ── صحنه‌ی سند (اشتراک فایل در کلاس) ──
    documentState,
    documentViews,
    // فقط میزبان: نمای زنده‌ی یک صفحه‌ی سند (final=true در پایان حرکت برای ذخیره)
    sendDocumentView: useCallback((page, view, final = false) => {
      sentDocViewRef.current = true
      setDocumentViews((current) => ({ ...current, [String(page)]: view }))
      send({ type: 'document_view', page, zoom: view.zoom, x: view.x, y: view.y, final: Boolean(final) })
    }, [send]),
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
