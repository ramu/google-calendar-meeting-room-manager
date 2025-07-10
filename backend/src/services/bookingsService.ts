import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger.js'

export interface Booking {
  id: string
  eventId: string
  calendarId: string
  roomId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  organizer: string
  attendees: string[]
  status: 'confirmed' | 'tentative' | 'cancelled'
  recurringEventId?: string
  isRecurring: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateBookingData {
  eventId: string
  calendarId: string
  roomId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  organizer: string
  attendees: string[]
  status: 'confirmed' | 'tentative' | 'cancelled'
  recurringEventId?: string
  isRecurring: boolean
}

export interface UpdateBookingData {
  title?: string
  description?: string
  startTime?: Date
  endTime?: Date
  attendees?: string[]
  status?: 'confirmed' | 'tentative' | 'cancelled'
}

export interface BookingFilters {
  roomId?: string
  startDate?: Date
  endDate?: Date
  status?: 'confirmed' | 'tentative' | 'cancelled'
  organizer?: string
  page?: number
  limit?: number
}

// インメモリデータストア（本番環境では実際のデータベースを使用）
class InMemoryBookingStore {
  private bookings: Map<string, Booking> = new Map()

  async create(data: CreateBookingData): Promise<Booking> {
    const booking: Booking = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.bookings.set(booking.id, booking)
    logger.info('Booking created in store:', { bookingId: booking.id })
    return booking
  }

  async findById(id: string): Promise<Booking | null> {
    return this.bookings.get(id) || null
  }

  async findMany(filters: BookingFilters = {}): Promise<{ bookings: Booking[]; total: number }> {
    let bookings = Array.from(this.bookings.values())

    // フィルタリング
    if (filters.roomId) {
      bookings = bookings.filter(booking => booking.roomId === filters.roomId)
    }

    if (filters.status) {
      bookings = bookings.filter(booking => booking.status === filters.status)
    }

    if (filters.organizer) {
      bookings = bookings.filter(booking => 
        booking.organizer.toLowerCase().includes(filters.organizer!.toLowerCase())
      )
    }

    if (filters.startDate || filters.endDate) {
      bookings = bookings.filter(booking => {
        const bookingStart = booking.startTime
        const bookingEnd = booking.endTime

        // 指定された期間と重複する予約を検索
        if (filters.startDate && filters.endDate) {
          return (
            (bookingStart >= filters.startDate && bookingStart <= filters.endDate) ||
            (bookingEnd >= filters.startDate && bookingEnd <= filters.endDate) ||
            (bookingStart <= filters.startDate && bookingEnd >= filters.endDate)
          )
        }

        if (filters.startDate) {
          return bookingEnd >= filters.startDate
        }

        if (filters.endDate) {
          return bookingStart <= filters.endDate
        }

        return true
      })
    }

    const total = bookings.length

    // ソート（開始時間順）
    bookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

    // ページネーション
    const page = filters.page || 1
    const limit = filters.limit || 50
    const skip = (page - 1) * limit

    bookings = bookings.slice(skip, skip + limit)

    return { bookings, total }
  }

  async update(id: string, data: UpdateBookingData): Promise<Booking | null> {
    const booking = this.bookings.get(id)
    if (!booking) return null

    const updatedBooking: Booking = {
      ...booking,
      ...data,
      updatedAt: new Date(),
    }

    this.bookings.set(id, updatedBooking)
    logger.info('Booking updated in store:', { bookingId: id })
    return updatedBooking
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.bookings.delete(id)
    if (deleted) {
      logger.info('Booking deleted from store:', { bookingId: id })
    }
    return deleted
  }

  async findByEventId(eventId: string): Promise<Booking | null> {
    for (const booking of this.bookings.values()) {
      if (booking.eventId === eventId) {
        return booking
      }
    }
    return null
  }

  async findConflicting(roomId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<Booking[]> {
    const bookings = Array.from(this.bookings.values())
    
    return bookings.filter(booking => {
      if (excludeId && booking.id === excludeId) return false
      if (booking.roomId !== roomId) return false
      if (booking.status === 'cancelled') return false

      // 時間の重複をチェック
      return (
        (startTime >= booking.startTime && startTime < booking.endTime) ||
        (endTime > booking.startTime && endTime <= booking.endTime) ||
        (startTime <= booking.startTime && endTime >= booking.endTime)
      )
    })
  }
}

class BookingsService {
  private store = new InMemoryBookingStore()

  // 予約作成
  async createBooking(data: CreateBookingData): Promise<Booking> {
    try {
      // 時間の妥当性チェック
      if (data.startTime >= data.endTime) {
        throw new Error('End time must be after start time')
      }

      // 重複チェック
      const conflictingBookings = await this.store.findConflicting(
        data.roomId,
        data.startTime,
        data.endTime
      )

      if (conflictingBookings.length > 0) {
        throw new Error('Room is already booked for the specified time')
      }

      const booking = await this.store.create(data)
      logger.info('Booking created successfully:', { 
        bookingId: booking.id, 
        roomId: booking.roomId,
        title: booking.title 
      })
      return booking
    } catch (error) {
      logger.error('Error creating booking:', error)
      throw error
    }
  }

  // 予約取得
  async getBooking(id: string): Promise<Booking | null> {
    try {
      return await this.store.findById(id)
    } catch (error) {
      logger.error('Error fetching booking:', error)
      throw error
    }
  }

  // 予約一覧取得
  async getBookings(filters: BookingFilters = {}): Promise<{ bookings: Booking[]; total: number }> {
    try {
      return await this.store.findMany(filters)
    } catch (error) {
      logger.error('Error fetching bookings:', error)
      throw error
    }
  }

  // 予約更新
  async updateBooking(id: string, data: UpdateBookingData): Promise<Booking> {
    try {
      const existingBooking = await this.store.findById(id)
      if (!existingBooking) {
        throw new Error('Booking not found')
      }

      // 時間の妥当性チェック
      const startTime = data.startTime || existingBooking.startTime
      const endTime = data.endTime || existingBooking.endTime

      if (startTime >= endTime) {
        throw new Error('End time must be after start time')
      }

      // 重複チェック（自分以外）
      if (data.startTime || data.endTime) {
        const conflictingBookings = await this.store.findConflicting(
          existingBooking.roomId,
          startTime,
          endTime,
          id
        )

        if (conflictingBookings.length > 0) {
          throw new Error('Room is already booked for the specified time')
        }
      }

      const updatedBooking = await this.store.update(id, data)
      if (!updatedBooking) {
        throw new Error('Booking not found')
      }

      logger.info('Booking updated successfully:', { bookingId: id })
      return updatedBooking
    } catch (error) {
      logger.error('Error updating booking:', error)
      throw error
    }
  }

  // 予約削除
  async deleteBooking(id: string): Promise<void> {
    try {
      const deleted = await this.store.delete(id)
      if (!deleted) {
        throw new Error('Booking not found')
      }

      logger.info('Booking deleted successfully:', { bookingId: id })
    } catch (error) {
      logger.error('Error deleting booking:', error)
      throw error
    }
  }

  // イベントIDで予約を検索
  async getBookingByEventId(eventId: string): Promise<Booking | null> {
    try {
      return await this.store.findByEventId(eventId)
    } catch (error) {
      logger.error('Error fetching booking by event ID:', error)
      throw error
    }
  }

  // 重複する予約を検索
  async getConflictingBookings(roomId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<Booking[]> {
    try {
      return await this.store.findConflicting(roomId, startTime, endTime, excludeId)
    } catch (error) {
      logger.error('Error checking booking conflicts:', error)
      throw error
    }
  }

  // 特定の期間の予約統計を取得
  async getBookingStats(startDate: Date, endDate: Date): Promise<{
    totalBookings: number
    confirmedBookings: number
    tentativeBookings: number
    cancelledBookings: number
    averageDuration: number
    peakHours: { hour: number; count: number }[]
  }> {
    try {
      const { bookings } = await this.store.findMany({
        startDate,
        endDate
      })

      const stats = {
        totalBookings: bookings.length,
        confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
        tentativeBookings: bookings.filter(b => b.status === 'tentative').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
        averageDuration: 0,
        peakHours: [] as { hour: number; count: number }[]
      }

      if (bookings.length > 0) {
        // 平均時間の計算
        const totalDuration = bookings.reduce((sum, booking) => {
          return sum + (booking.endTime.getTime() - booking.startTime.getTime())
        }, 0)
        stats.averageDuration = Math.round(totalDuration / bookings.length / (1000 * 60)) // 分単位

        // ピーク時間の計算
        const hourCounts = new Map<number, number>()
        bookings.forEach(booking => {
          const hour = booking.startTime.getHours()
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
        })

        stats.peakHours = Array.from(hourCounts.entries())
          .map(([hour, count]) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      }

      return stats
    } catch (error) {
      logger.error('Error calculating booking stats:', error)
      throw error
    }
  }

  // ユーザーの予約一覧を取得
  async getUserBookings(organizer: string, filters: Omit<BookingFilters, 'organizer'> = {}): Promise<{ bookings: Booking[]; total: number }> {
    try {
      return await this.store.findMany({
        ...filters,
        organizer
      })
    } catch (error) {
      logger.error('Error fetching user bookings:', error)
      throw error
    }
  }

  // 今後の予約を取得
  async getUpcomingBookings(limit: number = 10): Promise<Booking[]> {
    try {
      const now = new Date()
      const { bookings } = await this.store.findMany({
        startDate: now,
        status: 'confirmed',
        limit
      })

      return bookings
    } catch (error) {
      logger.error('Error fetching upcoming bookings:', error)
      throw error
    }
  }
}

export const bookingsService = new BookingsService()