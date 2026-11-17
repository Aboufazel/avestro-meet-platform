// نام قابل‌نمایش کاربر؛ نام کاربری تصادفی (user_xxx) هرگز نمایش داده نمی‌شود.
export function userDisplayName(user) {
  if (!user) return 'کاربر'
  if (user.display_name) return user.display_name
  const username = user.username || ''
  if (username && !username.startsWith('user_')) return username
  return 'کاربر'
}
