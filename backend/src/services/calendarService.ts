import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { logger } from '../utils/logger.js'

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
}

export interface CalendarData {
  summary: string
  description?: string
  location?: string
  timeZone?: string
}

export interface EventData {
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
    resource?: boolean
  }[]
  recurrence?: string[]
  status?: string
}

class CalendarService {
  private getAuthClient(tokens: GoogleTokens): OAuth2Client {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    )
    client.setCredentials(tokens)
    return client
  }

  private getCalendarInstance(tokens: GoogleTokens) {
    const authClient = this.getAuthClient(tokens)
    return google.calendar({ version: 'v3', auth: authClient })
  }

  // カレンダーの作成
  async createCalendar(tokens: GoogleTokens, calendarData: CalendarData) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.calendars.insert({
        requestBody: {
          summary: calendarData.summary,
          description: calendarData.description,
          location: calendarData.location,
          timeZone: calendarData.timeZone || 'Asia/Tokyo',
          conferenceProperties: {
            allowedConferenceSolutionTypes: ['hangoutsMeet']
          }
        }
      })

      logger.info('Calendar created successfully:', { calendarId: response.data.id })
      return response.data
    } catch (error) {
      logger.error('Error creating calendar:', error)
      throw error
    }
  }

  // カレンダーの取得
  async getCalendar(tokens: GoogleTokens, calendarId: string) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.calendars.get({
        calendarId
      })

      return response.data
    } catch (error) {
      logger.error('Error fetching calendar:', error)
      throw error
    }
  }

  // カレンダーの更新
  async updateCalendar(tokens: GoogleTokens, calendarId: string, calendarData: CalendarData) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.calendars.update({
        calendarId,
        requestBody: {
          summary: calendarData.summary,
          description: calendarData.description,
          location: calendarData.location,
          timeZone: calendarData.timeZone || 'Asia/Tokyo'
        }
      })

      logger.info('Calendar updated successfully:', { calendarId })
      return response.data
    } catch (error) {
      logger.error('Error updating calendar:', error)
      throw error
    }
  }

  // カレンダーの削除
  async deleteCalendar(tokens: GoogleTokens, calendarId: string) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      await calendar.calendars.delete({
        calendarId
      })

      logger.info('Calendar deleted successfully:', { calendarId })
    } catch (error) {
      logger.error('Error deleting calendar:', error)
      throw error
    }
  }

  // イベントの作成
  async createEvent(tokens: GoogleTokens, calendarId: string, eventData: EventData) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: eventData.start,
          end: eventData.end,
          attendees: eventData.attendees,
          recurrence: eventData.recurrence,
          status: eventData.status || 'confirmed'
        }
      })

      logger.info('Event created successfully:', { eventId: response.data.id, calendarId })
      return response.data
    } catch (error) {
      logger.error('Error creating event:', error)
      throw error
    }
  }

  // イベントの取得
  async getEvent(tokens: GoogleTokens, calendarId: string, eventId: string) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.events.get({
        calendarId,
        eventId
      })

      return response.data
    } catch (error) {
      logger.error('Error fetching event:', error)
      throw error
    }
  }

  // イベントの更新
  async updateEvent(tokens: GoogleTokens, calendarId: string, eventId: string, eventData: Partial<EventData>) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: eventData.start,
          end: eventData.end,
          attendees: eventData.attendees,
          status: eventData.status
        }
      })

      logger.info('Event updated successfully:', { eventId, calendarId })
      return response.data
    } catch (error) {
      logger.error('Error updating event:', error)
      throw error
    }
  }

  // イベントの削除
  async deleteEvent(tokens: GoogleTokens, calendarId: string, eventId: string) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      await calendar.events.delete({
        calendarId,
        eventId
      })

      logger.info('Event deleted successfully:', { eventId, calendarId })
    } catch (error) {
      logger.error('Error deleting event:', error)
      throw error
    }
  }

  // イベント一覧の取得
  async getEvents(tokens: GoogleTokens, calendarId: string, options: {
    timeMin?: Date
    timeMax?: Date
    maxResults?: number
    singleEvents?: boolean
    orderBy?: string
  } = {}) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.events.list({
        calendarId,
        timeMin: options.timeMin?.toISOString(),
        timeMax: options.timeMax?.toISOString(),
        maxResults: options.maxResults || 250,
        singleEvents: options.singleEvents !== false,
        orderBy: options.orderBy || 'startTime'
      })

      return response.data.items || []
    } catch (error) {
      logger.error('Error fetching events:', error)
      throw error
    }
  }

  // 空き時間の取得
  async getFreeBusy(tokens: GoogleTokens, calendarIds: string[], timeMin: Date, timeMax: Date) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendarIds.map(id => ({ id }))
        }
      })

      return response.data
    } catch (error) {
      logger.error('Error fetching free/busy information:', error)
      throw error
    }
  }

  // カレンダーリストの取得
  async getCalendarList(tokens: GoogleTokens) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.calendarList.list({
        maxResults: 250
      })

      return response.data.items || []
    } catch (error) {
      logger.error('Error fetching calendar list:', error)
      throw error
    }
  }

  // ACL (Access Control List) の設定
  async setCalendarAcl(tokens: GoogleTokens, calendarId: string, rule: {
    role: 'owner' | 'reader' | 'writer'
    scope: {
      type: 'default' | 'user' | 'group' | 'domain'
      value?: string
    }
  }) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.acl.insert({
        calendarId,
        requestBody: {
          role: rule.role,
          scope: rule.scope
        }
      })

      logger.info('ACL set successfully:', { calendarId, rule })
      return response.data
    } catch (error) {
      logger.error('Error setting ACL:', error)
      throw error
    }
  }

  // 通知チャンネルの設定
  async watchEvents(tokens: GoogleTokens, calendarId: string, webhookUrl: string) {
    try {
      const calendar = this.getCalendarInstance(tokens)
      
      const response = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: `${calendarId}-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: '3600'
          }
        }
      })

      logger.info('Event watch channel created:', { calendarId, channelId: response.data.id })
      return response.data
    } catch (error) {
      logger.error('Error creating watch channel:', error)
      throw error
    }
  }
}

export const calendarService = new CalendarService()