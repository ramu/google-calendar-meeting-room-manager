import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger.js'

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

export interface CreateMeetingRoomData {
  name: string
  calendarId: string
  description?: string
  location?: string
  capacity: number
  equipment: string[]
  timeZone: string
}

export interface UpdateMeetingRoomData {
  name?: string
  description?: string
  location?: string
  capacity?: number
  equipment?: string[]
  timeZone?: string
  isActive?: boolean
}

export interface RoomFilters {
  isActive?: boolean
  capacity?: number
  equipment?: string[]
  page?: number
  limit?: number
}

// インメモリデータストア（本番環境では実際のデータベースを使用）
class InMemoryRoomStore {
  private rooms: Map<string, MeetingRoom> = new Map()

  async create(data: CreateMeetingRoomData): Promise<MeetingRoom> {
    const room: MeetingRoom = {
      id: uuidv4(),
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.rooms.set(room.id, room)
    logger.info('Room created in store:', { roomId: room.id })
    return room
  }

  async findById(id: string): Promise<MeetingRoom | null> {
    return this.rooms.get(id) || null
  }

  async findMany(filters: RoomFilters = {}): Promise<{ rooms: MeetingRoom[]; total: number }> {
    let rooms = Array.from(this.rooms.values())

    // フィルタリング
    if (filters.isActive !== undefined) {
      rooms = rooms.filter(room => room.isActive === filters.isActive)
    }

    if (filters.capacity !== undefined) {
      rooms = rooms.filter(room => room.capacity >= filters.capacity!)
    }

    if (filters.equipment && filters.equipment.length > 0) {
      rooms = rooms.filter(room => 
        filters.equipment!.every(eq => room.equipment.includes(eq))
      )
    }

    const total = rooms.length

    // ページネーション
    const page = filters.page || 1
    const limit = filters.limit || 50
    const skip = (page - 1) * limit

    rooms = rooms.slice(skip, skip + limit)

    return { rooms, total }
  }

  async update(id: string, data: UpdateMeetingRoomData): Promise<MeetingRoom | null> {
    const room = this.rooms.get(id)
    if (!room) return null

    const updatedRoom: MeetingRoom = {
      ...room,
      ...data,
      updatedAt: new Date(),
    }

    this.rooms.set(id, updatedRoom)
    logger.info('Room updated in store:', { roomId: id })
    return updatedRoom
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.rooms.delete(id)
    if (deleted) {
      logger.info('Room deleted from store:', { roomId: id })
    }
    return deleted
  }

  async findByCalendarId(calendarId: string): Promise<MeetingRoom | null> {
    for (const room of this.rooms.values()) {
      if (room.calendarId === calendarId) {
        return room
      }
    }
    return null
  }
}

class RoomsService {
  private store = new InMemoryRoomStore()

  // 会議室作成
  async createRoom(data: CreateMeetingRoomData): Promise<MeetingRoom> {
    try {
      // 名前の重複チェック
      const existingRooms = await this.store.findMany()
      const duplicateName = existingRooms.rooms.find(room => 
        room.name.toLowerCase() === data.name.toLowerCase() && room.isActive
      )

      if (duplicateName) {
        throw new Error('Room with this name already exists')
      }

      // カレンダーIDの重複チェック
      const duplicateCalendar = await this.store.findByCalendarId(data.calendarId)
      if (duplicateCalendar) {
        throw new Error('Room with this calendar ID already exists')
      }

      const room = await this.store.create(data)
      logger.info('Room created successfully:', { roomId: room.id, name: room.name })
      return room
    } catch (error) {
      logger.error('Error creating room:', error)
      throw error
    }
  }

  // 会議室取得
  async getRoom(id: string): Promise<MeetingRoom | null> {
    try {
      return await this.store.findById(id)
    } catch (error) {
      logger.error('Error fetching room:', error)
      throw error
    }
  }

  // 会議室一覧取得
  async getRooms(filters: RoomFilters = {}): Promise<{ rooms: MeetingRoom[]; total: number }> {
    try {
      return await this.store.findMany(filters)
    } catch (error) {
      logger.error('Error fetching rooms:', error)
      throw error
    }
  }

  // 会議室更新
  async updateRoom(id: string, data: UpdateMeetingRoomData): Promise<MeetingRoom> {
    try {
      // 名前の重複チェック（自分以外）
      if (data.name) {
        const existingRooms = await this.store.findMany()
        const duplicateName = existingRooms.rooms.find(room => 
          room.id !== id &&
          room.name.toLowerCase() === data.name!.toLowerCase() && 
          room.isActive
        )

        if (duplicateName) {
          throw new Error('Room with this name already exists')
        }
      }

      const updatedRoom = await this.store.update(id, data)
      if (!updatedRoom) {
        throw new Error('Room not found')
      }

      logger.info('Room updated successfully:', { roomId: id })
      return updatedRoom
    } catch (error) {
      logger.error('Error updating room:', error)
      throw error
    }
  }

  // 会議室削除
  async deleteRoom(id: string): Promise<void> {
    try {
      const deleted = await this.store.delete(id)
      if (!deleted) {
        throw new Error('Room not found')
      }

      logger.info('Room deleted successfully:', { roomId: id })
    } catch (error) {
      logger.error('Error deleting room:', error)
      throw error
    }
  }

  // カレンダーIDで会議室を検索
  async getRoomByCalendarId(calendarId: string): Promise<MeetingRoom | null> {
    try {
      return await this.store.findByCalendarId(calendarId)
    } catch (error) {
      logger.error('Error fetching room by calendar ID:', error)
      throw error
    }
  }

  // 会議室の利用状況を取得
  async getRoomUtilization(roomId: string, startDate: Date, endDate: Date): Promise<{
    totalHours: number
    bookedHours: number
    utilizationRate: number
  }> {
    try {
      const room = await this.getRoom(roomId)
      if (!room) {
        throw new Error('Room not found')
      }

      // 営業時間の計算（9:00-18:00, 週5日）
      const workingHoursPerDay = 9 // 9時間
      const workingDaysPerWeek = 5
      
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const weeks = days / 7
      const totalHours = weeks * workingDaysPerWeek * workingHoursPerDay

      // TODO: 実際の予約時間を計算（bookingsServiceと連携）
      const bookedHours = 0 // プレースホルダー

      const utilizationRate = totalHours > 0 ? (bookedHours / totalHours) * 100 : 0

      return {
        totalHours: Math.round(totalHours),
        bookedHours,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      }
    } catch (error) {
      logger.error('Error calculating room utilization:', error)
      throw error
    }
  }

  // 会議室の設備でフィルタリング
  async getRoomsByEquipment(equipment: string[]): Promise<MeetingRoom[]> {
    try {
      const result = await this.store.findMany({ equipment, isActive: true })
      return result.rooms
    } catch (error) {
      logger.error('Error fetching rooms by equipment:', error)
      throw error
    }
  }

  // 収容人数で会議室を検索
  async getRoomsByCapacity(minCapacity: number): Promise<MeetingRoom[]> {
    try {
      const result = await this.store.findMany({ capacity: minCapacity, isActive: true })
      return result.rooms
    } catch (error) {
      logger.error('Error fetching rooms by capacity:', error)
      throw error
    }
  }

  // 会議室カレンダーかどうかを判別
  private isRoomCalendar(calendar: any): boolean {
    const name = calendar.summary?.toLowerCase() || ''
    const description = calendar.description?.toLowerCase() || ''
    
    // 会議室キーワード
    const roomKeywords = ['会議室', '会議', 'meeting', 'room', 'conference', 'ミーティング']
    
    // 除外キーワード（一般的なイベントカレンダー）
    const excludeKeywords = ['勉強会', 'study', 'event', 'イベント', 'セミナー', 'workshop']
    
    // 除外キーワードが含まれていたら除外
    if (excludeKeywords.some(keyword => name.includes(keyword) || description.includes(keyword))) {
      return false
    }
    
    // 会議室キーワードが含まれていたら会議室として判定
    if (roomKeywords.some(keyword => name.includes(keyword) || description.includes(keyword))) {
      return true
    }
    
    // このアプリで作成されたカレンダーは会議室として判定
    if (description.includes('meeting room manager') || description.includes('会議室管理')) {
      return true
    }
    
    return false
  }

  // Google Calendarから会議室データを再同期
  async syncRoomsFromGoogleCalendar(tokens: any, options: {
    autoFilter?: boolean;
    selectedCalendarIds?: string[];
  } = {}): Promise<{ 
    synced: number; 
    created: number; 
    updated: number; 
    errors: string[];
    skipped: number;
    availableCalendars?: { id: string; name: string; description?: string }[];
  }> {
    try {
      const { calendarService } = await import('./calendarService.js')
      const calendars = await calendarService.getCalendarList(tokens)
      
      let synced = 0
      let created = 0
      let updated = 0
      let skipped = 0
      const errors: string[] = []
      const availableCalendars: { id: string; name: string; description?: string }[] = []
      
      // 利用可能なカレンダーリストを作成
      for (const calendar of calendars) {
        if (!calendar.primary && calendar.summary && calendar.id?.includes('@group.calendar.google.com')) {
          availableCalendars.push({
            id: calendar.id,
            name: calendar.summary,
            description: calendar.description
          })
        }
      }
      
      // 手動選択モードの場合、利用可能なカレンダーリストを返す
      if (options.selectedCalendarIds) {
        return {
          synced: 0,
          created: 0,
          updated: 0,
          errors: [],
          skipped: 0,
          availableCalendars
        }
      }
      
      for (const calendar of calendars) {
        try {
          // プライマリカレンダーやシステムカレンダーを除外
          if (calendar.primary || !calendar.summary || !calendar.id?.includes('@group.calendar.google.com')) {
            continue
          }
          
          // 自動フィルタリング有効時は会議室カレンダーのみを処理
          if (options.autoFilter !== false && !this.isRoomCalendar(calendar)) {
            skipped++
            logger.debug('Skipped non-room calendar:', { 
              calendarId: calendar.id,
              name: calendar.summary
            })
            continue
          }
          
          // 既存の会議室を検索
          const existingRoom = await this.store.findByCalendarId(calendar.id!)
          
          if (existingRoom) {
            // 既存の会議室を更新
            const updateData: UpdateMeetingRoomData = {
              name: calendar.summary,
              description: calendar.description || undefined,
              location: calendar.location || undefined,
              timeZone: calendar.timeZone || 'Asia/Tokyo'
            }
            
            await this.store.update(existingRoom.id, updateData)
            updated++
            logger.info('Room updated from Google Calendar:', { 
              roomId: existingRoom.id, 
              calendarId: calendar.id 
            })
          } else {
            // 新しい会議室を作成
            const roomData: CreateMeetingRoomData = {
              name: calendar.summary,
              calendarId: calendar.id!,
              description: calendar.description || undefined,
              location: calendar.location || undefined,
              capacity: 6, // デフォルト値
              equipment: [], // デフォルト値
              timeZone: calendar.timeZone || 'Asia/Tokyo'
            }
            
            await this.store.create(roomData)
            created++
            logger.info('Room created from Google Calendar:', { 
              calendarId: calendar.id,
              name: calendar.summary
            })
          }
          
          synced++
        } catch (error) {
          const errorMessage = `Failed to sync calendar ${calendar.summary}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMessage)
          logger.error('Error syncing calendar:', { 
            calendarId: calendar.id,
            error: errorMessage
          })
        }
      }
      
      logger.info('Google Calendar sync completed:', { 
        synced, 
        created, 
        updated, 
        skipped,
        errors: errors.length 
      })
      
      return { synced, created, updated, errors, skipped }
    } catch (error) {
      logger.error('Error syncing rooms from Google Calendar:', error)
      throw error
    }
  }
}

export const roomsService = new RoomsService()