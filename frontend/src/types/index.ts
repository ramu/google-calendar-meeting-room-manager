// 共通型定義のコピー
export interface User {
  email: string
  name: string
  picture?: string
  googleTokens?: {
    access_token: string
    refresh_token?: string
    expiry_date?: number
  }
}

export interface MeetingRoom {
  id: string
  name: string
  calendarId: string
  description?: string
  location?: string
  capacity: number
  equipment: string[]
  timeZone: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

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
  status: BookingStatus
  recurringEventId?: string
  isRecurring: boolean
  createdAt: Date
  updatedAt: Date
}

export type BookingStatus = 'confirmed' | 'tentative' | 'cancelled'

export interface CreateMeetingRoomRequest {
  name: string
  description?: string
  location?: string
  capacity: number
  equipment: string[]
  timeZone: string
}

export interface UpdateMeetingRoomRequest extends Partial<CreateMeetingRoomRequest> {
  isActive?: boolean
}

export interface CreateBookingRequest {
  roomId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  attendees: string[]
  recurrence?: RecurrenceRule
}

export interface UpdateBookingRequest extends Partial<CreateBookingRequest> {
  status?: BookingStatus
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  daysOfWeek?: number[]
  endDate?: Date
  count?: number
}

export interface TimeSlot {
  start: Date
  end: Date
  roomId: string
  isAvailable: boolean
}

export interface AvailabilityRequest {
  roomIds: string[]
  startDate: Date
  endDate: Date
  duration: number
}

export interface AvailabilityResponse {
  date: Date
  slots: TimeSlot[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    timestamp: string
  }
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

export interface AuthResponse {
  token: string
  user: User
}

export interface BookingFilters {
  roomId?: string
  startDate?: Date
  endDate?: Date
  status?: BookingStatus
  organizer?: string
  page?: number
  limit?: number
}

export interface RoomFilters {
  isActive?: boolean
  capacity?: number
  equipment?: string[]
  page?: number
  limit?: number
}

// フロントエンド固有の型定義
export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

export interface CalendarViewType {
  type: 'month' | 'week' | 'day'
  currentDate: Date
}

export interface BookingFormData {
  roomId: string
  title: string
  description?: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  attendees: string[]
  recurrence?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endDate?: string
  }
}

export interface RoomFormData {
  name: string
  description?: string
  location?: string
  capacity: number
  equipment: string[]
  timeZone: string
}

export interface FilterState {
  dateRange: {
    start: Date
    end: Date
  }
  roomIds: string[]
  status: BookingStatus[]
  organizer?: string
}