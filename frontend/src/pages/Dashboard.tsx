import React from 'react'
import { useQuery } from 'react-query'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { apiClient } from '@/services/api'
import { MeetingRoom, Booking } from '@/types'

const Dashboard: React.FC = () => {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  const { data: roomsData, isLoading: roomsLoading } = useQuery(
    'rooms',
    () => apiClient.getRooms({ isActive: true }),
    {
      select: (response) => response.data || [],
    }
  )

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery(
    'dashboard-bookings',
    () => apiClient.getBookings({
      startDate: weekStart,
      endDate: weekEnd,
      status: 'confirmed',
    }),
    {
      select: (response) => response.data || [],
    }
  )

  const { data: todayBookingsData } = useQuery(
    'today-bookings',
    () => apiClient.getBookings({
      startDate: today,
      endDate: today,
      status: 'confirmed',
    }),
    {
      select: (response) => response.data || [],
    }
  )

  const totalRooms = roomsData?.length || 0
  const totalBookings = bookingsData?.length || 0
  const todayBookings = todayBookingsData?.length || 0

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <h1 className="text-2xl font-bold text-gray-900">
            ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {format(today, 'yyyy年MM月dd日 (E)', { locale: ja })}
          </p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="総会議室数"
          value={totalRooms}
          description="利用可能な会議室"
          isLoading={roomsLoading}
        />
        <StatCard
          title="今日の予約"
          value={todayBookings}
          description="本日の予約数"
          isLoading={bookingsLoading}
        />
        <StatCard
          title="週間予約"
          value={totalBookings}
          description="今週の予約数"
          isLoading={bookingsLoading}
        />
        <StatCard
          title="利用率"
          value={`${totalRooms > 0 ? Math.round((todayBookings / totalRooms) * 100) : 0}%`}
          description="本日の利用率"
          isLoading={roomsLoading || bookingsLoading}
        />
      </div>

      {/* 今日の予約一覧 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            今日の予約
          </h3>
          <div className="mt-5">
            {bookingsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : todayBookingsData && todayBookingsData.length > 0 ? (
              <BookingList bookings={todayBookingsData} />
            ) : (
              <p className="text-gray-500 text-center py-4">
                今日の予約はありません
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 会議室一覧 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            会議室一覧
          </h3>
          <div className="mt-5">
            {roomsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : roomsData && roomsData.length > 0 ? (
              <RoomList rooms={roomsData} />
            ) : (
              <p className="text-gray-500 text-center py-4">
                会議室が登録されていません
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  description: string
  isLoading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, isLoading }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-600 rounded-full"></div>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-lg font-medium text-gray-900">
              {isLoading ? (
                <div className="animate-pulse h-6 bg-gray-200 rounded w-16"></div>
              ) : (
                value
              )}
            </dd>
          </dl>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  </div>
)

interface BookingListProps {
  bookings: Booking[]
}

const BookingList: React.FC<BookingListProps> = ({ bookings }) => (
  <div className="space-y-3">
    {bookings.map((booking) => (
      <div key={booking.id} className="border rounded-lg p-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-gray-900">{booking.title}</h4>
            <p className="text-sm text-gray-600">
              {format(new Date(booking.startTime), 'HH:mm')} - 
              {format(new Date(booking.endTime), 'HH:mm')}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {booking.status === 'confirmed' ? '確定' : booking.status}
          </span>
        </div>
        {booking.description && (
          <p className="mt-2 text-sm text-gray-600">{booking.description}</p>
        )}
      </div>
    ))}
  </div>
)

interface RoomListProps {
  rooms: MeetingRoom[]
}

const RoomList: React.FC<RoomListProps> = ({ rooms }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {rooms.map((room) => (
      <div key={room.id} className="border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-gray-900">{room.name}</h4>
            <p className="text-sm text-gray-600">
              定員: {room.capacity}名
            </p>
            {room.location && (
              <p className="text-sm text-gray-600">{room.location}</p>
            )}
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {room.isActive ? '利用可' : '停止中'}
          </span>
        </div>
        {room.equipment.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              設備: {room.equipment.join(', ')}
            </p>
          </div>
        )}
      </div>
    ))}
  </div>
)

export default Dashboard