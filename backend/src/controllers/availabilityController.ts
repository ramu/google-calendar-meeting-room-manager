import { Router, Request, Response } from 'express'
import { query, validationResult } from 'express-validator'
import { availabilityService } from '../services/availabilityService.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { logger } from '../utils/logger.js'

const router = Router()

// 全てのルートで認証を必須とする
router.use(authMiddleware)

// 空き時間取得
router.get('/', [
  query('roomIds').notEmpty().withMessage('Room IDs are required'),
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  query('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const roomIds = Array.isArray(req.query.roomIds) 
      ? req.query.roomIds as string[]
      : [req.query.roomIds as string]
    
    const startDate = new Date(req.query.startDate as string)
    const endDate = new Date(req.query.endDate as string)
    const duration = parseInt(req.query.duration as string)

    // 日付の妥当性チェック
    if (startDate >= endDate) {
      return res.status(400).json({
        error: { message: 'End date must be after start date' }
      })
    }

    // 最大検索期間のチェック（30日）
    const maxDays = 30
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > maxDays) {
      return res.status(400).json({
        error: { message: `Search period cannot exceed ${maxDays} days` }
      })
    }

    const availability = await availabilityService.getAvailability(
      req.user!.googleTokens,
      {
        roomIds,
        startDate,
        endDate,
        duration,
      }
    )

    res.json({
      success: true,
      data: availability
    })
  } catch (error) {
    logger.error('Error fetching availability:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch availability' }
    })
  }
})

// 特定の会議室の空き時間取得
router.get('/:roomId', [
  query('date').isISO8601().withMessage('Valid date is required'),
  query('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const roomId = req.params.roomId
    const date = new Date(req.query.date as string)
    const duration = req.query.duration ? parseInt(req.query.duration as string) : 60

    // 日付の範囲を設定（その日の始まりから終わりまで）
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const availability = await availabilityService.getAvailability(
      req.user!.googleTokens,
      {
        roomIds: [roomId],
        startDate,
        endDate,
        duration,
      }
    )

    res.json({
      success: true,
      data: availability
    })
  } catch (error) {
    logger.error('Error fetching room availability:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch room availability' }
    })
  }
})

// 複数の会議室の空き時間を同時に取得
router.post('/bulk', [
  query('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: { message: 'Validation failed', errors: errors.array() }
      })
    }

    const { requests } = req.body
    const duration = parseInt(req.query.duration as string)

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        error: { message: 'Requests array is required' }
      })
    }

    // 各リクエストの妥当性チェック
    for (const request of requests) {
      if (!request.roomIds || !Array.isArray(request.roomIds)) {
        return res.status(400).json({
          error: { message: 'Each request must have roomIds array' }
        })
      }
      
      if (!request.startDate || !request.endDate) {
        return res.status(400).json({
          error: { message: 'Each request must have startDate and endDate' }
        })
      }

      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate)
      
      if (startDate >= endDate) {
        return res.status(400).json({
          error: { message: 'End date must be after start date for all requests' }
        })
      }
    }

    // 並列で複数の空き時間を取得
    const results = await Promise.all(
      requests.map(async (request: any) => {
        try {
          const availability = await availabilityService.getAvailability(
            req.user!.googleTokens,
            {
              roomIds: request.roomIds,
              startDate: new Date(request.startDate),
              endDate: new Date(request.endDate),
              duration,
            }
          )
          return {
            success: true,
            data: availability,
            requestId: request.id,
          }
        } catch (error) {
          logger.error('Error in bulk availability request:', error)
          return {
            success: false,
            error: 'Failed to fetch availability',
            requestId: request.id,
          }
        }
      })
    )

    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    logger.error('Error in bulk availability fetch:', error)
    res.status(500).json({
      error: { message: 'Failed to fetch bulk availability' }
    })
  }
})

export const availabilityRouter = router