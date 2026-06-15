import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useApp } from '../../state/AppContext.jsx'
import GripperCurveChart from './GripperCurveChart.jsx'

const WINDOW_MS = 10_000

/**
 * Bottom dock for gripper + force curves.  Renders a draggable time scrubber
 * (fixed 10s visible window) so the user can scrub back through the recorded
 * buffer.  While idle, the panel shows live data; while recording / replaying
 * it shows whatever is currently in the buffer.
 */
export default function GripperTimeDock() {
  const {
    history,
    paused,
    setPaused,
    recordingState,
    recordingBufferSize,
  } = useApp()

  // Scrub position in seconds, relative to "now" (0 = live, positive = back in time)
  const [scrubSec, setScrubSec] = useState(0)
  const trackRef = useRef(null)
  const draggingRef = useRef(false)

  // Poll the buffer size (recording mutates a ref, not state, to keep
  // the 30Hz tick cheap).  We sample at 4 Hz which is plenty for a scrubber.
  const [bufferSize, setBufferSize] = useState(() =>
    typeof recordingBufferSize === 'function' ? recordingBufferSize() : 0,
  )
  useEffect(() => {
    if (recordingState === 'replaying') return
    const t = setInterval(() => {
      const n = typeof recordingBufferSize === 'function' ? recordingBufferSize() : 0
      setBufferSize((prev) => (prev === n ? prev : n))
    }, 250)
    return () => clearInterval(t)
  }, [recordingState, recordingBufferSize])
  const totalBufferSec = bufferSize > 1 ? (bufferSize - 1) / 30 : 0
  const maxScrubSec = Math.max(0, totalBufferSec - WINDOW_MS / 1000)
  const clampedScrub = Math.min(Math.max(0, scrubSec), maxScrubSec)

  // Visible window t-range in ms (relative to last live sample t)
  const lastT = history.length > 0 ? history[history.length - 1].t : 0
  const tStart = lastT - WINDOW_MS - clampedScrub * 1000
  const tEnd = lastT - clampedScrub * 1000
  const visibleHistory = history.filter((h) => h.t >= tStart - 50 && h.t <= tEnd + 50)

  // Clamp scrub when buffer shrinks
  useEffect(() => {
    if (scrubSec > maxScrubSec) setScrubSec(maxScrubSec)
  }, [maxScrubSec, scrubSec])

  // Mouse drag on the track
  const onPointerDown = (e) => {
    if (maxScrubSec === 0) return
    draggingRef.current = true
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    updateFromPointer(e)
  }
  const onPointerMove = (e) => {
    if (!draggingRef.current) return
    updateFromPointer(e)
  }
  const onPointerUp = (e) => {
    draggingRef.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }
  const updateFromPointer = (e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const frac = rect.width === 0 ? 0 : x / rect.width
    setScrubSec(frac * maxScrubSec)
  }

  return (
    <div className="rounded-md border border-border bg-card card-depth overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">夹爪 · 左/右末端</span>
          <span className="text-[10px] text-muted-foreground/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            open [0, 1] · force [N]
          </span>
          {recordingState === 'recording' && (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-dot" />
              实时采集
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium"
            title={paused ? '继续' : '暂停'}
          >
            {paused ? <Play size={11} /> : <Pause size={11} />}
            {paused ? '继续' : '冻结'}
          </button>
          <button
            onClick={() => setScrubSec(0)}
            disabled={maxScrubSec === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            title="回到最新"
          >
            <RotateCcw size={11} />
            回到最新
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-1">
        <GripperCurveChart history={visibleHistory} height={130} windowMs={WINDOW_MS} />
      </div>

      {/* Scrubber */}
      <div className="px-3 pb-2 pt-1">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span>-{maxScrubSec.toFixed(1)}s</span>
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`flex-1 h-5 relative select-none touch-none ${maxScrubSec === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-secondary" />
            {/* Window indicator (10s) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary/50"
              style={{
                left: `${maxScrubSec === 0 ? 0 : (clampedScrub / maxScrubSec) * 100}%`,
                right: '0%',
              }}
            />
            {/* Tick marks every 1s */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none">
              {Array.from({ length: 11 }, (_, i) => (
                <div key={i} className="w-px h-1.5 bg-border" />
              ))}
            </div>
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm"
              style={{ left: `calc(${maxScrubSec === 0 ? 0 : (clampedScrub / maxScrubSec) * 100}% - 6px)` }}
            />
          </div>
          <span>0s</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
          <span>固定窗口 10s · 拖动时间轴回看历史</span>
          <span className="text-muted-foreground/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {clampedScrub > 0 ? `回看 -${clampedScrub.toFixed(1)}s` : '实时'}
          </span>
        </div>
      </div>
    </div>
  )
}
