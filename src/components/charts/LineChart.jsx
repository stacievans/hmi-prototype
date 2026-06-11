import { useMemo } from 'react'

/**
 * Generic multi-series time-series line chart.
 * Pure SVG; no external chart library.
 *
 * Props
 *  - series: [{ key, label, color, unit }]
 *  - history: array of samples (each sample has `t` ms timestamp + the field keys)
 *  - accessor: (sample, key) => number
 *  - height: px height of the chart
 *  - yPadding: fraction of the data range to pad (default 0.15)
 *  - showAxis: show bottom time ticks
 *  - showGrid: show 4 horizontal grid lines
 *  - windowMs: time window in ms (used for axis label only, default 10000)
 */
export default function LineChart({
  series,
  history,
  accessor,
  height = 110,
  yPadding = 0.15,
  showAxis = true,
  showGrid = true,
  windowMs = 10_000,
  rightPad = 64,
}) {
  const W = 800 // viewBox width
  const H = height
  const padL = 8
  const padR = rightPad
  const padT = 6
  const padB = showAxis ? 14 : 6
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Pre-compute per-series min/max and paths
  const computed = useMemo(() => {
    if (history.length < 2) {
      return { paths: [], latest: [], range: [0, 1] }
    }
    const tMin = history[0].t
    const tMax = history[history.length - 1].t
    const tRange = Math.max(1, tMax - tMin)

    const out = series.map((s) => {
      const values = history.map((h) => accessor(h, s.key))
      let min = Math.min(...values)
      let max = Math.max(...values)
      if (max - min < 1e-3) {
        min -= 0.5
        max += 0.5
      }
      const span = max - min
      min -= span * yPadding
      max += span * yPadding
      const range = max - min

      let d = ''
      for (let i = 0; i < history.length; i++) {
        const h = history[i]
        const x = padL + ((h.t - tMin) / tRange) * chartW
        const v = accessor(h, s.key)
        const y = padT + chartH - ((v - min) / range) * chartH
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `
      }
      const lastV = accessor(history[history.length - 1], s.key)
      const lastY = padT + chartH - ((lastV - min) / range) * chartH
      const lastX = padL + chartW
      return { key: s.key, d, lastV, lastY, min, max, lastX, tMax }
    })
    return { paths: out, latest: out, tMin, tMax }
  }, [history, series, accessor, yPadding, chartW, chartH, padL, padT])

  if (history.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center text-muted-foreground/40 text-xs"
        style={{ height: H }}
      >
        等待数据 ...
      </div>
    )
  }

  // Y axis range for grid (use union of series)
  const unionMin = Math.min(...computed.latest.map((s) => s.min))
  const unionMax = Math.max(...computed.latest.map((s) => s.max))
  const gridSteps = 4
  const gridYs = Array.from({ length: gridSteps }, (_, i) => padT + (chartH * i) / (gridSteps - 1))
  // Re-evaluate y for grid value using union range
  const yForValue = (v) => padT + chartH - ((v - unionMin) / (unionMax - unionMin || 1)) * chartH

  // Time axis labels: 5 ticks (e.g. -10s, -7.5s, ..., 0s)
  const axisTicks = Array.from({ length: 5 }, (_, i) => i) // 0..4
  const tEnd = computed.latest[0]?.tMax ?? 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: H }}
    >
      {/* Grid */}
      {showGrid && gridYs.map((y, i) => (
        <line
          key={i}
          x1={padL}
          y1={y}
          x2={padL + chartW}
          y2={y}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}

      {/* Time axis */}
      {showAxis && axisTicks.map((i) => {
        const offset = (windowMs * i) / 4
        const x = padL + chartW - (offset / windowMs) * chartW
        const sec = (offset / 1000)
        return (
          <g key={i}>
            <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 3} stroke="rgba(255,255,255,0.15)" />
            <text
              x={x}
              y={padT + chartH + 12}
              fontSize="8"
              fill="rgba(255,255,255,0.35)"
              textAnchor="middle"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {sec === 0 ? '0s' : `-${sec.toFixed(1)}s`}
            </text>
          </g>
        )
      })}

      {/* Series lines */}
      {computed.paths.map((p, i) => (
        <path
          key={p.key}
          d={p.d}
          stroke={series[i].color}
          strokeWidth="1.2"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.9"
        />
      ))}

      {/* Latest value dots + labels */}
      {computed.latest.map((p, i) => (
        <g key={`dot-${p.key}`}>
          <circle cx={p.lastX - 1} cy={p.lastY} r="2" fill={series[i].color} />
          <text
            x={p.lastX + 4}
            y={p.lastY + 3}
            fontSize="9"
            fill={series[i].color}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {p.lastV.toFixed(1)}
          </text>
        </g>
      ))}
    </svg>
  )
}
