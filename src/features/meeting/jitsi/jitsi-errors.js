/**
 * Error codes — UI فقط این‌ها را می‌شناسد
 */
export const ERROR_CODES = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTH_FAILED: 'AUTH_FAILED',
  ROOM_JOIN_FAILED: 'ROOM_JOIN_FAILED',
  MEDIA_PERMISSION_DENIED: 'MEDIA_PERMISSION_DENIED',
  MEDIA_DEVICE_NOT_FOUND: 'MEDIA_DEVICE_NOT_FOUND',
  SCREEN_SHARE_FAILED: 'SCREEN_SHARE_FAILED',
  CHAT_FAILED: 'CHAT_FAILED',
  UNKNOWN: 'UNKNOWN',
}

/**
 * @param {unknown} error
 * @param {string} [defaultCode]
 * @returns {{ code: string, message: string, recoverable: boolean, original: unknown }}
 */
export function normalizeError(error, defaultCode = ERROR_CODES.UNKNOWN) {
  if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission denied')) {
    return {
      code: ERROR_CODES.MEDIA_PERMISSION_DENIED,
      message: 'دسترسی به دوربین یا میکروفون رد شد.',
      recoverable: true,
      original: error,
    }
  }

  if (error?.name === 'NotFoundError' || error?.message?.includes('device not found')) {
    return {
      code: ERROR_CODES.MEDIA_DEVICE_NOT_FOUND,
      message: 'دوربین یا میکروفون پیدا نشد.',
      recoverable: false,
      original: error,
    }
  }

  if (error?.message?.includes('connection')) {
    return {
      code: ERROR_CODES.CONNECTION_FAILED,
      message: 'اتصال به سرور برقرار نشد.',
      recoverable: true,
      original: error,
    }
  }

  return {
    code: defaultCode,
    message: error?.message || 'خطای ناشناخته',
    recoverable: false,
    original: error,
  }
}