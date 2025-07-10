import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/services/auth'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    // URLフラグメントからトークンとユーザー情報を取得
    const hash = window.location.hash.substring(1)
    console.log('Hash:', hash)
    
    const params = new URLSearchParams(hash)
    
    const token = params.get('token')
    const userParam = params.get('user')
    
    console.log('Token:', token ? 'FOUND' : 'NOT FOUND')
    console.log('UserParam:', userParam)
    
    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam))
        console.log('Parsed user:', user)
        
        // 認証情報を保存
        login(token, user)
        
        // URLフラグメントをクリア
        window.location.hash = ''
        
        // ダッシュボードにリダイレクト
        navigate('/', { replace: true })
      } catch (error) {
        console.error('Failed to parse user data:', error)
        // エラーの場合はログインページにリダイレクト
        navigate('/login', { replace: true })
      }
    } else {
      console.error('Token or user data not found in URL')
      console.log('Available params:', Array.from(params.entries()))
      // トークンまたはユーザー情報がない場合はログインページにリダイレクト
      navigate('/login', { replace: true })
    }
  }, [login, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">認証処理中...</p>
      </div>
    </div>
  )
}

export default AuthCallback