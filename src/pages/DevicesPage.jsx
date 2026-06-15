import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import { Power, Hand, Glasses, Circle, TriangleAlert, Cpu, Battery, Wifi } from 'lucide-react'

const dotColor = (s) =>
  s === 'running' ? 'bg-success' :
  s === 'starting' ? 'bg-warning animate-pulse-dot' :
  'bg-muted-foreground/40'

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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} className="text-primary" />
          <h2>机器人本体</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card icon={<Wifi size={14} className="text-primary" />} label="IP 地址" value={robotStatus.ip} mono />
          <Card icon={<Battery size={14} className="text-primary" />} label="电量" value={`${robotStatus.battery}%`} mono />
          <Card icon={<Circle size={14} className="text-success fill-success" />} label="心跳" value={`${robotStatus.ping} ms`} mono />
        </div>

        <h3 className="mb-3 text-sm text-muted-foreground uppercase tracking-wider">子系统启停</h3>
        <div className="space-y-2">
          {subSystems.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3.5 rounded-md bg-card border border-border card-depth"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor(p.status)}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                    <span>心跳 <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.heartbeat}</span></span>
                    <span>错误码 <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.errorCode}</span></span>
                  </div>
                </div>
              </div>
              <PowerButton
                status={p.status}
                onClick={() => handleClick(p.id)}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3">遥操设备</h2>
        {inputSource && (
          <div className="mb-3 text-xs text-muted-foreground">
            当前选择: <span className="text-primary">{inputSource === 'exoskeleton' ? '外骨骼' : 'VR'}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <DeviceCard
            Icon={Hand}
            name="外骨骼"
            model="EXO-PRO v3"
            connected={connectedDevices.exoskeleton}
          />
          <DeviceCard
            Icon={Glasses}
            name="VR 头显"
            model="Quest Pro"
            connected={connectedDevices.vr}
          />
        </div>
      </section>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <div className="flex items-center gap-2.5 mb-3 text-warning">
              <div className="w-9 h-9 rounded-md bg-warning/15 flex items-center justify-center">
                <TriangleAlert size={18} />
              </div>
              <h3>底盘启动确认</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              请确认旋钮已调至自动模式并断开充电线，然后再启动底盘。
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setConfirmId(null)}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] text-sm font-medium border border-border"
              >
                取消
              </button>
              <button
                onClick={confirmStart}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] text-sm font-medium"
              >
                确认启动
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PowerButton({ status, onClick }) {
  // Three distinct states with solid color treatment + tactile feedback
  if (status === 'starting') {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-warning/15 text-warning border border-warning/30 text-xs font-medium cursor-wait"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot" />
        启动中…
      </button>
    )
  }
  if (status === 'running') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors active:scale-[0.98] text-xs font-medium shadow-sm"
      >
        <Power size={13} strokeWidth={2.5} />
        停止
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-success text-white hover:bg-success/90 transition-colors active:scale-[0.98] text-xs font-medium shadow-sm"
    >
      <Power size={13} strokeWidth={2.5} />
      启动
    </button>
  )
}

function Card({ icon, label, value, mono = false }) {
  return (
    <div className="p-3.5 rounded-md bg-card border border-border card-depth">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-base" style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}>{value}</div>
    </div>
  )
}

function DeviceCard({ Icon, name, model, connected }) {
  return (
    <div
      className={`p-4 rounded-md border card-depth transition-colors ${
        connected ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            connected ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm">{name}</h4>
        </div>
        {connected && (
          <span className="text-[10px] text-primary bg-primary/15 px-2 py-0.5 rounded-full font-medium">
            已连接
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>型号</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{model}</span>
        </div>
        <div className="flex justify-between">
          <span>状态</span>
          <span className={connected ? 'text-success' : ''}>{connected ? '在线' : '未连接'}</span>
        </div>
      </div>
    </div>
  )
}
