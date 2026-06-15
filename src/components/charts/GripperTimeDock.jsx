import { useEffect, useRef, useState } from 'react'
import { Circle, Pause, Play, RotateCcw, Snowflake } from 'lucide-react'
import { useApp } from '../../state/AppContext.jsx'
import GripperCurveChart from './GripperCurveChart.jsx'

const WINDOW_MS = 10_000

/**
 * Bottom dock for gripper + force curves.  Renders a draggable time scrubber
 * (fixed 10s visible window) so the user can scrub back through the recorded
 * buffer.
 *
 * Display phases:
 *   'hidden' — no recording yet → empty state ("等待开始采集")
 *   'live'   — currently recording → live data streaming
 *   'frozen' — recording stopped → chart is frozen on the last frame
 */
export default function GripperTimeDock() {
  const {
    history,
    paused,
    setPaused,
    recordingState,
    recordingBufferSize,
    recordingDisplayState,
  } = useApp()

  // Scrub position in seconds, relative to "now" (0 = live, positive = back in time)
  const [scrubSec, setScrubSec] = useState(0)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)

  // Poll the recording buffer size (recording mutates a ref, not state, to keep
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

  // Use the larger of (recording buffer time) and (live history time) so the
  // timeline always reflects the *actual* elapsed time, even when no recording
  // is in progress.  Right side of the scrubber shows this value in seconds.
  const recordingTime = bufferSize > 1 ? (bufferSize - 1) / 30 : 0
  const liveTime = history.length > 0 ? history[history.length - 1].t / 1000 : 0
  const totalBufferSec = Math.max(recordingTime, liveTime)

  const windowSec = WINDOW_MS / 1000
  const maxScrubSec = Math.max(0, totalBufferSec - windowSec)
  const clampedScrub = Math.min(Math.max(0, scrubSec), maxScrubSec)

  // Visible 10s window: left edge in absolute seconds.  Must be >= 0.
  const visibleLeft = Math.max(0, totalBufferSec - windowSec - clampedScrub)
  // Thumb position as a fraction of the full track (0..1).  When the buffer
  // is smaller than the window, the thumb pins to the rightmost valid edge.
  const thumbFrac = totalBufferSec > 0
    ? Math.max(0, Math.min(1, visibleLeft / totalBufferSec))
    : 0
  // Width of the visible 10s window as a fraction of the track.  When the
  // buffer is shorter than the window, this saturates at 1 (fills the track).
  const winFrac = totalBufferSec > 0
    ? Math.max(0, Math.min(1, windowSec / totalBufferSec))
    : 1

  // Time labels (always non-negative)
  const rightLabel = totalBufferSec.toFixed(1)
  const leftLabel = Math.max(0, totalBufferSec - windowSec).toFixed(1)

  // Tick marks every 1s, distributed across the full time scale
  const tickCount = Math.max(2, Math.floor(totalBufferSec) + 1)
  const tickDivs = Array.from({ length: tickCount }, (_, i) => (
    <div key={i} className="w-px h-1 bg-border" />
  ))

  // Visible window t-range in ms (relative to last live sample t)
  const lastT = history.length > 0 ? history[history.length - 1].t : 0
  const tStart = lastT - WINDOW_MS - clampedScrub * 1000
  const tEnd = lastT - clampedScrub * 1000
  const visibleHistory = history.filter((h) => h.t >= tStart - 50 && h.t <= tEnd + 50)

  // Clamp scrub when buffer shrinks
  useEffect(() => {
    if (scrubSec > maxScrubSec) setScrubSec(maxScrubSec)
  }, [maxScrubSec, scrubSec])

  // Convert a pointer X-coordinate to a new scrubSec value.  The track spans
  // the full [0, totalBufferSec] range, and clicking at frac f means
  // "the visible window's left edge should sit at f * totalBufferSec seconds".
  // The visible window is clamped to fit inside the buffer.
  const updateFromPointer = (e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const frac = rect.width === 0 ? 0 : x / rect.width
    const windowLeft = frac * totalBufferSec
    // scrubSec = totalBufferSec - windowSec - windowLeft
    //          = how far the window's right edge sits back from "now"
    const desiredScrub = totalBufferSec - windowSec - windowLeft
    setScrubSec(Math.max(0, Math.min(maxScrubSec, desiredScrub)))
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    setDragging(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    updateFromPointer(e)
  }
  const onPointerMove = (e) => {
    if (!dragging) return
    updateFromPointer(e)
  }
  const onPointerUp = (e) => {
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }
  const onPointerCancel = (e) => {
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  // 'hidden' phase: no recording yet — show a calm empty-state placeholder
  if (recordingDisplayState === 'hidden') {
    return (
      <div className="rounded-md border border-dashed border-border bg-card/40 flex flex-col items-center justify-center" style={{ minHeight: 220 }}>
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-2.5">
          <Circle size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">点击「开始采集」后显示实时数据曲线</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">结束采集后曲线会冻结在最后一帧</p>
      </div>
    )
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
          {recordingDisplayState === 'frozen' && (
            <span className="text-[10px] text-warning flex items-center gap-1">
              <Snowflake size={11} />
              已冻结
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

      {/* Scrubber
          Left label  = max(0, total − 10s)
          Right label = actual collection time (non-negative)
          Track is h-8 (32px) so it's easy to click.  Drag the thumb (or
          click anywhere on the track) to scrub. */}
      <div className="px-3 pb-2 pt-1">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span>{leftLabel}s</span>
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className={`flex-1 h-8 relative select-none touch-none cursor-pointer ${dragging ? 'cursor-grabbing' : ''}`}
          >
            {/* Inner vertical-center wrapper — holds the visual track,
                tick marks, and thumb.  All visual layers are centered
                inside the 32px click area. */}
            <div className="absolute inset-0 flex items-center pointer-events-none">
              <div className="w-full h-1 rounded-full bg-secondary relative">
                {/* Visible window indicator (10s wide) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary/50"
                  style={{
                    left: `${thumbFrac * 100}%`,
                    width: `${winFrac * 100}%`,
                  }}
                />
                {/* Tick marks every 1s */}
                <div className="absolute inset-0 flex items-center justify-between">
                  {tickDivs}
                </div>
                {/* Thumb (left edge of visible 10s window) */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm transition-transform ${dragging ? 'scale-125' : ''}`}
                  style={{ left: `calc(${thumbFrac * 100}% - 6px)` }}
                />
              </div>
            </div>
          </div>
          <span>{rightLabel}s</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
          <span>
            {recordingDisplayState === 'frozen'
              ? '已冻结 · 可拖动时间轴回看历史'
              : '固定窗口 10s · 拖动时间轴回看历史'}
          </span>
          <span className="text-muted-foreground/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {clampedScrub > 0 ? `回看: -${clampedScrub.toFixed(1)}s` : (recordingDisplayState === 'frozen' ? '冻结' : '实时')}
          </span>
        </div>
      </div>
    </div>
  )
}
