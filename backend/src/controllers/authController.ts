import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'

const router = Router()

// Create OAuth2Client lazily to ensure environment variables are loaded
function getOAuth2Client() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URL
  })
}

export const authRouter = router

// Google OAuth URL generation
router.get('/google/url', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]

  const client = getOAuth2Client()
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    redirect_uri: process.env.GOOGLE_REDIRECT_URL,
    client_id: process.env.GOOGLE_CLIENT_ID,
  })

  res.json({ url })
})

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is required' })
    }

    const client = getOAuth2Client()
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URL
    })
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' })
    }

    // Get user info
    client.setCredentials(tokens)
    const userInfo = await client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo'
    })

    const userData = userInfo.data as any

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        googleTokens: tokens
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    )

    logger.info('User authenticated successfully', {
      email: userData.email,
      name: userData.name
    })

    // Redirect to frontend with token in URL fragment (more secure than query params)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const redirectUrl = `${frontendUrl}/auth/callback#token=${encodeURIComponent(jwtToken)}&user=${encodeURIComponent(JSON.stringify({
      email: userData.email,
      name: userData.name,
      picture: userData.picture
    }))}`
    
    res.redirect(redirectUrl)
  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

// Token refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' })
    }

    const client = getOAuth2Client()
    client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await client.refreshAccessToken()

    res.json({
      accessToken: credentials.access_token,
      expiresIn: credentials.expiry_date
    })
  } catch (error) {
    logger.error('Token refresh error:', error)
    res.status(401).json({ error: 'Token refresh failed' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' })
})