import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Shortlist from './pages/Shortlist'
import NL from './pages/NL'
import Upload from './pages/Upload'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Navigate to='/dashboard' replace />} />
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='players' element={<Players />} />
          <Route path='shortlist' element={<Shortlist />} />
          <Route path='newsletter' element={<NL />} />
          <Route path='upload' element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
