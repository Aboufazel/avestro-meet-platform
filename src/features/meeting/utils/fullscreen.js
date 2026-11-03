/** تمام‌صفحه‌شدن (مخفی‌شدن تب و نوار آدرس) + قفل افقی؛ باید از داخل یک لمس/کلیک صدا زده شود. */
export const canFullscreen = () => typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen)
export const isFullscreen = () => typeof document !== 'undefined' && Boolean(document.fullscreenElement)

export async function enterFullscreen() {
  if (!canFullscreen() || isFullscreen()) return isFullscreen()
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    await window.screen?.orientation?.lock?.('landscape').catch(() => {})
    return true
  } catch {
    return false
  }
}

export async function exitFullscreen() {
  try {
    window.screen?.orientation?.unlock?.()
    if (isFullscreen()) await document.exitFullscreen()
  } catch { /* نادیده */ }
}

export const toggleFullscreen = () => (isFullscreen() ? exitFullscreen() : enterFullscreen())
