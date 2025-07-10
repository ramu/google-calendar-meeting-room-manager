import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { calendarService } from '../services/calendarService.js'
import { roomsService } from '../services/roomsService.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { logger } from '../utils/logger.js'
import { ApiError } from '../middleware/errorHandler.js'

const router = Router()

// 全てのルートで認証を必須とする
router.use(authMiddleware)

// 会議室一覧取得
router.get('/', [
  query('isActive').optional().isBoolean().toBoolean(),
  query('capacity').optional().isInt({ min: 1 }),
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
      isActive: req.query.isActive as boolean | undefined,
      capacity: req.query.capacity ? parseInt(req.query.capacity as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    }

    const result = await roomsService.getRooms(filters)
    
    res.json({
      success: true,
      data: result.rooms,
      meta: {
        total: result.total,
        page: filters.page,
        limit: filters.limit,
      }
    })
  } catch (error) {
    logger.error('Error fetching rooms:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch rooms' }
    })
  }
})

// 会議室詳細取得
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid room ID format'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Invalid room ID' }
      })
    }

    const room = await roomsService.getRoom(req.params.id)
    
    if (!room) {
      return res.status(404).json({
        error: { message: 'Room not found' }
      })
    }

    res.json({
      success: true,
      data: room
    })
  } catch (error) {
    logger.error('Error fetching room:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch room' }
    })
  }
})

// 会議室作成
router.post('/', [
  body('name').notEmpty().withMessage('Room name is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('description').optional().isString(),
  body('location').optional().isString(),
  body('equipment').optional().isArray(),
  body('timeZone').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const roomData = {
      name: req.body.name,
      description: req.body.description,
      location: req.body.location,
      capacity: req.body.capacity,
      equipment: req.body.equipment || [],
      timeZone: req.body.timeZone || 'Asia/Tokyo',
    }

    // Google Calendar でカレンダーを作成
    const calendar = await calendarService.createCalendar(req.user!.googleTokens, {
      summary: roomData.name,
      description: roomData.description,
      location: roomData.location,
      timeZone: roomData.timeZone,
    })

    // データベースに保存
    const room = await roomsService.createRoom({
      ...roomData,
      calendarId: calendar.id,
    })

    logger.info('Room created successfully:', { roomId: room.id, calendarId: calendar.id })

    res.status(201).json({
      success: true,
      data: room
    })
  } catch (error) {
    logger.error('Error creating room:', error)
    res.status(500).json({
      error: { message: 'Failed to create room' }
    })
  }
})

// 会議室更新
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid room ID format'),
  body('name').optional().notEmpty().withMessage('Room name cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('description').optional().isString(),
  body('location').optional().isString(),
  body('equipment').optional().isArray(),
  body('timeZone').optional().isString(),
  body('isActive').optional().isBoolean(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const roomId = req.params.id
    const updateData = req.body

    const existingRoom = await roomsService.getRoom(roomId)
    if (!existingRoom) {
      return res.status(404).json({
        error: { message: 'Room not found' }
      })
    }

    // Google Calendar の更新
    if (updateData.name || updateData.description || updateData.location || updateData.timeZone) {
      await calendarService.updateCalendar(req.user!.googleTokens, existingRoom.calendarId, {
        summary: updateData.name || existingRoom.name,
        description: updateData.description !== undefined ? updateData.description : existingRoom.description,
        location: updateData.location !== undefined ? updateData.location : existingRoom.location,
        timeZone: updateData.timeZone || existingRoom.timeZone,
      })
    }

    // データベースの更新
    const updatedRoom = await roomsService.updateRoom(roomId, updateData)

    logger.info('Room updated successfully:', { roomId })

    res.json({
      success: true,
      data: updatedRoom
    })
  } catch (error) {
    logger.error('Error updating room:', error)
    res.status(500).json({
      error: { message: 'Failed to update room' }
    })
  }
})

// 会議室削除
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid room ID format'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Invalid room ID' }
      })
    }

    const roomId = req.params.id

    const existingRoom = await roomsService.getRoom(roomId)
    if (!existingRoom) {
      return res.status(404).json({
        error: { message: 'Room not found' }
      })
    }

    // Google Calendar の削除
    try {
      await calendarService.deleteCalendar(req.user!.googleTokens, existingRoom.calendarId)
    } catch (error) {
      logger.warn('Failed to delete Google Calendar, proceeding with room deletion:', error)
    }

    // データベースから削除
    await roomsService.deleteRoom(roomId)

    logger.info('Room deleted successfully:', { roomId })

    res.json({
      success: true,
      message: 'Room deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting room:', error)
    res.status(500).json({
      error: { message: 'Failed to delete room' }
    })
  }
})

export const roomsRouter = router