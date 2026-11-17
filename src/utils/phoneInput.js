const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

export const toEnDigits = (value) =>
  String(value).replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => AR.indexOf(d))

export const PHONE_RE = /^09\d{9}$/
export const OTP_CODE_LENGTH = 5
export const faNumber = (n) => Number(n).toLocaleString('fa-IR')
