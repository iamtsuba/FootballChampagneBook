import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Personnages from './pages/Personnages'
import Equipes from './pages/Equipes'
import Saisons from './pages/Saisons'
import Categories from './pages/Categories'
import Competitions from './pages/Competitions'
import Matchs from './pages/Matchs'
import Arcs from './pages/Arcs'
import Livres from './pages/Livres'
import IATool from './pages/IATool'
import Classement from './pages/Classement'
import { ToastProvider } from './hooks/useToast'
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/personnages" element={<Personnages />} />
              <Route path="/equipes" element={<Equipes />} />
              <Route path="/saisons" element={<Saisons />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/competitions" element={<Competitions />} />
              <Route path="/matchs" element={<Matchs />} />
              <Route path="/arcs" element={<Arcs />} />
              <Route path="/livres" element={<Livres />} />
              <Route path="/ia-tool" element={<IATool />} />
              <Route path="/classement" element={<Classement />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
