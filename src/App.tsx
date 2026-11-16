import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Tasks from './pages/Tasks'
import Dashboard from './pages/Dashboard'
import Team from './pages/Team'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import { LogoMark } from './components/Logo'
import { useStore } from './lib/store'

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-primary-dark">
      <LogoMark className="h-12 w-auto animate-pulse" />
      <p className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">Loading HIVE Hub</p>
    </div>
  )
}

export default function App() {
  const booted = useStore((s) => s.booted)
  const boot = useStore((s) => s.boot)

  useEffect(() => {
    void boot()
  }, [boot])

  if (!booted) return <Splash />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/team" element={<Team />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/people/:id" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
