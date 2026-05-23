import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from '@/pages/Home'
import Auth from '@/pages/Auth'
import Profile from '@/pages/Profile'
import NewListing from '@/pages/NewListing'
import ListingDetail from '@/pages/ListingDetail'
import BulkImport from '@/pages/BulkImport'
import EditListing from '@/pages/EditListing'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/importar" element={<BulkImport />} />
        <Route path="/anunciar" element={<NewListing />} />
        <Route path="/anuncio/:id/editar" element={<EditListing />} />
        <Route path="/anuncio/:id" element={<ListingDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
