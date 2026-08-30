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