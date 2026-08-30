import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { roomsService } from '../services/rooms'


export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsService.list().then((r) => r.data),
    staleTime: 1000 * 30,
  })
}


export function useRoom(slug) {
  return useQuery({
    queryKey: ['rooms', slug],
    queryFn: () => roomsService.detail(slug).then((r) => r.data),
    enabled: !!slug,
  })
}


export function useCreateRoom() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data) =>
      roomsService.create(data).then((r) => r.data),

    onSuccess: (room) => {
      queryClient.invalidateQueries({
        queryKey: ['rooms'],
      })

      toast.success('رویداد با موفقیت ایجاد شد')

      navigate(`/join/${room.slug}`)
    },

    onError: (error) => {
      const data = error.response?.data

      if (data?.slug) {
        toast.error('این شناسه قبلاً استفاده شده است')
      } else {
        toast.error('خطا در ایجاد رویداد')
      }
    },
  })
}


export function useUpdateRoom(slug) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) =>
      roomsService.update(slug, data).then((r) => r.data),

    onSuccess: (room) => {
      // آپدیت اطلاعات لیست روم‌ها
      queryClient.invalidateQueries({
        queryKey: ['rooms'],
      })

      // آپدیت اطلاعات همین روم
      queryClient.invalidateQueries({
        queryKey: ['rooms', slug],
      })

      toast.success('رویداد با موفقیت ویرایش شد')
    },

    onError: (error) => {
      const data = error.response?.data

      if (data?.detail) {
        toast.error(data.detail)
      } else {
        toast.error('خطا در ویرایش رویداد')
      }
    },
  })
}


export function useJoinRoom(slug) {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data) =>
      roomsService.join(slug, data).then((r) => r.data),

    onSuccess: () => {
      navigate(`/room/${slug}`)
    },

    onError: (error) => {
      const msg =
        error.response?.data?.detail ||
        'خطا در ورود به رویداد'

      toast.error(msg)
    },
  })
}


export function useLeaveRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug) =>
      roomsService.leave(slug),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rooms'],
      })
    },
  })
}


export function useEndRoom() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (slug) =>
      roomsService.end(slug),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rooms'],
      })

      toast.success('جلسه پایان یافت')

      navigate('/dashboard')
    },

    onError: () => {
      toast.error('خطا در پایان دادن به جلسه')
    },
  })
}
