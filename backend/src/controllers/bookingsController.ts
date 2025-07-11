import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { calendarService } from '../services/calendarService.js'
import { bookingsService } from '../services/bookingsService.js'
import { roomsService } from '../services/roomsService.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { logger } from '../utils/logger.js'

const router = Router()

// 全てのルートで認証を必須とする
router.use(authMiddleware)

// 予約一覧取得
router.get('/', [
  query('roomId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['confirmed', 'tentative', 'cancelled']),
  query('organizer').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const filters = {
      roomId: req.query.roomId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      status: req.query.status as 'confirmed' | 'tentative' | 'cancelled' | undefined,
      organizer: req.query.organizer as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    }

    const result = await bookingsService.getBookings(filters)
    
    res.json({
      success: true,
      data: result.bookings,
      meta: {
        total: result.total,
        page: filters.page,
        limit: filters.limit,
      }
    })
  } catch (error) {
    logger.error('Error fetching bookings:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch bookings' }
    })
  }
})

// 予約詳細取得
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid booking ID format'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Invalid booking ID' }
      })
    }

    const booking = await bookingsService.getBooking(req.params.id)
    
    if (!booking) {
      return res.status(404).json({
        error: { message: 'Booking not found' }
      })
    }

    res.json({
      success: true,
      data: booking
    })
  } catch (error) {
    logger.error('Error fetching booking:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch booking' }
    })
  }
})

// 予約作成
router.post('/', [
  body('roomId').isUUID().withMessage('Valid room ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('description').optional().isString(),
  body('attendees').optional().isArray(),
  body('recurrence').optional().isObject(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const {
      roomId,
      title,
      description,
      startTime,
      endTime,
      attendees = [],
      recurrence
    } = req.body

    // 会議室の存在確認
    const room = await roomsService.getRoom(roomId)
    if (!room) {
      return res.status(404).json({
        error: { message: 'Room not found' }
      })
    }

    // 時間の妥当性チェック
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (start >= end) {
      return res.status(400).json({
        error: { message: 'End time must be after start time' }
      })
    }

    // 重複チェック
    const conflictingBookings = await bookingsService.getBookings({
      roomId,
      startDate: start,
      endDate: end,
      status: 'confirmed'
    })

    if (conflictingBookings.bookings.length > 0) {
      return res.status(409).json({
        error: { message: 'Room is already booked for the specified time' }
      })
    }

    // Google Calendar でイベントを作成
    const eventData = {
      summary: title,
      description,
      start: {
        dateTime: start.toISOString(),
        timeZone: room.timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: room.timeZone,
      },
      attendees: [
        {
          email: `${room.calendarId}@group.calendar.google.com`,
          resource: true,
        },
        ...attendees.map((email: string) => ({ email })),
      ],
      recurrence: recurrence ? [
        `RRULE:FREQ=${recurrence.frequency.toUpperCase()};INTERVAL=${recurrence.interval}${
          recurrence.endDate ? `;UNTIL=${new Date(recurrence.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z` : ''
        }`
      ] : undefined,
    }

    const event = await calendarService.createEvent(
      req.user!.googleTokens,
      room.calendarId,
      eventData
    )

    // データベースに保存
    const booking = await bookingsService.createBooking({
      eventId: event.id!,
      calendarId: room.calendarId,
      roomId,
      title,
      description,
      startTime: start,
      endTime: end,
      organizer: req.user?.email || '',
      attendees,
      status: 'confirmed',
      isRecurring: !!recurrence,
      recurringEventId: event.recurringEventId || undefined,
    })

    logger.info('Booking created successfully:', { bookingId: booking.id, eventId: event.id })

    res.status(201).json({
      success: true,
      data: booking
    })
  } catch (error) {
    logger.error('Error creating booking:', error)
    res.status(500).json({
      error: { message: 'Failed to create booking' }
    })
  }
})

// 予約更新
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid booking ID format'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time is required'),
  body('description').optional().isString(),
  body('attendees').optional().isArray(),
  body('status').optional().isIn(['confirmed', 'tentative', 'cancelled']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const bookingId = req.params.id
    const updateData = req.body

    const existingBooking = await bookingsService.getBooking(bookingId)
    if (!existingBooking) {
      return res.status(404).json({
        error: { message: 'Booking not found' }
      })
    }

    // 時間の妥当性チェック
    if (updateData.startTime || updateData.endTime) {
      const start = new Date(updateData.startTime || existingBooking.startTime)
      const end = new Date(updateData.endTime || existingBooking.endTime)
      
      if (start >= end) {
        return res.status(400).json({
          error: { message: 'End time must be after start time' }
        })
      }
    }

    // Google Calendar でイベントを更新
    const eventUpdateData: any = {}
    if (updateData.title) eventUpdateData.summary = updateData.title
    if (updateData.description !== undefined) eventUpdateData.description = updateData.description
    if (updateData.startTime) {
      eventUpdateData.start = {
        dateTime: new Date(updateData.startTime).toISOString(),
        timeZone: 'Asia/Tokyo',
      }
    }
    if (updateData.endTime) {
      eventUpdateData.end = {
        dateTime: new Date(updateData.endTime).toISOString(),
        timeZone: 'Asia/Tokyo',
      }
    }
    if (updateData.attendees) {
      eventUpdateData.attendees = [
        { email: `${existingBooking.calendarId}@group.calendar.google.com`, resource: true },
        ...updateData.attendees.map((email: string) => ({ email })),
      ]
    }
    if (updateData.status) {
      eventUpdateData.status = updateData.status
    }

    await calendarService.updateEvent(
      req.user!.googleTokens,
      existingBooking.calendarId,
      existingBooking.eventId,
      eventUpdateData
    )

    // データベースの更新
    const updatedBooking = await bookingsService.updateBooking(bookingId, updateData)

    logger.info('Booking updated successfully:', { bookingId })

    res.json({
      success: true,
      data: updatedBooking
    })
  } catch (error) {
    logger.error('Error updating booking:', error)
    res.status(500).json({
      error: { message: 'Failed to update booking' }
    })
  }
})

// 予約削除
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid booking ID format'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Invalid booking ID' }
      })
    }

    const bookingId = req.params.id

    const existingBooking = await bookingsService.getBooking(bookingId)
    if (!existingBooking) {
      return res.status(404).json({
        error: { message: 'Booking not found' }
      })
    }

    // Google Calendar からイベントを削除
    try {
      await calendarService.deleteEvent(
        req.user!.googleTokens,
        existingBooking.calendarId,
        existingBooking.eventId
      )
    } catch (error) {
      logger.warn('Failed to delete Google Calendar event, proceeding with booking deletion:', error)
    }

    // データベースから削除
    await bookingsService.deleteBooking(bookingId)

    logger.info('Booking deleted successfully:', { bookingId })

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting booking:', error)
    res.status(500).json({
      error: { message: 'Failed to delete booking' }
    })
  }
})

export const bookingsRouter = router