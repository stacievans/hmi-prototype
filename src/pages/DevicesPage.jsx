import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import { Power, TriangleAlert } from 'lucide-react'

const dotColor = (s) => s === 'running' ? 'bg-success' : s === 'starting' ? 'bg-warning animate-pulse-dot' : 'bg-danger'

export default function DevicesPage() {
  const { robotStatus, inputSource, connectedDevices, subSystems, toggleSubSystem } = useApp()
  const [confirmId, setConfirmId] = useState(null)

  const handleClick = (id) => {
    const it = subSystems.find((s) => s.id === id)
    if (it?.status === 'stopped' && id === 'chassis') {
      setConfirmId(id)
      return
    }
    toggleSubSystem(id)
  }

  const confirmStart = () => {
    if (confirmId) toggleSubSystem(confirmId)
    setConfirmId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <section>
        <h2 className="mb-4">机器人本体</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card label="IP 地址" value={robotStatus.ip} mono />
          <Card label="电量" value={`${robotStatus.battery}%`} mono />
        </div>
        <h3 className="mb-3">子系统启停</h3>
        <div className="space-y-2">
          {subSystems.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${dotColor(p.status)}`} />
                <div>
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    <span>心跳: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.heartbeat}</span></span>
                    <span>错误码: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.errorCode}</span></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleClick(p.id)}
                disabled={p.status === 'starting'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors
                  ${p.status === 'running' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' :
                    p.status === 'starting' ? 'bg-warning/20 text-warning cursor-wait' :
                    'bg-success/20 text-success hover:bg-success/30'}`}
              >
                <Power size={14} />
                {p.status === 'running' ? '停止' : p.status === 'starting' ? '启动中...' : '启动'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4">遥操设备</h2>
        {inputSource && (
          <div className="mb-3 text-xs text-muted-foreground">
            当前选择: <span className="text-primary">{inputSource === 'exoskeleton' ? '外骨骼' : 'VR'}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <DeviceCard emoji="🦾" name="外骨骼" model="EXO-PRO v3" connected={connectedDevices.exoskeleton} />
          <DeviceCard emoji="🥽" name="VR 头显" model="Quest Pro" connected={connectedDevices.vr} />
        </div>
      </section>

      {confirmId && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-3 text-warning">
              <TriangleAlert size={20} />
              <h3>底盘启动确认</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">请确认旋钮已调至自动模式并断开充电线，然后再启动底盘。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmId(null)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">取消</button>
              <button onClick={confirmStart} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">确认启动</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ label, value, mono = false }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}>{value}</div>
    </div>
  )
}

function DeviceCard({ emoji, name, model, connected }) {
  return (
    <div className={`p-4 rounded-xl border ${connected ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{emoji}</span>
        <h4>{name}</h4>
        {connected && <span className="text-xs text-primary bg-primary/20 px-2 py-0.5 rounded-full ml-auto">已连接</span>}
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>型号: {model}</div>
        <div>状态: {connected ? '在线' : '未连接'}</div>
      </div>
    </div>
  )
}
