// src/features/meeting/jitsi/recordingService.js

let _mediaRecorder = null
let _recordedChunks = []
let _displayStream = null
let _micStream = null
let _audioContext = null

// پریست‌های کیفیت ضبط ویدیو. برای ضبط صفحه (متن/اسلاید/UI) نیازی به
// فریم‌ریت و بیت‌ریت بالا نیست؛ همین باعث کاهش چشمگیر حجم فایل می‌شه.
export const RECORDING_QUALITY_PRESETS = {
    low: {
        frameRate: 8,
        videoBitsPerSecond: 250_000,
        audioBitsPerSecond: 32_000,
    },
    medium: {
        frameRate: 12,
        videoBitsPerSecond: 500_000,
        audioBitsPerSecond: 48_000,
    },
    high: {
        frameRate: 20,
        videoBitsPerSecond: 1_200_000,
        audioBitsPerSecond: 96_000,
    },
}

function resolveQualityPreset(quality) {
    return RECORDING_QUALITY_PRESETS[quality] ?? RECORDING_QUALITY_PRESETS.medium
}

// انتخاب کدک قابل پشتیبانی. ترتیب بر اساس «کم‌ترین بار CPU» است:
// vp8 سبک‌ترین انکودر نرم‌افزاری است. av1 (که قبلاً اول لیست بود) روی
// دستگاه‌های قدیمی سنگین‌ترین انتخاب ممکن است و ضبط را کند/داغ می‌کند.
function pickMimeType(candidates) {
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? 'video/webm'
}

export function isRecordingSupported() {
    return typeof navigator.mediaDevices?.getDisplayMedia === 'function'
}

/**
 * @param {'low'|'medium'|'high'} quality پیش‌فرض: 'medium'
 */
export async function startLocalRecording(quality = 'medium', onEnded = null) {
    if (!isRecordingSupported()) {
        throw new Error('مرورگر شما از ضبط لوکال پشتیبانی نمی‌کند.')
    }

    const preset = resolveQualityPreset(quality)

    // ۱. گرفتن تصویر صفحه + صدای خروجی تب (صدای بقیه‌ی شرکت‌کننده‌ها)
    // محدود کردن فریم‌ریت مهم‌ترین فاکتور برای کاهش حجم ضبط صفحه‌ست،
    // چون محتوای اسکرین‌شیر (متن/اسلاید/UI) معمولاً ساکنه.
    _displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            displaySurface: 'browser',
            frameRate: { ideal: preset.frameRate, max: preset.frameRate },
        },
        audio: true,
    })

    // ۲. گرفتن میکروفون خودمون جدا (مونو کافیه، حجم صدا رو کم می‌کنه)
    _micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
    })

    // ۳. میکس کردن دو منبع صدا با Web Audio API
    _audioContext = new AudioContext()
    const destination = _audioContext.createMediaStreamDestination()

    const displayAudioTracks = _displayStream.getAudioTracks()
    if (displayAudioTracks.length > 0) {
        const displaySource = _audioContext.createMediaStreamSource(
            new MediaStream(displayAudioTracks)
        )
        displaySource.connect(destination)
    }

    const micSource = _audioContext.createMediaStreamSource(_micStream)
    micSource.connect(destination)

    // ۴. ساخت یه استریم نهایی: تصویر از display + صدای میکس‌شده
    const combinedStream = new MediaStream([
        ..._displayStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
    ])

    _recordedChunks = []

    const mimeType = pickMimeType([
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
    ])

    _mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: preset.videoBitsPerSecond,
        audioBitsPerSecond: preset.audioBitsPerSecond,
    })

    _mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) _recordedChunks.push(e.data)
    }

    return new Promise((resolve, reject) => {
        // اگه کاربر از دیالوگ مرورگر "Stop sharing" رو بزنه
        _displayStream.getVideoTracks()[0].addEventListener('ended', () => {
            // وقتی کاربر از دیالوگ مرورگر «Stop sharing» را می‌زند باید state و
            // تایمر اپ هم بسته شود؛ قبلاً فقط recorder متوقف می‌شد.
            stopLocalRecording().then((blob) => onEnded?.(blob))
        })

        _mediaRecorder.onerror = (e) => reject(e.error)
        _mediaRecorder.start()
        resolve()
    })
}

export function stopLocalRecording() {
    return new Promise((resolve) => {
        if (!_mediaRecorder || _mediaRecorder.state === 'inactive') {
            resolve(null)
            return
        }

        _mediaRecorder.onstop = () => {
            const blob = new Blob(_recordedChunks, { type: 'video/webm' })

            _displayStream?.getTracks().forEach((t) => t.stop())
            _micStream?.getTracks().forEach((t) => t.stop())
            _audioContext?.close()

            _displayStream = null
            _micStream = null
            _audioContext = null
            _mediaRecorder = null
            _recordedChunks = []

            resolve(blob)
        }

        _mediaRecorder.stop()
    })
}

let _voiceMediaRecorder = null
let _voiceRecordedChunks = []
let _voiceMicStream = null
let _voiceDisplayStream = null
let _voiceAudioContext = null

/**
 * @param {'low'|'medium'|'high'} quality پیش‌فرض: 'medium'
 */
export async function startVoiceRecording(quality = 'medium', onEnded = null) {
    const preset = resolveQualityPreset(quality)

    // میکروفون خودمون (مونو، چون فقط صدای گفتاره نه موسیقی)
    _voiceMicStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
    })

    // صدای خروجی تب (صدای بقیه‌ی شرکت‌کننده‌ها) — بدون نیاز به گرفتن تصویر واقعی صفحه
    // مرورگرها audio-only capture از تب را نمی‌دهند، پس ویدیو باید درخواست شود
    // ولی استفاده نمی‌شود. قبلاً video:true بود و کل صفحه با فریم‌ریت کامل برای
    // ساعت‌ها capture می‌شد (CPU/GPU بیهوده). حالا کوچک‌ترین/کندترین حالت.
    _voiceDisplayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            frameRate: { ideal: 1, max: 1 },
            width: { max: 640 },
            height: { max: 360 },
        },
        audio: true,
    })

    _voiceAudioContext = new AudioContext()
    const destination = _voiceAudioContext.createMediaStreamDestination()

    const displayAudioTracks = _voiceDisplayStream.getAudioTracks()
    if (displayAudioTracks.length > 0) {
        const displaySource = _voiceAudioContext.createMediaStreamSource(
            new MediaStream(displayAudioTracks)
        )
        displaySource.connect(destination)
    }

    const micSource = _voiceAudioContext.createMediaStreamSource(_voiceMicStream)
    micSource.connect(destination)

    // فقط صدا رو نگه می‌داریم، تصویر display اصلاً استفاده نمیشه
    _voiceRecordedChunks = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

    _voiceMediaRecorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: preset.audioBitsPerSecond,
    })

    _voiceMediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) _voiceRecordedChunks.push(e.data)
    }

    return new Promise((resolve, reject) => {
        _voiceDisplayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
            stopVoiceRecording().then((blob) => onEnded?.(blob))
        })

        _voiceMediaRecorder.onerror = (e) => reject(e.error)
        _voiceMediaRecorder.start()
        resolve()
    })
}

export function stopVoiceRecording() {
    return new Promise((resolve) => {
        if (!_voiceMediaRecorder || _voiceMediaRecorder.state === 'inactive') {
            resolve(null)
            return
        }

        _voiceMediaRecorder.onstop = () => {
            const blob = new Blob(_voiceRecordedChunks, { type: 'audio/webm' })

            _voiceDisplayStream?.getTracks().forEach((t) => t.stop())
            _voiceMicStream?.getTracks().forEach((t) => t.stop())
            _voiceAudioContext?.close()

            _voiceDisplayStream = null
            _voiceMicStream = null
            _voiceAudioContext = null
            _voiceMediaRecorder = null
            _voiceRecordedChunks = []

            resolve(blob)
        }

        _voiceMediaRecorder.stop()
    })
}

export function downloadRecording(blob, filename = 'meeting-recording.webm') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}