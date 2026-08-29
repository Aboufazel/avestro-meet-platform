// src/features/meeting/jitsi/recordingService.js

let _mediaRecorder = null
let _recordedChunks = []
let _stream = null

export function isRecordingSupported() {
    return typeof navigator.mediaDevices?.getDisplayMedia === 'function'
}

export async function startLocalRecording() {
    if (!isRecordingSupported()) {
        throw new Error('مرورگر شما از ضبط لوکال پشتیبانی نمی‌کند.')
    }

    _stream = await navigator.mediaDevices.getDisplayMedia({
        video: {displaySurface: 'browser'},
        audio: true,
    })

    _recordedChunks = []

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'

    _mediaRecorder = new MediaRecorder(_stream, {mimeType})

    _mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) _recordedChunks.push(e.data)
    }

    return new Promise((resolve, reject) => {
        // اگه کاربر از دیالوگ مرورگر خودش "Stop sharing" رو بزنه
        _stream.getVideoTracks()[0].addEventListener('ended', () => {
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
            const blob = new Blob(_recordedChunks, {type: 'video/webm'})
            _stream?.getTracks().forEach((t) => t.stop())
            _stream = null
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