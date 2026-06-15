import { useState } from 'react'
import { Cable, Check, Circle, Wifi, RefreshCw, Server, ShieldCheck, Bot } from 'lucide-react'
import { useApp } from '../state/AppContext.jsx'

export default function ConnectPage() {
  const { robotStatus, setRobotStatus, connectedDevices, setConnectedDevices } = useApp()
  const [ip, setIp] = useState(robotStatus.ip)
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState(null)

  const testConnection = () => {
    setPinging(true)
    setPingResult(null)
    setTimeout(() => {
      const ms = Math.floor(Math.random() * 25) + 8
      setPingResult({ ms, ok: true })
      setRobotStatus({ ...robotStatus, ip, ping: ms })
      setPinging(false)
    }, 1200)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <Cable size={22} className="text-primary" />
            设备连接
          </h1>
          <p className="text-sm text-muted-foreground mt-1">配置机器人与外设的连接参数，测试链路质量后开启控制会话</p>
        </header>

        {/* Robot Card */}
        <section className="rounded-xl bg-card border border-border">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Bot size={16} className="text-primary" />
            <h2 className="text-sm font-medium">机器人本体</h2>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Robot</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="IP 地址">
              <div className="flex gap-2">
                <input
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md bg-[#0d1117] border border-border text-foreground text-sm font-mono"
                />
                <button
                  onClick={testConnection}
                  disabled={pinging}
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw size={14} className={pinging ? 'animate-spin' : ''} />
                  测试
                </button>
              </div>
            </Field>
            <Field label="电量">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#0d1117] border border-border text-sm font-mono">
                <span className="text-foreground">{robotStatus.battery}%</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-success" style={{ width: `${robotStatus.battery}%` }} />
                </div>
              </div>
            </Field>
            <Field label="心跳延迟">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#0d1117] border border-border text-sm font-mono">
                <Wifi size={14} className="text-muted-foreground" />
                <span className="text-foreground">{robotStatus.ping} ms</span>
                {pingResult && (
                  <span className="ml-auto text-xs text-success flex items-center gap-1">
                    <Check size={12} /> {pingResult.ms} ms
                  </span>
                )}
              </div>
            </Field>
            <Field label="帧率">
              <div className="px-3 py-2 rounded-md bg-[#0d1117] border border-border text-sm font-mono text-foreground">
                {robotStatus.frameRate} Hz
              </div>
            </Field>
          </div>
        </section>

        {/* Sub-systems Card */}
        <section className="rounded-xl bg-card border border-border">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Server size={16} className="text-primary" />
            <h2 className="text-sm font-medium">子系统启停</h2>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Subsystems</span>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(robotStatus.deviceStatus).map(([k, v]) => (
              <div key={k} className="px-5 py-3 flex items-center gap-3">
                <Circle size={10} className={
                  v === 'online' ? 'fill-success text-success' :
                  v === 'warning' ? 'fill-warning text-warning' : 'fill-danger text-danger'
                } />
                <span className="text-sm capitalize text-foreground">{k}</span>
                <span className="text-xs text-muted-foreground">
                  {v === 'online' ? '在线' : v === 'warning' ? '警告' : '离线'}
                </span>
                <div className="flex-1" />
                <button
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${
                    v === 'offline' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {v === 'offline' ? '启动' : '停止'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Peripherals Card */}
        <section className="rounded-xl bg-card border border-border">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            <h2 className="text-sm font-medium">遥操设备</h2>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Peripherals</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <PeripheralCard
              label="外骨骼"
              model="EXO-PRO v3"
              connected={connectedDevices.exoskeleton}
              onToggle={() => setConnectedDevices({ ...connectedDevices, exoskeleton: !connectedDevices.exoskeleton })}
            />
            <PeripheralCard
              label="VR 头显"
              model="Quest Pro"
              connected={connectedDevices.vr}
              onToggle={() => setConnectedDevices({ ...connectedDevices, vr: !connectedDevices.vr })}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function PeripheralCard({ label, model, connected, onToggle }) {
  return (
    <div className={`rounded-lg p-4 border transition-all ${
      connected ? 'bg-primary/10 border-primary/40' : 'bg-[#0d1117] border-border'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Circle size={8} className={connected ? 'fill-success text-success' : 'fill-danger text-danger'} />
        <span className="text-sm font-medium text-foreground">{label}</span>
        {connected && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">已连接</span>}
      </div>
      <div className="text-xs text-muted-foreground mb-3">型号: {model}</div>
      <button
        onClick={onToggle}
        className={`w-full py-1.5 rounded-md text-xs transition-colors ${
          connected ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {connected ? '断开' : '连接'}
      </button>
    </div>
  )
}
