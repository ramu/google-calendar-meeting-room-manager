import { calendarService, GoogleTokens } from './calendarService.js'
import { roomsService } from './roomsService.js'
import { logger } from '../utils/logger.js'

export interface AvailabilityRequest {
  roomIds: string[]
  startDate: Date
  endDate: Date
  duration: number
}

export interface TimeSlot {
  start: Date
  end: Date
  roomId: string
  isAvailable: boolean
}

export interface AvailabilityResponse {
  date: Date
  slots: TimeSlot[]
}

class AvailabilityService {
  // 空き時間の取得
  async getAvailability(tokens: GoogleTokens, request: AvailabilityRequest): Promise<AvailabilityResponse[]> {
    try {
      const { roomIds, startDate, endDate, duration } = request

      // 会議室情報の取得
      const rooms = await Promise.all(
        roomIds.map(roomId => roomsService.getRoom(roomId))
      )

      const validRooms = rooms.filter(room => room !== null)
      if (validRooms.length === 0) {
        throw new Error('No valid rooms found')
      }

      // Google Calendar から空き時間情報を取得
      const calendarIds = validRooms.map(room => room.calendarId)
      const freeBusyData = await calendarService.getFreeBusy(
        tokens,
        calendarIds,
        startDate,
        endDate
      )

      // 各日付の空き時間を計算
      const availabilityByDate = new Map<string, TimeSlot[]>()
      
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0]
        const daySlots: TimeSlot[] = []

        for (const room of validRooms) {
          const roomSlots = this.calculateAvailableSlots(
            room.calendarId,
            freeBusyData,
            currentDate,
            duration,
            room.id
          )
          daySlots.push(...roomSlots)
        }

        availabilityByDate.set(dateKey, daySlots)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // 結果を整形
      const result: AvailabilityResponse[] = []
      for (const [dateKey, slots] of availabilityByDate) {
        result.push({
          date: new Date(dateKey),
          slots: slots.sort((a, b) => a.start.getTime() - b.start.getTime())
        })
      }

      return result.sort((a, b) => a.date.getTime() - b.date.getTime())
    } catch (error) {
      logger.error('Error fetching availability:', error)
      throw error
    }
  }

  // 特定の会議室の空き時間スロットを計算
  private calculateAvailableSlots(
    calendarId: string,
    freeBusyData: any,
    date: Date,
    duration: number,
    roomId: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = []
    const busyTimes = freeBusyData.calendars?.[calendarId]?.busy || []

    // 営業時間の設定 (9:00 - 18:00)
    const workingHours = {
      start: 9,
      end: 18
    }

    // その日の営業時間を設定
    const dayStart = new Date(date)
    dayStart.setHours(workingHours.start, 0, 0, 0)
    
    const dayEnd = new Date(date)
    dayEnd.setHours(workingHours.end, 0, 0, 0)

    // 忙しい時間帯を Date オブジェクトに変換
    const busyPeriods = busyTimes.map((period: any) => ({
      start: new Date(period.start),
      end: new Date(period.end)
    })).sort((a: any, b: any) => a.start.getTime() - b.start.getTime())

    // 空き時間スロットを計算
    let currentTime = new Date(dayStart)
    
    for (const busyPeriod of busyPeriods) {
      // 現在時刻と忙しい時間の開始の間に空きがあるかチェック
      if (currentTime < busyPeriod.start) {
        const availableEnd = new Date(Math.min(busyPeriod.start.getTime(), dayEnd.getTime()))
        
        // 指定された時間以上の空きがあるスロットを生成
        while (currentTime.getTime() + duration * 60000 <= availableEnd.getTime()) {
          const slotEnd = new Date(currentTime.getTime() + duration * 60000)
          
          slots.push({
            start: new Date(currentTime),
            end: slotEnd,
            roomId,
            isAvailable: true
          })
          
          // 次のスロット（15分間隔）
          currentTime = new Date(currentTime.getTime() + 15 * 60000)
        }
      }
      
      // 忙しい時間の終了時刻に進む
      currentTime = new Date(Math.max(currentTime.getTime(), busyPeriod.end.getTime()))
    }

    // 最後の忙しい時間の後に空きがあるかチェック
    if (currentTime < dayEnd) {
      while (currentTime.getTime() + duration * 60000 <= dayEnd.getTime()) {
        const slotEnd = new Date(currentTime.getTime() + duration * 60000)
        
        slots.push({
          start: new Date(currentTime),
          end: slotEnd,
          roomId,
          isAvailable: true
        })
        
        // 次のスロット（15分間隔）
        currentTime = new Date(currentTime.getTime() + 15 * 60000)
      }
    }

    return slots
  }

  // 複数の会議室の空き時間を同時に取得
  async getBulkAvailability(tokens: GoogleTokens, requests: AvailabilityRequest[]): Promise<AvailabilityResponse[][]> {
    try {
      const results = await Promise.all(
        requests.map(request => this.getAvailability(tokens, request))
      )
      
      return results
    } catch (error) {
      logger.error('Error fetching bulk availability:', error)
      throw error
    }
  }

  // 最適な会議室を推奨
  async suggestBestRoom(
    tokens: GoogleTokens,
    startTime: Date,
    endTime: Date,
    requiredCapacity: number,
    preferredEquipment: string[] = []
  ): Promise<any[]> {
    try {
      // 利用可能な会議室を取得
      const rooms = await roomsService.getRooms({
        isActive: true,
        capacity: requiredCapacity
      })

      if (rooms.rooms.length === 0) {
        return []
      }

      // 空き時間を確認
      const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      const availability = await this.getAvailability(tokens, {
        roomIds: rooms.rooms.map(room => room.id),
        startDate: startTime,
        endDate: endTime,
        duration
      })

      // 利用可能な会議室をフィルタリング
      const availableRooms = []
      for (const room of rooms.rooms) {
        const roomAvailability = availability.find(avail => 
          avail.slots.some(slot => 
            slot.roomId === room.id && 
            slot.start <= startTime && 
            slot.end >= endTime
          )
        )
        
        if (roomAvailability) {
          // スコアを計算（設備の一致度、収容人数の適切さなど）
          let score = 0
          
          // 設備の一致度
          const matchingEquipment = preferredEquipment.filter(eq => 
            room.equipment.includes(eq)
          )
          score += matchingEquipment.length * 10
          
          // 収容人数の適切さ（必要人数に近いほど高得点）
          if (room.capacity >= requiredCapacity) {
            score += Math.max(0, 50 - (room.capacity - requiredCapacity))
          }
          
          availableRooms.push({
            ...room,
            score,
            matchingEquipment
          })
        }
      }

      // スコア順にソート
      return availableRooms.sort((a, b) => b.score - a.score)
    } catch (error) {
      logger.error('Error suggesting best room:', error)
      throw error
    }
  }
}

export const availabilityService = new AvailabilityService()