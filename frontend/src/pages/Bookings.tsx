import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { apiClient } from '@/services/api'
import { Booking, BookingFormData, MeetingRoom } from '@/types'

const Bookings: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const queryClient = useQueryClient()

  const { data: bookingsData, isLoading, error } = useQuery(
    'bookings',
    () => apiClient.getBookings(),
    {
      select: (response) => response.data || [],
    }
  )

  const { data: roomsData } = useQuery(
    'rooms',
    () => apiClient.getRooms({ isActive: true }),
    {
      select: (response) => response.data || [],
    }
  )

  const createMutation = useMutation(apiClient.createBooking, {
    onSuccess: () => {
      queryClient.invalidateQueries('bookings')
      setShowCreateForm(false)
    },
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => apiClient.updateBooking(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bookings')
        setEditingBooking(null)
      },
    }
  )

  const deleteMutation = useMutation(apiClient.deleteBooking, {
    onSuccess: () => {
      queryClient.invalidateQueries('bookings')
    },
  })

  const handleCreate = (data: BookingFormData) => {
    const startTime = new Date(`${data.startDate}T${data.startTime}`)
    const endTime = new Date(`${data.endDate}T${data.endTime}`)
    
    createMutation.mutate({
      roomId: data.roomId,
      title: data.title,
      description: data.description,
      startTime,
      endTime,
      attendees: data.attendees,
      recurrence: data.recurrence?.enabled ? {
        frequency: data.recurrence.frequency,
        interval: data.recurrence.interval,
        endDate: data.recurrence.endDate ? new Date(data.recurrence.endDate) : undefined,
      } : undefined,
    })
  }

  const handleUpdate = (data: BookingFormData) => {
    if (editingBooking) {
      const startTime = new Date(`${data.startDate}T${data.startTime}`)
      const endTime = new Date(`${data.endDate}T${data.endTime}`)
      
      updateMutation.mutate({
        id: editingBooking.id,
        data: {
          title: data.title,
          description: data.description,
          startTime,
          endTime,
          attendees: data.attendees,
        },
      })
    }
  }

  const handleDelete = (bookingId: string) => {
    if (window.confirm('この予約を削除しますか？')) {
      deleteMutation.mutate(bookingId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600">エラーが発生しました</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          予約を追加
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              予約を追加
            </h3>
            <BookingForm
              rooms={roomsData || []}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createMutation.isLoading}
            />
          </div>
        </div>
      )}

      {editingBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              予約を編集
            </h3>
            <BookingForm
              rooms={roomsData || []}
              booking={editingBooking}
              onSubmit={handleUpdate}
              onCancel={() => setEditingBooking(null)}
              isLoading={updateMutation.isLoading}
            />
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {bookingsData && bookingsData.length > 0 ? (
            <div className="space-y-4">
              {bookingsData.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  rooms={roomsData || []}
                  onEdit={() => setEditingBooking(booking)}
                  onDelete={() => handleDelete(booking.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">予約がありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface BookingCardProps {
  booking: Booking
  rooms: MeetingRoom[]
  onEdit: () => void
  onDelete: () => void
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, rooms, onEdit, onDelete }) => {
  const room = rooms.find(r => r.id === booking.roomId)
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{booking.title}</h3>
          <p className="text-sm text-gray-600">
            {room?.name || '不明な会議室'}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            booking.status === 'confirmed'
              ? 'bg-green-100 text-green-800'
              : booking.status === 'tentative'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {booking.status === 'confirmed' ? '確定' : 
           booking.status === 'tentative' ? '仮予約' : 'キャンセル'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p>
          {format(new Date(booking.startTime), 'yyyy/MM/dd (E) HH:mm', { locale: ja })} - 
          {format(new Date(booking.endTime), 'HH:mm', { locale: ja })}
        </p>
        <p>主催者: {booking.organizer}</p>
        {booking.description && <p>説明: {booking.description}</p>}
        {booking.attendees.length > 0 && (
          <p>参加者: {booking.attendees.join(', ')}</p>
        )}
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="btn btn-secondary text-sm"
        >
          編集
        </button>
        <button
          onClick={onDelete}
          className="btn btn-danger text-sm"
        >
          削除
        </button>
      </div>
    </div>
  )
}

interface BookingFormProps {
  rooms: MeetingRoom[]
  booking?: Booking
  onSubmit: (data: BookingFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

const BookingForm: React.FC<BookingFormProps> = ({ 
  rooms, 
  booking, 
  onSubmit, 
  onCancel, 
  isLoading 
}) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<BookingFormData>({
    defaultValues: booking ? {
      roomId: booking.roomId,
      title: booking.title,
      description: booking.description || '',
      startDate: format(new Date(booking.startTime), 'yyyy-MM-dd'),
      startTime: format(new Date(booking.startTime), 'HH:mm'),
      endDate: format(new Date(booking.endTime), 'yyyy-MM-dd'),
      endTime: format(new Date(booking.endTime), 'HH:mm'),
      attendees: booking.attendees,
    } : {
      roomId: '',
      title: '',
      description: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: '10:00',
      attendees: [],
    },
  })

  const watchRecurrenceEnabled = watch('recurrence.enabled')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="form-label">会議室</label>
        <select
          {...register('roomId', { required: '会議室を選択してください' })}
          className="form-input"
        >
          <option value="">会議室を選択</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} (定員: {room.capacity}名)
            </option>
          ))}
        </select>
        {errors.roomId && (
          <p className="mt-1 text-sm text-red-600">{errors.roomId.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">タイトル</label>
        <input
          type="text"
          {...register('title', { required: 'タイトルは必須です' })}
          className="form-input"
          placeholder="例: チーム会議"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">説明</label>
        <textarea
          {...register('description')}
          className="form-input"
          rows={3}
          placeholder="会議の説明（任意）"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">開始日</label>
          <input
            type="date"
            {...register('startDate', { required: '開始日は必須です' })}
            className="form-input"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className="form-label">開始時間</label>
          <input
            type="time"
            {...register('startTime', { required: '開始時間は必須です' })}
            className="form-input"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">終了日</label>
          <input
            type="date"
            {...register('endDate', { required: '終了日は必須です' })}
            className="form-input"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
        <div>
          <label className="form-label">終了時間</label>
          <input
            type="time"
            {...register('endTime', { required: '終了時間は必須です' })}
            className="form-input"
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="form-label">参加者（カンマ区切り）</label>
        <input
          type="text"
          {...register('attendees')}
          className="form-input"
          placeholder="例: user1@example.com, user2@example.com"
        />
      </div>

      {!booking && (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('recurrence.enabled')}
              className="mr-2"
            />
            繰り返し予約
          </label>
          
          {watchRecurrenceEnabled && (
            <div className="mt-2 space-y-2">
              <select
                {...register('recurrence.frequency')}
                className="form-input"
              >
                <option value="daily">毎日</option>
                <option value="weekly">毎週</option>
                <option value="monthly">毎月</option>
              </select>
              
              <input
                type="number"
                {...register('recurrence.interval')}
                min="1"
                max="30"
                className="form-input"
                placeholder="間隔"
              />
              
              <input
                type="date"
                {...register('recurrence.endDate')}
                className="form-input"
                placeholder="終了日"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary flex-1"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary flex-1"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}

export default Bookings