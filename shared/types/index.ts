// 共通型定義

// ユーザー関連
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

// 会議室関連
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

// 予約関連
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

// 繰り返し設定
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  daysOfWeek?: number[]
  endDate?: Date
  count?: number
}

// 空き時間関連
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

// カレンダー関連
export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: {
    email: string
    displayName?: string
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    resource?: boolean
  }[]
  status: 'confirmed' | 'tentative' | 'cancelled'
  recurringEventId?: string
  creator?: {
    email: string
    displayName?: string
  }
  organizer?: {
    email: string
    displayName?: string
  }
}

// API レスポンス
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

// 認証関連
export interface AuthResponse {
  token: string
  user: User
}

export interface TokenRefreshResponse {
  accessToken: string
  expiresIn: number
}

// 設定関連
export interface SystemSettings {
  workingHours: {
    start: string
    end: string
  }
  workingDays: number[]
  timeZone: string
  bookingLimits: {
    maxDuration: number
    maxAdvanceBooking: number
    minAdvanceBooking: number
  }
}

// フィルター・ソート
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BookingFilters extends PaginationParams {
  roomId?: string
  startDate?: Date
  endDate?: Date
  status?: BookingStatus
  organizer?: string
}

export interface RoomFilters extends PaginationParams {
  isActive?: boolean
  capacity?: number
  equipment?: string[]
}

// エラー
export interface ApiError {
  message: string
  code: string
  statusCode: number
  timestamp: string
  stack?: string
}