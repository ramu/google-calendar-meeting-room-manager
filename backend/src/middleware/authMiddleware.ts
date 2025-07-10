import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'

export interface AuthenticatedUser {
  email: string
  name: string
  picture?: string
  googleTokens: {
    access_token: string
    refresh_token?: string
    expiry_date?: number
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req)
    
    if (!token) {
      return res.status(401).json({
        error: { 
          message: 'Access token is required',
          code: 'TOKEN_MISSING'
        }
      })
    }

    // JWT トークンを検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // トークンの有効期限をチェック
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: { 
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      })
    }

    // Google トークンの有効期限をチェック
    if (decoded.googleTokens?.expiry_date && Date.now() >= decoded.googleTokens.expiry_date) {
      return res.status(401).json({
        error: { 
          message: 'Google access token has expired',
          code: 'GOOGLE_TOKEN_EXPIRED'
        }
      })
    }

    // ユーザー情報をリクエストに追加
    req.user = {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      googleTokens: decoded.googleTokens
    }

    logger.debug('User authenticated:', { email: decoded.email })
    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: { 
          message: 'Invalid token',
          code: 'TOKEN_INVALID'
        }
      })
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: { 
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      })
    }

    return res.status(500).json({
      error: { 
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      }
    })
  }
}

// オプショナル認証ミドルウェア（認証されていなくても処理を続行）
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req)
    
    if (!token) {
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // トークンが有効な場合のみユーザー情報を設定
    if (decoded.exp && Date.now() < decoded.exp * 1000) {
      req.user = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        googleTokens: decoded.googleTokens
      }
    }

    next()
  } catch (error) {
    // エラーが発生しても処理を続行
    logger.debug('Optional authentication failed:', error)
    next()
  }
}

// 管理者権限チェックミドルウェア
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: { 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }
    })
  }

  // 管理者メールアドレスのリスト（環境変数から取得）
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  
  if (!adminEmails.includes(req.user.email)) {
    logger.warn('Unauthorized admin access attempt:', { email: req.user.email })
    return res.status(403).json({
      error: { 
        message: 'Admin privileges required',
        code: 'INSUFFICIENT_PRIVILEGES'
      }
    })
  }

  next()
}

// リソース所有者チェックミドルウェア
export const resourceOwnerMiddleware = (resourceField: string = 'organizer') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      })
    }

    // リソースの所有者チェックは実際のリソース取得時に行う
    // ここでは認証済みユーザーであることのみ確認
    next()
  }
}

// トークン抽出ヘルパー関数
function extractToken(req: Request): string | null {
  // Authorization ヘッダーから Bearer トークンを抽出
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // クッキーからトークンを抽出（オプション）
  const cookieToken = req.cookies?.auth_token
  if (cookieToken) {
    return cookieToken
  }

  // クエリパラメータからトークンを抽出（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    const queryToken = req.query.token as string
    if (queryToken) {
      return queryToken
    }
  }

  return null
}

// JWT トークンの検証（有効期限なし）
export const verifyToken = (token: string): AuthenticatedUser | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      googleTokens: decoded.googleTokens
    }
  } catch (error) {
    logger.error('Token verification failed:', error)
    return null
  }
}

// JWT トークンの生成
export const generateToken = (user: AuthenticatedUser, expiresIn: string = '24h'): string => {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      picture: user.picture,
      googleTokens: user.googleTokens
    },
    process.env.JWT_SECRET!,
    { expiresIn } as jwt.SignOptions
  )
}

// リフレッシュトークンの検証と新しいアクセストークンの生成
export const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any
    
    // 新しいアクセストークンを生成
    const newToken = generateToken({
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      googleTokens: decoded.googleTokens
    }, '1h')

    return newToken
  } catch (error) {
    logger.error('Refresh token verification failed:', error)
    return null
  }
}