import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import CameraGrid from '../components/CameraGrid.jsx'
import TeleopSidePanel from '../components/TeleopSidePanel.jsx'
import EasingOverlay from '../components/EasingOverlay.jsx'

export default function TeleopPage() {
  const { controlState, teleopMode, inputSource } = useApp()
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {controlState === 'controlling' && inputSource === 'exoskeleton' && teleopMode === 'easing' && (
        <EasingOverlay />
      )}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
          <CameraGrid />
        </div>
        <TeleopSidePanel />
      </div>
    </div>
  )
}
