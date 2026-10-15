// src/features/meeting/jitsi/recordingService.js
//
// سرویس ضبط جلسه (سمت کلاینت).
//
// تغییرات نسبت به نسخه‌ی قبل:
//  - سقف رزولوشن/فریم‌ریت روی getDisplayMedia (روی Retina قبلاً تصویر با
//    رزولوشن بومی گرفته و انکود می‌شد → CPU بالا، فریم‌دراپ، تصویر سیاه)
//  - صدا به‌جای صدای تب + میکروفون جدا، مستقیم از trackهای خود Jitsi میکس
//    می‌شود (روی Safari هم کار می‌کند، echo/دوباره‌ضبطی ندارد، شرکت‌کننده‌ی
//    جدید وسط ضبط خودکار اضافه می‌شود)
//  - ضبط صدا (voice) دیگر getDisplayMedia نمی‌خواهد (فقط صدا)
//  - MediaRecorder با timeslice + ذخیره‌ی chunkها در IndexedDB؛ اگر تب
//    کرش کند/بسته شود، ضبط در ورود بعدی بازیابی می‌شود
//  - mp4/H264 برای Safari، webm/VP8 برای بقیه
//  - AudioContext.resume() (روی Safari بدون آن صدا ضبط نمی‌شد)
//  - اگر recorder قبل از stop خودش متوقف شده باشد، داده دور ریخته نمی‌شود

export const RECORDING_QUALITY_PRESETS = {
    low: {frameRate: 8, width: 854, height: 480, videoBitsPerSecond: 350_000, audioBitsPerSecond: 32_000},
    medium: {frameRate: 12, width: 1280, height: 720, videoBitsPerSecond: 700_000, audioBitsPerSecond: 48_000},
    high: {frameRate: 20, width: 1920, height: 1080, videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000},
}

const TIMESLICE_MS = 4000
const AUDIO_SYNC_INTERVAL_MS = 2000

function resolveQualityPreset(quality) {
    return RECORDING_QUALITY_PRESETS[quality] ?? RECORDING_QUALITY_PRESETS.medium
}

function isAppleBrowser() {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || ''
    return /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua) || /iPhone|iPad|iPod/i.test(ua)
}

function pickMimeType(candidates) {
    if (typeof MediaRecorder === 'undefined') return ''
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''
}

function pickVideoMimeType() {
    const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4']
    const webm = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
    return pickMimeType(isAppleBrowser() ? [...mp4, ...webm] : [...webm, ...mp4])
}

function pickAudioMimeType() {
    const mp4 = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4']
    const webm = ['audio/webm;codecs=opus', 'audio/webm']
    return pickMimeType(isAppleBrowser() ? [...mp4, ...webm] : [...webm, ...mp4])
}

export function isRecordingSupported() {
    return (
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
        typeof MediaRecorder !== 'undefined'
    )
}

/** پسوند مناسب فایل بر اساس نوع واقعی blob */
export function getRecordingExtension(blob) {
    const type = blob?.type || ''
    if (type.includes('mp4')) return type.startsWith('audio') ? 'm4a' : 'mp4'
    return 'webm'
}

// =============================================================================
// IndexedDB — نگهداری chunkها برای بازیابی بعد از کرش
// =============================================================================

const DB_NAME = 'meet-recordings'
let _dbPromise = null

function openDb() {
    if (_dbPromise) return _dbPromise
    _dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, 1)
            req.onupgradeneeded = () => {
                const db = req.result
                db.createObjectStore('chunks', {keyPath: ['sid', 'i']})
                db.createObjectStore('meta', {keyPath: 'sid'})
            }
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => resolve(null)
            req.onblocked = () => resolve(null)
        } catch {
            resolve(null)
        }
    })
    return _dbPromise
}

async function idb(storeNames, mode, fn) {
    const db = await openDb()
    if (!db) return null
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(storeNames, mode)
            const result = fn(tx)
            tx.oncomplete = () => resolve(result?.result ?? true)
            tx.onerror = () => resolve(null)
            tx.onabort = () => resolve(null)
        } catch {
            resolve(null)
        }
    })
}

const persistMeta = (meta) => idb(['meta'], 'readwrite', (tx) => tx.objectStore('meta').put(meta))
const persistChunk = (sid, i, blob) => idb(['chunks'], 'readwrite', (tx) => tx.objectStore('chunks').put({sid, i, blob}))

async function clearSession(sid) {
    await idb(['chunks', 'meta'], 'readwrite', (tx) => {
        tx.objectStore('meta').delete(sid)
        tx.objectStore('chunks').delete(IDBKeyRange.bound([sid, 0], [sid, Number.MAX_SAFE_INTEGER]))
    })
}

async function readAll(storeName) {
    const db = await openDb()
    if (!db) return []
    return new Promise((resolve) => {
        try {
            const req = db.transaction([storeName], 'readonly').objectStore(storeName).getAll()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => resolve([])
        } catch {
            resolve([])
        }
    })
}

/**
 * ضبط‌هایی که به هر دلیل (کرش تب، بسته شدن مرورگر، قطع برق) تمام نشده‌اند.
 * @returns {Promise<Array<{blob: Blob, kind: string, startedAt: number}>>}
 */
export async function recoverOrphanedRecordings() {
    const activeIds = new Set(Object.values(_sessions).filter(Boolean).map((s) => s.sid))
    const metas = (await readAll('meta')).filter((m) => !activeIds.has(m.sid))
    if (!metas.length) return []

    const allChunks = await readAll('chunks')
    const out = []
    for (const meta of metas) {
        const parts = allChunks
            .filter((c) => c.sid === meta.sid)
            .sort((a, b) => a.i - b.i)
            .map((c) => c.blob)
        if (parts.length) {
            out.push({
                blob: new Blob(parts, {type: meta.mimeType || 'video/webm'}),
                kind: meta.kind,
                startedAt: meta.startedAt,
            })
        }
        await clearSession(meta.sid)
    }
    return out
}

// =============================================================================
// میکس صدا (Web Audio)
// =============================================================================

async function createAudioMixer({getExtraAudioTracks, fallbackStreams = []}) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    try {
        await ctx.resume()
    } catch {
        /* ignore */
    }
    const destination = ctx.createMediaStreamDestination()
    const sources = new Map() // track.id -> source node

    const connectStream = (stream) => {
        const src = ctx.createMediaStreamSource(stream)
        src.connect(destination)
        return src
    }

    // حالت قدیمی/fallback: استریم‌های ثابت (میکروفون و ...)
    fallbackStreams.forEach((s) => {
        if (s.getAudioTracks().length) connectStream(s)
    })

    const sync = () => {
        if (typeof getExtraAudioTracks !== 'function') return
        let live = []
        try {
            live = (getExtraAudioTracks() || []).filter((t) => t && t.readyState === 'live')
        } catch {
            return
        }
        const liveIds = new Set(live.map((t) => t.id))

        for (const [id, src] of sources) {
            if (!liveIds.has(id)) {
                try {
                    src.disconnect()
                } catch {
                    /* ignore */
                }
                sources.delete(id)
            }
        }
        for (const track of live) {
            if (!sources.has(track.id)) {
                try {
                    sources.set(track.id, connectStream(new MediaStream([track])))
                } catch (e) {
                    console.warn('[recording] could not add audio track', e)
                }
            }
        }
    }

    sync()
    const timer = setInterval(sync, AUDIO_SYNC_INTERVAL_MS)

    return {
        stream: destination.stream,
        close() {
            clearInterval(timer)
            sources.forEach((s) => {
                try {
                    s.disconnect()
                } catch {
                    /* ignore */
                }
            })
            sources.clear()
            ctx.close().catch(() => {})
        },
    }
}

// =============================================================================
// getDisplayMedia با سقف رزولوشن (و fallback برای مرورگرهایی که گزینه‌ها را نمی‌فهمند)
// =============================================================================

async function requestDisplayMedia(preset, wantAudio) {
    const attempts = [
        {
            video: {
                displaySurface: 'browser',
                frameRate: {ideal: preset.frameRate, max: preset.frameRate},
                width: {ideal: preset.width, max: preset.width},
                height: {ideal: preset.height, max: preset.height},
                resizeMode: 'crop-and-scale',
            },
            audio: wantAudio,
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            surfaceSwitching: 'exclude',
            systemAudio: 'exclude',
        },
        {
            video: {
                frameRate: {ideal: preset.frameRate, max: preset.frameRate},
                width: {max: preset.width},
                height: {max: preset.height},
            },
            audio: wantAudio,
        },
        {video: true, audio: wantAudio},
    ]

    let lastError
    for (const constraints of attempts) {
        try {
            return await navigator.mediaDevices.getDisplayMedia(constraints)
        } catch (e) {
            // اگر کاربر دیالوگ را بست، تلاش مجدد معنا ندارد
            if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') throw e
            lastError = e
        }
    }
    throw lastError
}

// =============================================================================
// Session مشترک بین ضبط جلسه (video) و ضبط صدا (voice)
// =============================================================================

const _sessions = {meeting: null, voice: null}

async function startSession(kind, quality, onEnded, {getExtraAudioTracks} = {}) {
    if (_sessions[kind]) throw new Error('ضبط از قبل در حال انجام است.')
    if (typeof MediaRecorder === 'undefined') {
        throw new Error('مرورگر شما از ضبط پشتیبانی نمی‌کند.')
    }

    const preset = resolveQualityPreset(quality)
    const isVideo = kind === 'meeting'
    const hasJitsiAudio = typeof getExtraAudioTracks === 'function'

    let displayStream = null
    let micStream = null
    let mixer = null

    try {
        if (isVideo) {
            if (!isRecordingSupported()) throw new Error('مرورگر شما از ضبط لوکال پشتیبانی نمی‌کند.')
            // وقتی صدا را از Jitsi می‌گیریم، صدای تب لازم نیست.
            displayStream = await requestDisplayMedia(preset, !hasJitsiAudio)
        }

        const fallbackStreams = []
        if (!hasJitsiAudio) {
            micStream = await navigator.mediaDevices.getUserMedia({audio: {channelCount: 1}})
            fallbackStreams.push(micStream)
            if (displayStream) fallbackStreams.push(new MediaStream(displayStream.getAudioTracks()))
        }

        mixer = await createAudioMixer({getExtraAudioTracks, fallbackStreams})

        const tracks = [...(displayStream?.getVideoTracks() ?? []), ...mixer.stream.getAudioTracks()]
        const stream = new MediaStream(tracks)

        const mimeType = isVideo ? pickVideoMimeType() : pickAudioMimeType()
        const recorderOptions = {audioBitsPerSecond: preset.audioBitsPerSecond}
        if (mimeType) recorderOptions.mimeType = mimeType
        if (isVideo) recorderOptions.videoBitsPerSecond = preset.videoBitsPerSecond

        const recorder = new MediaRecorder(stream, recorderOptions)

        const session = {
            kind,
            sid: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            recorder,
            chunks: [],
            index: 0,
            displayStream,
            micStream,
            mixer,
            mimeType: recorder.mimeType || mimeType || (isVideo ? 'video/webm' : 'audio/webm'),
            startedAt: Date.now(),
            onEnded,
            stopping: null,
        }

        persistMeta({sid: session.sid, kind, mimeType: session.mimeType, startedAt: session.startedAt})

        recorder.ondataavailable = (e) => {
            if (!e.data || e.data.size === 0) return
            session.chunks.push(e.data)
            persistChunk(session.sid, session.index++, e.data)
        }

        // خطا/قطع ناگهانی: هرچه ضبط شده را نجات بده و به UI خبر بده
        recorder.onerror = () => {
            stopSession(kind).then((blob) => session.onEnded?.(blob))
        }

        // «Stop sharing» مرورگر، رفرش یا sleep
        displayStream?.getVideoTracks()[0]?.addEventListener('ended', () => {
            stopSession(kind).then((blob) => session.onEnded?.(blob))
        })

        _sessions[kind] = session
        recorder.start(TIMESLICE_MS)
    } catch (error) {
        displayStream?.getTracks().forEach((t) => t.stop())
        micStream?.getTracks().forEach((t) => t.stop())
        mixer?.close()
        throw error
    }
}

function stopSession(kind) {
    const session = _sessions[kind]
    if (!session) return Promise.resolve(null)
    if (session.stopping) return session.stopping

    session.stopping = new Promise((resolve) => {
        const finish = () => {
            const type = (session.mimeType || '').split(';')[0] || (kind === 'meeting' ? 'video/webm' : 'audio/webm')
            const blob = session.chunks.length ? new Blob(session.chunks, {type}) : null

            session.displayStream?.getTracks().forEach((t) => t.stop())
            session.micStream?.getTracks().forEach((t) => t.stop())
            session.mixer?.close()

            _sessions[kind] = null
            // چون blob تحویل داده می‌شود، نسخه‌ی بازیابی لازم نیست
            clearSession(session.sid)
            resolve(blob && blob.size > 0 ? blob : null)
        }

        if (session.recorder.state === 'inactive') {
            finish()
            return
        }
        session.recorder.onstop = finish
        try {
            session.recorder.stop()
        } catch {
            finish()
        }
    })

    return session.stopping
}

// =============================================================================
// API عمومی (سازگار با نسخه‌ی قبل)
// =============================================================================

/**
 * @param {'low'|'medium'|'high'} quality
 * @param {(blob: Blob|null) => void} onEnded
 * @param {{getExtraAudioTracks?: () => MediaStreamTrack[]}} options
 */
export function startLocalRecording(quality = 'medium', onEnded = null, options = {}) {
    return startSession('meeting', quality, onEnded, options)
}

export function stopLocalRecording() {
    return stopSession('meeting')
}

export function startVoiceRecording(quality = 'medium', onEnded = null, options = {}) {
    return startSession('voice', quality, onEnded, options)
}

export function stopVoiceRecording() {
    return stopSession('voice')
}

export function downloadRecording(blob, filename = 'meeting-recording') {
    const ext = getRecordingExtension(blob)
    const name = /\.(webm|mp4|m4a)$/i.test(filename) ? filename.replace(/\.(webm|mp4|m4a)$/i, `.${ext}`) : `${filename}.${ext}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
