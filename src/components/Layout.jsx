import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import SideNav from './SideNav.jsx'
import TopStatusBar from './TopStatusBar.jsx'
import LeaveConfirmModal from './LeaveConfirmModal.jsx'
import { useApp } from '../state/AppContext.jsx'
import { useEffect, useState } from 'react'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { controlState, recordingState, releaseControl } = useApp()
  const [pending, setPending] = useState(null) // pending target path

  // Scroll reset on route change
  useEffect(() => {
    const main = document.getElementById('main-scroll')
    if (main) main.scrollTop = 0
  }, [location.pathname])

  const handleNav = (path) => {
    if (path === location.pathname) return
    if (controlState === 'controlling' || recordingState === 'recording') {
      setPending(path)
    } else {
      navigate(path)
    }
  }

  const confirm = () => {
    releaseControl()
    setPending(null)
    if (pending) navigate(pending)
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <SideNav currentPath={location.pathname} onNavigate={handleNav} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopStatusBar />
        <main
          id="main-scroll"
          className="flex-1 overflow-hidden flex flex-col min-h-0"
        >
          <Outlet />
        </main>
      </div>
      {pending && (
        <LeaveConfirmModal
          mode={recordingState === 'recording' ? 'recording' : 'controlling'}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}
