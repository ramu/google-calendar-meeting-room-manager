import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { apiClient } from '@/services/api'
import { Booking, MeetingRoom } from '@/types'

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const { data: bookingsData } = useQuery(
    ['calendar-bookings', format(monthStart, 'yyyy-MM')],
    () => apiClient.getBookings({
      startDate: calendarStart,
      endDate: calendarEnd,
    }),
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

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getBookingsForDate = (date: Date) => {
    if (!bookingsData) return []
    return bookingsData.filter(booking => {
      const bookingDate = new Date(booking.startTime)
      return format(bookingDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
  }

  const getRoomName = (roomId: string) => {
    const room = roomsData?.find(r => r.id === roomId)
    return room?.name || '不明な会議室'
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const weekdays = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">カレンダー</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'yyyy年MM月', { locale: ja })}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-0 border-b">
          {weekdays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {days.map((day) => {
            const dayBookings = getBookingsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)

            return (
              <div
                key={day.toString()}
                className={`min-h-32 p-2 border-b border-r cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isDayToday ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isDayToday ? 'text-blue-600' : ''
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-xs p-1 rounded truncate ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'tentative'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                      title={`${booking.title} - ${getRoomName(booking.roomId)}`}
                    >
                      {format(new Date(booking.startTime), 'HH:mm')} {booking.title}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayBookings.length - 3} 件
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {format(selectedDate, 'yyyy年MM月dd日 (E)', { locale: ja })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <DayBookings
              bookings={getBookingsForDate(selectedDate)}
              rooms={roomsData || []}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface DayBookingsProps {
  bookings: Booking[]
  rooms: MeetingRoom[]
}

const DayBookings: React.FC<DayBookingsProps> = ({ bookings, rooms }) => {
  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || '不明な会議室'
  }

  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <div className="space-y-3">
      {sortedBookings.length > 0 ? (
        sortedBookings.map((booking) => (
          <div key={booking.id} className="border rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900">{booking.title}</h4>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
            
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                {format(new Date(booking.startTime), 'HH:mm')} - 
                {format(new Date(booking.endTime), 'HH:mm')}
              </p>
              <p>会議室: {getRoomName(booking.roomId)}</p>
              <p>主催者: {booking.organizer}</p>
              {booking.description && (
                <p>説明: {booking.description}</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-4">
          この日の予約はありません
        </p>
      )}
    </div>
  )
}

export default Calendar