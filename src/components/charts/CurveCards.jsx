import { useApp } from '../../state/AppContext.jsx'
import LineChart from './LineChart.jsx'

const card = 'rounded-xl border border-border bg-card overflow-hidden'
const headerCls = 'flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30'
const titleCls = 'text-xs text-muted-foreground uppercase tracking-wider'

function ChartHeader({ title, unit, latest, accessor, extra }) {
  return (
    <div className={headerCls}>
      <div className="flex items-center gap-2">
        <span className={titleCls}>{title}</span>
        {unit && <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>unit: {unit}</span>}
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        {extra}
        {latest && accessor && (
          <span className="text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {accessor(latest)}
          </span>
        )}
      </div>
    </div>
  )
}

export function JointAnglesChart({ compact = false }) {
  const { history, JOINT_KEYS, liveData } = useApp()
  return (
    <div className={card}>
      <ChartHeader
        title="外骨骼 · 关节角 (deg)"
        latest={liveData?.joints}
        accessor={(j) => {
          if (!j) return '—'
          const l = j.l_elbow ?? 0
          const r = j.r_elbow ?? 0
          return `L.elbow ${l.toFixed(1)}° · R.elbow ${r.toFixed(1)}°`
        }}
        extra={
          <Legend keys={JOINT_KEYS} />
        }
      />
      <div className="px-2 pb-1">
        <LineChart
          series={JOINT_KEYS}
          history={history}
          accessor={(s, k) => s.joints?.[k] ?? 0}
          height={compact ? 90 : 140}
        />
      </div>
    </div>
  )
}

export function SixDForceChart({ compact = false }) {
  const { history, FORCE_KEYS, liveData } = useApp()
  return (
    <div className={card}>
      <ChartHeader
        title="机械臂 · 末端六维力 / 力矩"
        latest={liveData?.force}
        accessor={(f) => {
          if (!f) return '—'
          return `Fz ${(f.fz ?? 0).toFixed(1)} N · Tz ${(f.tz ?? 0).toFixed(2)} N·m`
        }}
        extra={<Legend keys={FORCE_KEYS} />}
      />
      <div className="px-2 pb-1">
        <LineChart
          series={FORCE_KEYS}
          history={history}
          accessor={(s, k) => s.force?.[k] ?? 0}
          height={compact ? 90 : 140}
        />
      </div>
    </div>
  )
}

export function GripperChart({ compact = false }) {
  const { history, GRIPPER_KEYS, liveData } = useApp()
  return (
    <div className={card}>
      <ChartHeader
        title="夹爪 · 行程 & 力值"
        latest={liveData?.gripper}
        accessor={(g) => {
          if (!g) return '—'
          return `${(g.stroke ?? 0).toFixed(1)} mm · ${(g.force ?? 0).toFixed(1)} N`
        }}
        extra={<Legend keys={GRIPPER_KEYS} />}
      />
      <div className="px-2 pb-1">
        <LineChart
          series={GRIPPER_KEYS}
          history={history}
          accessor={(s, k) => s.gripper?.[k] ?? 0}
          height={compact ? 90 : 140}
        />
      </div>
    </div>
  )
}

function Legend({ keys }) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      {keys.map((k) => (
        <span key={k.key} className="flex items-center gap-1 text-muted-foreground">
          <span className="w-2 h-0.5" style={{ background: k.color }} />
          <span>{k.label}{k.unit ? <span className="opacity-50">/{k.unit}</span> : null}</span>
        </span>
      ))}
    </div>
  )
}
