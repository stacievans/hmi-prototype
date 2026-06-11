import { useState } from 'react'
import { Wifi, Battery, ChevronDown, TriangleAlert } from 'lucide-react'
import { useApp } from '../state/AppContext.jsx'

const STATUS_LABEL = {
  online: '在线',
  warning: '警告',
  offline: '离线',
}
const STATUS_DOT = {
  online: 'bg-success',
  warning: 'bg-warning',
  offline: 'bg-danger',
}

export default function TopStatusBar() {
  const { robotStatus, controlState, teleopMode, inputSource, userName, isLoggedIn, multipleDevicesConnected } = useApp()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative flex items-center gap-4 px-4 py-2 bg-[#010409] border-b border-border shrink-0">
      {controlState === 'controlling' && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-warning/20 text-warning">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse-dot" />
          <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            控制中 {inputSource === 'exoskeleton' ? '外骨骼' : 'VR'}
            {teleopMode === 'easing' ? ' · 缓动' : teleopMode === 'follow' ? ' · 随动' : ''}
          </span>
        </div>
      )}
      {multipleDevicesConnected && inputSource === null && (
        <div className="flex items-center gap-1.5 text-warning text-xs">
          <TriangleAlert size={12} />
          检测到多个手柄设备，请选择输入源
        </div>
      )}
      <div className="flex-1" />
      <div
        className="relative flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi size={14} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{robotStatus.ping}ms</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Battery size={14} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{robotStatus.battery}%</span>
        </div>
        <div className="flex items-center gap-1">
          {Object.entries(robotStatus.deviceStatus).map(([k, v]) => (
            <div key={k} className={`w-2 h-2 rounded-full ${STATUS_DOT[v] || 'bg-muted'}`} title={`${k} · ${STATUS_LABEL[v] || v}`} />
          ))}
        </div>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {isLoggedIn && userName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-3">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
            {userName[0]?.toUpperCase() || 'U'}
          </div>
          <span>{userName}</span>
        </div>
      )}

      {open && (
        <div className="absolute top-full right-4 mt-1 w-72 bg-popover border border-border rounded-lg shadow-2xl p-4 z-50">
          <h4 className="text-sm text-foreground mb-3">设备连接详情</h4>
          <div className="space-y-2 text-xs">
            <Row k="机器人 IP" v={robotStatus.ip} />
            <Row k="心跳延迟" v={`${robotStatus.ping} ms`} />
            <Row k="电量" v={`${robotStatus.battery}%`} />
            <div className="border-t border-border pt-2 mt-2 space-y-1.5">
              {Object.entries(robotStatus.deviceStatus).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-muted-foreground capitalize">{k}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[v] || 'bg-muted'}`} />
                    <span className={v === 'online' ? 'text-success' : v === 'warning' ? 'text-warning' : 'text-danger'}>
                      {STATUS_LABEL[v] || v}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{k}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
    </div>
  )
}
