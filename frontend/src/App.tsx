import { Routes, Route } from 'react-router-dom'
import { GoogleAuthProvider } from '@/services/auth'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Rooms from '@/pages/Rooms'
import Bookings from '@/pages/Bookings'
import Calendar from '@/pages/Calendar'

function App() {
  return (
    <GoogleAuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/calendar" element={<Calendar />} />
        </Routes>
      </Layout>
    </GoogleAuthProvider>
  )
}

export default App