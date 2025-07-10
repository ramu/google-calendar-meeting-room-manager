import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { apiClient } from '@/services/api'
import { MeetingRoom, RoomFormData } from '@/types'

const Rooms: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null)
  const queryClient = useQueryClient()

  const { data: roomsData, isLoading, error } = useQuery(
    'rooms',
    () => apiClient.getRooms(),
    {
      select: (response) => response.data || [],
    }
  )

  const createMutation = useMutation(apiClient.createRoom, {
    onSuccess: () => {
      queryClient.invalidateQueries('rooms')
      setShowCreateForm(false)
    },
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => apiClient.updateRoom(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rooms')
        setEditingRoom(null)
      },
    }
  )

  const deleteMutation = useMutation(apiClient.deleteRoom, {
    onSuccess: () => {
      queryClient.invalidateQueries('rooms')
    },
  })

  const handleCreate = (data: RoomFormData) => {
    createMutation.mutate(data)
  }

  const handleUpdate = (data: RoomFormData) => {
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data })
    }
  }

  const handleDelete = (roomId: string) => {
    if (window.confirm('この会議室を削除しますか？')) {
      deleteMutation.mutate(roomId)
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
        <h1 className="text-2xl font-bold text-gray-900">会議室管理</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          会議室を追加
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              会議室を追加
            </h3>
            <RoomForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createMutation.isLoading}
            />
          </div>
        </div>
      )}

      {editingRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              会議室を編集
            </h3>
            <RoomForm
              room={editingRoom}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRoom(null)}
              isLoading={updateMutation.isLoading}
            />
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {roomsData && roomsData.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {roomsData.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onEdit={() => setEditingRoom(room)}
                  onDelete={() => handleDelete(room.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">会議室が登録されていません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface RoomCardProps {
  room: MeetingRoom
  onEdit: () => void
  onDelete: () => void
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onEdit, onDelete }) => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          room.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {room.isActive ? '利用可' : '停止中'}
      </span>
    </div>
    
    <div className="space-y-2 text-sm text-gray-600">
      <p>定員: {room.capacity}名</p>
      {room.location && <p>場所: {room.location}</p>}
      {room.description && <p>説明: {room.description}</p>}
      {room.equipment.length > 0 && (
        <p>設備: {room.equipment.join(', ')}</p>
      )}
    </div>
    
    <div className="mt-4 flex space-x-2">
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

interface RoomFormProps {
  room?: MeetingRoom
  onSubmit: (data: RoomFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

const RoomForm: React.FC<RoomFormProps> = ({ room, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<RoomFormData>({
    defaultValues: room ? {
      name: room.name,
      description: room.description || '',
      location: room.location || '',
      capacity: room.capacity,
      equipment: room.equipment,
      timeZone: room.timeZone,
    } : {
      name: '',
      description: '',
      location: '',
      capacity: 1,
      equipment: [],
      timeZone: 'Asia/Tokyo',
    },
  })

  const equipmentOptions = [
    'プロジェクター',
    'ホワイトボード',
    'テレビ',
    'マイク',
    'スピーカー',
    'WiFi',
    '電源',
    'エアコン',
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="form-label">会議室名</label>
        <input
          type="text"
          {...register('name', { required: '会議室名は必須です' })}
          className="form-input"
          placeholder="例: 会議室A"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">説明</label>
        <textarea
          {...register('description')}
          className="form-input"
          rows={3}
          placeholder="会議室の説明（任意）"
        />
      </div>

      <div>
        <label className="form-label">場所</label>
        <input
          type="text"
          {...register('location')}
          className="form-input"
          placeholder="例: 3階"
        />
      </div>

      <div>
        <label className="form-label">定員</label>
        <input
          type="number"
          {...register('capacity', { 
            required: '定員は必須です',
            min: { value: 1, message: '定員は1以上である必要があります' }
          })}
          className="form-input"
          min="1"
        />
        {errors.capacity && (
          <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">設備</label>
        <div className="grid grid-cols-2 gap-2">
          {equipmentOptions.map((item) => (
            <label key={item} className="flex items-center">
              <input
                type="checkbox"
                value={item}
                {...register('equipment')}
                className="mr-2"
              />
              {item}
            </label>
          ))}
        </div>
      </div>

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

export default Rooms