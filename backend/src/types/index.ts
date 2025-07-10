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
  status: 'confirmed' | 'tentative' | 'cancelled'
  recurringEventId?: string
  isRecurring: boolean
  createdAt: Date
  updatedAt: Date
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

// バックエンド固有の型定義
export interface ServerConfig {
  port: number
  nodeEnv: string
  corsOrigin: string
  jwtSecret: string
  jwtExpiresIn: string
  googleClientId: string
  googleClientSecret: string
  googleRedirectUrl: string
  rateLimitWindowMs: number
  rateLimitMaxRequests: number
}

export interface DatabaseConnection {
  host: string
  port: number
  database: string
  username: string
  password: string
}

export interface LoggerConfig {
  level: string
  format: string
  transports: string[]
}

export interface WebhookPayload {
  resourceId: string
  resourceUri: string
  eventType: string
  eventId?: string
  calendarId: string
  timestamp: Date
}