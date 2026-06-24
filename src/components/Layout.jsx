import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import SideNav from './SideNav.jsx'
import TopStatusBar from './TopStatusBar.jsx'
import LeaveConfirmModal from './LeaveConfirmModal.jsx'
import { useApp } from '../state/AppContext.jsx'
import { useEffect, useState } from 'react'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { controlState, recordingState, releaseControl, appToast, showAppToast } = useApp()
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
    const path = pending
    const interrupted = releaseControl()
    setPending(null)
    if (interrupted) showAppToast('采集已中断，本次数据未保存')
    if (path) navigate(path)
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
      {appToast && (
        <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
          <div
            key={appToast.id}
            className="px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm text-foreground animate-in fade-in slide-in-from-bottom-2"
          >
            {appToast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
