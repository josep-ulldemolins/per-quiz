import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store.tsx'
import { Shell } from './components.tsx'
import { Auth } from './pages/Auth.tsx'
import { Home } from './pages/Home.tsx'
import { NewTest } from './pages/NewTest.tsx'
import { Quiz } from './pages/Quiz.tsx'
import { Results } from './pages/Results.tsx'
import { Questions } from './pages/Questions.tsx'
import { Stats } from './pages/Stats.tsx'
import { Settings } from './pages/Settings.tsx'
import { TheoryIndex, TheoryTopic } from './pages/Theory.tsx'

function RequireUser({ children }: { children: ReactNode }) {
  const { user, ready } = useApp()
  const loc = useLocation()
  if (!ready) return null
  if (!user) return <Navigate to="/entrar" replace state={{ from: loc.pathname }} />
  return <Shell>{children}</Shell>
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Auth mode="login" />} />
          <Route path="/registro" element={<Auth mode="register" />} />
          <Route path="/" element={<RequireUser><Home /></RequireUser>} />
          <Route path="/temario" element={<RequireUser><TheoryIndex /></RequireUser>} />
          <Route path="/temario/:topic" element={<RequireUser><TheoryTopic /></RequireUser>} />
          <Route path="/test/nuevo" element={<RequireUser><NewTest /></RequireUser>} />
          <Route path="/test/:id" element={<RequireUser><Quiz /></RequireUser>} />
          <Route path="/test/:id/resultado" element={<RequireUser><Results /></RequireUser>} />
          <Route path="/preguntas" element={<RequireUser><Questions /></RequireUser>} />
          <Route path="/estadisticas" element={<RequireUser><Stats /></RequireUser>} />
          <Route path="/ajustes" element={<RequireUser><Settings /></RequireUser>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
