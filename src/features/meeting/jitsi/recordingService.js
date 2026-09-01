// src/features/meeting/jitsi/recordingService.js

let _mediaRecorder = null
let _recordedChunks = []
let _displayStream = null
let _micStream = null
let _audioContext = null

export function isRecordingSupported() {
    return typeof navigator.mediaDevices?.getDisplayMedia === 'function'
}

export async function startLocalRecording() {
    if (!isRecordingSupported()) {
        throw new Error('مرورگر شما از ضبط لوکال پشتیبانی نمی‌کند.')
    }

    // ۱. گرفتن تصویر صفحه + صدای خروجی تب (صدای بقیه‌ی شرکت‌کننده‌ها)
    _displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true,
    })

    // ۲. گرفتن میکروفون خودمون جدا
    _micStream = await navigator.mediaDevices.getUserMedia({ audio: true })

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

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'

    _mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 1_000_000,
        audioBitsPerSecond: 96_000,
    })

    _mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) _recordedChunks.push(e.data)
    }

    return new Promise((resolve, reject) => {
        // اگه کاربر از دیالوگ مرورگر "Stop sharing" رو بزنه
        _displayStream.getVideoTracks()[0].addEventListener('ended', () => {
            stopLocalRecording()
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

export async function startVoiceRecording() {
    // میکروفون خودمون
    _voiceMicStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // صدای خروجی تب (صدای بقیه‌ی شرکت‌کننده‌ها) — بدون نیاز به گرفتن تصویر واقعی صفحه
    _voiceDisplayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,   // مرورگرها اجازه‌ی audio-only capture از تب رو نمیدن، پس ویدیو باید درخواست بشه ولی استفاده نمیشه
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
        audioBitsPerSecond: 64_000,
    })

    _voiceMediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) _voiceRecordedChunks.push(e.data)
    }

    return new Promise((resolve, reject) => {
        _voiceDisplayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
            stopVoiceRecording()
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