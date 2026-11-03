import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roomsService } from '../services/rooms'

/**
 * حضور و غیاب (فقط میزبان): گزارش با به‌روزرسانی هر ۸ ثانیه تا وقتی پنجره باز است،
 * و ثبت دستی وضعیت هر فرد. وضعیت نهایی را همیشه مدیر تعیین می‌کند.
 */
export function useAttendance(slug, { enabled = false } = {}) {
  const qc = useQueryClient()
  const key = ['attendance', slug]

  const query = useQuery({
    queryKey: key,
    queryFn: () => roomsService.attendance(slug).then((r) => r.data),
    enabled: Boolean(slug) && enabled,
    refetchInterval: enabled ? 8000 : false,
  })

  const mark = useMutation({
    mutationFn: (body) => roomsService.markAttendance(slug, body).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(key, data),
  })

  return {
    report: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    mark: (personKey, status, note = '') => mark.mutateAsync({ key: personKey, status, note }),
    isSaving: mark.isPending,
  }
}
