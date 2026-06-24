import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import { Power, Hand, Glasses, Circle, TriangleAlert, Cpu, Battery, Wifi, HardDrive, ChevronRight } from 'lucide-react'

const dotColor = (s) =>
  s === 'running' ? 'bg-success' :
  s === 'starting' ? 'bg-warning animate-pulse-dot' :
  'bg-muted-foreground/40'

export default function DevicesPage() {
  const { robotStatus, inputSource, connectedDevices, subSystems, storage, toggleSubSystem } = useApp()
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full min-w-0">
      <BlockPanel icon={<Cpu size={18} className="text-primary" />} title="机器人本体">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card icon={<Wifi size={14} className="text-primary" />} label="IP 地址" value={robotStatus.ip} mono />
          <Card icon={<Battery size={14} className="text-primary" />} label="电量" value={`${robotStatus.battery}%`} mono />
          <Card icon={<Circle size={14} className="text-success fill-success" />} label="心跳" value={`${robotStatus.ping} ms`} mono />
        </div>

        <StorageSection storage={storage} />

        <div>
          <ModuleHeader
            icon={<Power size={16} className="text-primary" />}
            title="子系统启停"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subSystems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-md bg-card border border-border card-depth min-w-0"
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
        </div>
      </BlockPanel>

      <BlockPanel icon={<Hand size={18} className="text-primary" />} title="遥操设备">
        {inputSource && (
          <div className="text-xs text-muted-foreground -mt-2">
            当前选择: <span className="text-primary">{inputSource === 'exoskeleton' ? '外骨骼' : 'VR'}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
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
      </BlockPanel>

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
                className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] text-sm font-medium border border-border"
              >
                取消
              </button>
              <button
                onClick={confirmStart}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] text-sm font-medium"
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

function BlockPanel({ icon, title, children }) {
  return (
    <section className="w-full rounded-md border border-border bg-card/50 card-depth p-5">
      <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-border/60">
        {icon}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

function ModuleHeader({ icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  )
}

function StorageSection({ storage }) {
  const nav = useNavigate()
  const { usagePct } = storage

  const level = usagePct >= 90 ? 'critical' : usagePct >= 80 ? 'warning' : 'normal'
  const isAlert = level !== 'normal'
  const iconClass = level === 'critical' ? 'text-destructive' : level === 'warning' ? 'text-warning' : 'text-primary'

  return (
    <div>
      <ModuleHeader
        icon={<HardDrive size={16} className={iconClass} />}
        title="存储空间"
        action={isAlert ? (
          <button
            type="button"
            onClick={() => nav('/anomaly')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors active:scale-[0.98] shrink-0 ${
              level === 'critical'
                ? 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25'
                : 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25'
            }`}
          >
            前往清理
            <ChevronRight size={14} />
          </button>
        ) : null}
      />
      <StorageCard storage={storage} level={level} />
    </div>
  )
}

function PowerButton({ status, onClick }) {
  // Three distinct states with solid color treatment + tactile feedback
  if (status === 'starting') {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-warning/15 text-warning border border-warning/30 text-xs font-medium cursor-wait"
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
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors active:scale-[0.98] text-xs font-medium shadow-sm"
      >
        <Power size={13} strokeWidth={2.5} />
        停止
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-success text-white hover:bg-success/90 transition-colors active:scale-[0.98] text-xs font-medium shadow-sm"
    >
      <Power size={13} strokeWidth={2.5} />
      启动
    </button>
  )
}

function Card({ icon, label, value, mono = false, valueClassName = '' }) {
  return (
    <div className="p-3.5 rounded-md bg-card border border-border card-depth">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={`text-base ${valueClassName}`}
        style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}
      >
        {value}
      </div>
    </div>
  )
}

function formatStorageSize(gb) {
  if (!Number.isFinite(gb) || gb <= 0) return '0 GB'
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  return `${(gb * 1024).toFixed(0)} MB`
}

function storageSegmentPct(partGB, totalGB) {
  if (totalGB <= 0 || partGB <= 0) return 0
  return Math.min(100, (partGB / totalGB) * 100)
}

const STORAGE_SEGMENT_COLORS = {
  base: '#6e7681',
  processing: '#58a6ff',
  anomaly: '#f0883e',
  free: '#21262d',
}

function StorageLegendItem({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span
        className="w-2.5 h-2.5 rounded-sm shrink-0 border border-border/40"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function StorageCard({ storage, level }) {
  const { totalGB, baseGB, processingGB, anomalyGB, freeGB, usagePct } = storage

  const basePct = storageSegmentPct(baseGB, totalGB)
  const processingPct = storageSegmentPct(processingGB, totalGB)
  const anomalyPct = storageSegmentPct(anomalyGB, totalGB)

  const alertText = level === 'critical'
    ? '存储空间严重不足，请立即清理异常数据'
    : level === 'warning'
      ? '存储空间紧张，建议及时清理异常数据'
      : null

  const borderClass = level === 'critical'
    ? 'border-destructive/30'
    : level === 'warning'
      ? 'border-warning/30'
      : 'border-border'

  return (
    <div className={`p-4 rounded-md bg-card border card-depth w-full ${borderClass}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-xs">
        <StorageMetric label="总容量" value={`${totalGB.toFixed(0)} GB`} />
        <StorageMetric label="已用容量" value={`${(baseGB + processingGB + anomalyGB).toFixed(2)} GB`} />
        <StorageMetric label="剩余容量" value={`${freeGB.toFixed(2)} GB`} />
        <StorageMetric
          label="使用率"
          value={`${usagePct.toFixed(0)}%`}
          valueClass={level === 'critical' ? 'text-destructive' : level === 'warning' ? 'text-warning' : 'text-primary'}
        />
      </div>

      <div
        className="w-full h-2.5 rounded-full bg-secondary overflow-hidden mb-2 flex"
        role="img"
        aria-label={`存储占用：系统 ${formatStorageSize(baseGB)}，处理中 ${formatStorageSize(processingGB)}，异常 ${formatStorageSize(anomalyGB)}，剩余 ${formatStorageSize(freeGB)}`}
      >
        {basePct > 0 && (
          <div
            className="h-full shrink-0 transition-all duration-300 border-r border-background/30"
            style={{ width: `${basePct}%`, backgroundColor: STORAGE_SEGMENT_COLORS.base }}
            title={`系统占用 ${formatStorageSize(baseGB)}`}
          />
        )}
        {processingPct > 0 && (
          <div
            className="h-full shrink-0 transition-all duration-300 border-r border-background/30"
            style={{ width: `${processingPct}%`, backgroundColor: STORAGE_SEGMENT_COLORS.processing }}
            title={`处理中数据 ${formatStorageSize(processingGB)}`}
          />
        )}
        {anomalyPct > 0 && (
          <div
            className="h-full shrink-0 transition-all duration-300"
            style={{ width: `${anomalyPct}%`, backgroundColor: STORAGE_SEGMENT_COLORS.anomaly }}
            title={`异常数据 ${formatStorageSize(anomalyGB)}`}
          />
        )}
      </div>

      <div
        className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs mb-2"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <StorageLegendItem color={STORAGE_SEGMENT_COLORS.base} label={`系统占用 ${formatStorageSize(baseGB)}`} />
        <StorageLegendItem color={STORAGE_SEGMENT_COLORS.processing} label={`处理中数据 ${formatStorageSize(processingGB)}`} />
        <StorageLegendItem color={STORAGE_SEGMENT_COLORS.anomaly} label={`异常数据 ${formatStorageSize(anomalyGB)}`} />
        <StorageLegendItem color={STORAGE_SEGMENT_COLORS.free} label={`剩余 ${formatStorageSize(freeGB)}`} />
      </div>

      {alertText && (
        <p className={`text-xs flex items-center gap-1.5 ${level === 'critical' ? 'text-destructive' : 'text-warning'}`}>
          <TriangleAlert size={12} className="shrink-0" />
          {alertText}
        </p>
      )}
    </div>
  )
}

function StorageMetric({ label, value, valueClass = 'text-foreground' }) {
  return (
    <div>
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-medium ${valueClass}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
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
