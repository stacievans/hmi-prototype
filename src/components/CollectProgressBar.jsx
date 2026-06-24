import { useMemo } from 'react'

/** 采集进度条：已落盘段按质检状态着色（与列表徽章一致） */
export const COLLECT_QC_COLORS = {
  passed: '#3fb950',
  failed: '#f85149',
  warning: '#d29922',
  pending: '#6e7681',
}

export const COLLECT_QC_LABELS = {
  passed: '合格',
  failed: '异常',
  warning: '警告',
  pending: '待检',
}

const COLLECT_QC_ORDER = ['passed', 'failed', 'warning', 'pending']

/** 未落盘轨道：比质检「待检」段更暗，避免混淆 */
export const UNCOLLECTED_TRACK_COLOR = '#161b22'

export function computeCollectProgress(task) {
  const total = Math.max(0, task.totalItems ?? 0)
  const collectedCount = Math.max(0, task.completedItems ?? 0)
  const collectedItems = (task.items ?? []).filter((it) => it.collectStatus === 'done')

  const byQuality = { passed: 0, failed: 0, warning: 0, pending: 0 }
  for (const it of collectedItems) {
    const q = it.qualityStatus ?? 'pending'
    if (Object.prototype.hasOwnProperty.call(byQuality, q)) byQuality[q] += 1
  }

  const qcTotal = collectedItems.length
  const segments = COLLECT_QC_ORDER
    .map((key) => ({
      key,
      label: COLLECT_QC_LABELS[key],
      count: byQuality[key],
      color: COLLECT_QC_COLORS[key],
    }))
    .filter((seg) => seg.count > 0)
    .map((seg) => ({
      ...seg,
      widthPct: qcTotal > 0 ? (seg.count / qcTotal) * 100 : 0,
    }))

  const collectedPct = total > 0 ? Math.min(100, (collectedCount / total) * 100) : 0

  return {
    total,
    collectedCount,
    collectedPct,
    segments,
    showLegend: collectedCount > 0 && segments.length > 0,
  }
}

function ProgressTrack({ progress, className = 'h-1.5' }) {
  return (
    <div
      className={`w-full ${className} rounded-full overflow-hidden flex`}
      style={{ backgroundColor: UNCOLLECTED_TRACK_COLOR }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.collectedCount}
      aria-label={`已落盘 ${progress.collectedCount}，共 ${progress.total}`}
    >
      {progress.collectedPct > 0 && (
        <div
          className="h-full flex shrink-0 min-w-0 transition-all duration-300"
          style={{ width: `${progress.collectedPct}%` }}
        >
          {progress.segments.length > 0 ? (
            progress.segments.map((seg, index) => (
              <div
                key={seg.key}
                className={`h-full shrink-0 transition-all duration-300 ${
                  index < progress.segments.length - 1 ? 'border-r border-background/40' : ''
                }`}
                style={{
                  width: `${seg.widthPct}%`,
                  backgroundColor: seg.color,
                }}
                title={`${seg.label} ${seg.count}`}
              />
            ))
          ) : (
            <div
              className="h-full w-full"
              style={{ backgroundColor: COLLECT_QC_COLORS.pending }}
              title="已落盘"
            />
          )}
        </div>
      )}
    </div>
  )
}

function CollectProgressLegendItem({ color, label, count, compact = false }) {
  if (compact) {
    return (
      <span style={{ color }} className="tabular-nums">
        {label}{count}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <span
        className="w-2 h-2 rounded-sm shrink-0 border border-border/40"
        style={{ backgroundColor: color }}
      />
      <span>
        {label} {count}
      </span>
    </span>
  )
}

function InlineLegend({ segments }) {
  return (
    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap hidden sm:inline tabular-nums">
      {segments.map((seg, index) => (
        <span key={seg.key}>
          {index > 0 && <span className="text-border mx-0.5">·</span>}
          <CollectProgressLegendItem color={seg.color} label={seg.label} count={seg.count} compact />
        </span>
      ))}
    </span>
  )
}

/** TaskDetailPage：进度条 + 下方图例 + 右侧计数 */
export function CollectProgressBar({ task }) {
  const progress = useMemo(() => computeCollectProgress(task), [task])

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <ProgressTrack progress={progress} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {progress.collectedCount}/{progress.total}
        </span>
      </div>

      {progress.showLegend && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {progress.segments.map((seg, index) => (
            <span key={seg.key} className="inline-flex items-center">
              {index > 0 && <span className="mr-3 text-border select-none" aria-hidden="true">·</span>}
              <CollectProgressLegendItem color={seg.color} label={seg.label} count={seg.count} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** WorkstationPage 顶栏：单行 采集进度 [09/20] [条] [合格2·异常3] */
export function CollectProgressInline({ task, showLabel = false }) {
  const progress = useMemo(() => computeCollectProgress(task), [task])

  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      {showLabel && (
        <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap font-medium">
          采集进度
        </span>
      )}
      <span
        className="text-[11px] text-muted-foreground shrink-0 tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {String(progress.collectedCount).padStart(2, '0')}/{progress.total}
      </span>
      <div className="flex-1 min-w-[72px]">
        <ProgressTrack progress={progress} className="h-1.5" />
      </div>
      {progress.showLegend && <InlineLegend segments={progress.segments} />}
    </div>
  )
}
