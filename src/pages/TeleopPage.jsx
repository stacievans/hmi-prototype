import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import CameraGrid from '../components/CameraGrid.jsx'
import TeleopSidePanel from '../components/TeleopSidePanel.jsx'
import EasingOverlay from '../components/EasingOverlay.jsx'
import { Cable, Check, Circle } from 'lucide-react'

export default function TeleopPage() {
  const { controlState, teleopMode, inputSource, connectedDevices } = useApp()
  const cd = connectedDevices
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {controlState === 'controlling' && inputSource === 'exoskeleton' && teleopMode === 'easing' && (
        <EasingOverlay />
      )}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
          {/* Connect status bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card border border-border">
            <Cable size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">输入源</span>
            <Pill label="外骨骼" connected={cd.exoskeleton} active={inputSource === 'exoskeleton'} />
            <Pill label="VR" connected={cd.vr} active={inputSource === 'vr'} />
            <div className="flex-1" />
            {inputSource ? (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <Check size={12} />
                {inputSource === 'exoskeleton' ? '外骨骼' : 'VR'} 连接成功
              </div>
            ) : (
              <div className="text-xs text-warning">请先选择输入源</div>
            )}
          </div>
          <CameraGrid />
        </div>
        <TeleopSidePanel />
      </div>
    </div>
  )
}

function Pill({ label, connected, active }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
      ${active ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-secondary text-muted-foreground border border-transparent'}`}>
      <Circle size={8} className={connected ? 'fill-success text-success' : 'fill-danger text-danger'} />
      {label}
    </div>
  )
}
