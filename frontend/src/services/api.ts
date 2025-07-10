import axios, { AxiosInstance } from 'axios'
import { 
  ApiResponse, 
  MeetingRoom, 
  CreateMeetingRoomRequest, 
  UpdateMeetingRoomRequest,
  Booking,
  CreateBookingRequest,
  UpdateBookingRequest,
  AvailabilityRequest,
  AvailabilityResponse,
  AuthResponse,
  BookingFilters,
  RoomFilters
} from '@/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Auth endpoints
  async getGoogleAuthUrl(): Promise<{ url: string }> {
    const response = await this.client.get('/auth/google/url')
    return response.data
  }

  async authenticateWithGoogle(code: string): Promise<AuthResponse> {
    const response = await this.client.post('/auth/google/callback', { code })
    return response.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }

  // Room endpoints
  async getRooms(filters?: RoomFilters): Promise<ApiResponse<MeetingRoom[]>> {
    const response = await this.client.get('/rooms', { params: filters })
    return response.data
  }

  async getRoom(id: string): Promise<ApiResponse<MeetingRoom>> {
    const response = await this.client.get(`/rooms/${id}`)
    return response.data
  }

  async createRoom(roomData: CreateMeetingRoomRequest): Promise<ApiResponse<MeetingRoom>> {
    const response = await this.client.post('/rooms', roomData)
    return response.data
  }

  async updateRoom(id: string, roomData: UpdateMeetingRoomRequest): Promise<ApiResponse<MeetingRoom>> {
    const response = await this.client.put(`/rooms/${id}`, roomData)
    return response.data
  }

  async deleteRoom(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/rooms/${id}`)
    return response.data
  }

  // Booking endpoints
  async getBookings(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    const response = await this.client.get('/bookings', { params: filters })
    return response.data
  }

  async getBooking(id: string): Promise<ApiResponse<Booking>> {
    const response = await this.client.get(`/bookings/${id}`)
    return response.data
  }

  async createBooking(bookingData: CreateBookingRequest): Promise<ApiResponse<Booking>> {
    const response = await this.client.post('/bookings', bookingData)
    return response.data
  }

  async updateBooking(id: string, bookingData: UpdateBookingRequest): Promise<ApiResponse<Booking>> {
    const response = await this.client.put(`/bookings/${id}`, bookingData)
    return response.data
  }

  async deleteBooking(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/bookings/${id}`)
    return response.data
  }

  // Availability endpoints
  async getAvailability(request: AvailabilityRequest): Promise<ApiResponse<AvailabilityResponse[]>> {
    const response = await this.client.get('/availability', { params: request })
    return response.data
  }
}

export const apiClient = new ApiClient()
export default apiClient