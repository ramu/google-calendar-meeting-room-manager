import { Routes, Route } from 'react-router-dom'
import { GoogleAuthProvider } from '@/services/auth'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Rooms from '@/pages/Rooms'
import Bookings from '@/pages/Bookings'
import Calendar from '@/pages/Calendar'
import AuthCallback from '@/pages/AuthCallback'

function App() {
  return (
    <GoogleAuthProvider>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/calendar" element={<Calendar />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </GoogleAuthProvider>
  )
}

export default App