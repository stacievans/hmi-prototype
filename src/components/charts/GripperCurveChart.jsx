import { useMemo } from 'react'

/**
 * Dual-axis line chart for gripper openness (left y axis, -1..1) and
 * gripper force (right y axis, 0..30 N).  Mirrors the styling of LineChart
 * but with two stacked series and a fixed open/close range on the left.
 *
 * Props
 *  - history: array of samples (each has `t` ms + `gripper.open` (or .stroke)
 *    + `gripper.force`)
 *  - height: chart height in px
 *  - windowMs: visible time window in ms
 */
export default function GripperCurveChart({
  history,
  height = 130,
  windowMs = 10_000,
}) {
  const W = 800
  const H = height
  const padL = 36
  const padR = 56
  const padT = 8
  const padB = 18
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const OPEN_MIN = 0
  const OPEN_MAX = 1
  const FORCE_MAX = 30

  const computed = useMemo(() => {
    if (history.length < 2) return { openPath: '', forcePath: '', openLast: 0, forceLast: 0, openLastX: 0, forceLastX: 0, openLastY: 0, forceLastY: 0 }
    const tMin = history[0].t
    const tMax = history[history.length - 1].t
    const tRange = Math.max(1, tMax - tMin)
    const openSpan = OPEN_MAX - OPEN_MIN

    let openD = ''
    let forceD = ''
    let openLastV = 0
    let forceLastV = 0
    let prevOpen = null
    let prevX = null

    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      const x = padL + ((h.t - tMin) / tRange) * chartW
      // openness normalised: prefer .open if present, else derive from stroke
      let openRaw = h.gripper?.open
      if (openRaw === undefined || openRaw === null) {
        // derive 0..1 from stroke (assume 20..80mm)
        const stroke = h.gripper?.stroke ?? 50
        openRaw = Math.max(0, Math.min(1, (stroke - 20) / 60))
      }
      const forceV = h.gripper?.force ?? 0
      const yOpen = padT + chartH - ((openRaw - OPEN_MIN) / openSpan) * chartH
      const yForce = padT + chartH - (forceV / FORCE_MAX) * chartH
      if (prevOpen === null) {
        openD += `M${x.toFixed(1)},${yOpen.toFixed(1)} `
      } else if (Math.abs(openRaw - prevOpen) > 1e-3) {
        // Step: horizontal at previous y, then vertical jump, then continue
        openD += `H${x.toFixed(1)} V${yOpen.toFixed(1)} `
      } else {
        openD += `L${x.toFixed(1)},${yOpen.toFixed(1)} `
      }
      forceD += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yForce.toFixed(1)} `
      openLastV = openRaw
      forceLastV = forceV
      prevOpen = openRaw
      prevX = x
    }
    const lastX = padL + chartW
    const openLastY = padT + chartH - ((openLastV - OPEN_MIN) / openSpan) * chartH
    const forceLastY = padT + chartH - (forceLastV / FORCE_MAX) * chartH
    return { openPath: openD, forcePath: forceD, openLastV, forceLastV, openLastX: lastX, forceLastX: lastX, openLastY, forceLastY }
  }, [history, chartW, chartH])

  if (history.length < 2) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground/40 text-xs" style={{ height: H }}>
        等待数据 ...
      </div>
    )
  }

  // Y axis: 5 ticks from 0 to 1 (left axis)
  const yTicks = Array.from({ length: 5 }, (_, i) => OPEN_MIN + ((OPEN_MAX - OPEN_MIN) * i) / 4)
  const yForOpen = (v) => padT + chartH - ((v - OPEN_MIN) / (OPEN_MAX - OPEN_MIN)) * chartH
  const yForForce = (v) => padT + chartH - (v / FORCE_MAX) * chartH

  // Time axis
  const axisTicks = Array.from({ length: 5 }, (_, i) => i)
  const secLabel = (i) => `${(-(windowMs * i) / 4 / 1000).toFixed(1)}s`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
      {/* Horizontal grid lines */}
      {yTicks.map((v, i) => {
        const y = yForOpen(v)
        return (
          <line key={i} x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        )
      })}

      {/* Y axis labels - left (openness 0..1) */}
      {yTicks.map((v, i) => {
        const y = yForOpen(v)
        return (
          <text
            key={`yl-${i}`}
            x={padL - 4}
            y={y + 3}
            fontSize="8"
            fill="rgba(255,255,255,0.35)"
            textAnchor="end"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {v.toFixed(1)}
          </text>
        )
      })}

      {/* Y axis labels - right (force 0..30N) */}
      {[0, 10, 20, 30].map((v, i) => {
        const y = yForForce(v)
        return (
          <text
            key={`yr-${i}`}
            x={padL + chartW + 4}
            y={y + 3}
            fontSize="8"
            fill="rgba(248,81,73,0.6)"
            textAnchor="start"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {v}
          </text>
        )
      })}

      {/* Time axis */}
      {axisTicks.map((i) => {
        const offset = (windowMs * i) / 4
        const x = padL + chartW - (offset / windowMs) * chartW
        return (
          <g key={`t-${i}`}>
            <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 3} stroke="rgba(255,255,255,0.15)" />
            <text
              x={x}
              y={padT + chartH + 12}
              fontSize="8"
              fill="rgba(255,255,255,0.35)"
              textAnchor="middle"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {i === 0 ? '0s' : secLabel(i)}
            </text>
          </g>
        )
      })}

      {/* Force line (red, scale 0..30) */}
      <path d={computed.forcePath} stroke="#f85149" strokeWidth="1.2" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />

      {/* Openness line (blue, scale -1..1) */}
      <path d={computed.openPath} stroke="#58a6ff" strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />

      {/* Latest dots + labels */}
      <g>
        <circle cx={computed.openLastX - 1} cy={computed.openLastY} r="2.4" fill="#58a6ff" />
        <text x={computed.openLastX + 4} y={computed.openLastY + 3} fontSize="9" fill="#58a6ff" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {computed.openLastV.toFixed(2)}
        </text>
      </g>
      <g>
        <circle cx={computed.forceLastX - 1} cy={computed.forceLastY} r="2.4" fill="#f85149" />
        <text x={computed.forceLastX + 4} y={computed.forceLastY + 3} fontSize="9" fill="#f85149" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {computed.forceLastV.toFixed(1)}N
        </text>
      </g>
    </svg>
  )
}
