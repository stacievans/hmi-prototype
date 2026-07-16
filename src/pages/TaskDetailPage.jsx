import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import { CollectProgressBar } from '../components/CollectProgressBar.jsx'
import { ArrowLeft, Archive, Send, Play, ArchiveRestore, LoaderCircle, MonitorPlay, ChevronLeft, ChevronRight, TriangleAlert, X, Info } from 'lucide-react'

const COMPRESS_OPTS = [
  { value: 'all', label: '全部压缩状态' },
  { value: 'pending', label: '待压缩' },
  { value: 'compressing', label: '压缩中' },
  { value: 'done', label: '已压缩' },
]
const UPLOAD_OPTS = [
  { value: 'all', label: '全部上传状态' },
  { value: 'pending', label: '待上传' },
  { value: 'uploading', label: '上传中' },
  { value: 'uploaded', label: '已上传' },
  { value: 'failed', label: '失败' },
]
const QUALITY_OPTS = [
  { value: 'all', label: '全部质检状态' },
  { value: 'passed', label: '合格' },
  { value: 'failed', label: '异常' },
  { value: 'warning', label: '警告' },
  { value: 'pending', label: '待检' },
]

const STATUS_BADGE = {
  collect: { pending: ['待采集','text-muted-foreground'], done: ['已采集','text-success'] },
  compress: { pending: ['待压缩','text-muted-foreground'], compressing: ['压缩中','text-warning'], done: ['已压缩','text-success'] },
  upload: { pending: ['待上传','text-muted-foreground'], uploading: ['上传中','text-primary'], uploaded: ['已上传','text-success'], failed: ['失败','text-destructive'] },
}

const QUALITY_BADGE = {
  passed: ['合格', 'bg-success/20 text-success'],
  failed: ['异常', 'bg-destructive/20 text-destructive'],
  warning: ['警告', 'bg-warning/20 text-warning'],
  pending: ['待检', 'bg-secondary text-muted-foreground'],
}

const CHIP_BASE = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'

/** 可点击质检标签：行内样式覆盖全局 button { background: none } */
const CHIP_BUTTON_LAYOUT = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: 1.25,
  gap: '4px',
  border: 'none',
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const QUALITY_CHIP_INLINE = {
  failed: {
    backgroundColor: 'rgba(248, 81, 73, 0.2)',
    color: '#f85149',
  },
  warning: {
    backgroundColor: 'rgba(210, 153, 34, 0.2)',
    color: '#d29922',
  },
}

const CHIP_BUTTON_HOVER = {
  failed: 'hover:brightness-110 hover:shadow-[inset_0_0_0_1px_rgba(248,81,73,0.45)]',
  warning: 'hover:brightness-110 hover:shadow-[inset_0_0_0_1px_rgba(210,153,34,0.45)]',
}

const OUTLINE_BTN =
  'flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] disabled:opacity-50 text-sm font-medium border border-border'

/** 采集主按钮：深蓝实心 + 悬停/按下反馈；内联样式覆盖全局 button reset，避免文字发糊 */
function CollectPrimaryButton({ onClick, disabled, children }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  let backgroundColor = '#1a4f8c'
  if (disabled) {
    backgroundColor = '#1a4f8c'
  } else if (pressed) {
    backgroundColor = '#0f3a6e'
  } else if (hovered) {
    backgroundColor = '#2563b8'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium border disabled:opacity-45 disabled:cursor-not-allowed transition-[box-shadow,border-color] duration-150"
      style={{
        backgroundColor,
        color: '#ffffff',
        borderColor: hovered && !disabled ? '#4d8fd9' : '#2a6cb8',
        boxShadow: disabled
          ? 'none'
          : pressed
            ? 'inset 0 1px 2px rgba(0, 0, 0, 0.35)'
            : hovered
              ? '0 2px 10px rgba(26, 79, 140, 0.55)'
              : '0 1px 3px rgba(0, 0, 0, 0.35)',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textShadow: 'none',
        transform: pressed && !disabled ? 'translateY(1px)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

/** 批量压缩/上传仅处理 passed、warning，排除 failed 与 pending */
function isBatchQualityEligible(item) {
  return item.qualityStatus === 'passed' || item.qualityStatus === 'warning'
}

function compressEligible(item) {
  return item.compressStatus === 'pending' && item.collectStatus === 'done' && isBatchQualityEligible(item)
}

function uploadEligible(item) {
  return item.compressStatus === 'done' && item.uploadStatus === 'pending' && isBatchQualityEligible(item)
}

/** 批量上传时因 failed / pending 被排除的条目数 */
function countUploadSkippedByQuality(items) {
  return items.filter(
    (it) => it.compressStatus === 'done' && it.uploadStatus === 'pending'
      && (it.qualityStatus === 'failed' || it.qualityStatus === 'pending'),
  ).length
}

function QualityBadge({ item, onInspect }) {
  const label = QUALITY_BADGE[item.qualityStatus]?.[0] ?? QUALITY_BADGE.pending[0]
  const clickable = item.qualityStatus === 'failed' || item.qualityStatus === 'warning'

  if (!clickable) {
    const chip = QUALITY_BADGE[item.qualityStatus]?.[1] ?? QUALITY_BADGE.pending[1]
    return (
      <span className={`${CHIP_BASE} ${chip}`}>
        {label}
      </span>
    )
  }

  const chipStyle = QUALITY_CHIP_INLINE[item.qualityStatus]

  return (
    <button
      type="button"
      onClick={() => onInspect(item)}
      className={`transition-all active:scale-[0.98] ${CHIP_BUTTON_HOVER[item.qualityStatus] ?? ''}`}
      style={{ ...CHIP_BUTTON_LAYOUT, ...chipStyle }}
      aria-label={`查看${label}详情`}
    >
      {label}
      <Info size={12} strokeWidth={2} className="shrink-0 opacity-50" aria-hidden="true" />
    </button>
  )
}

function DrawerField({ label, children }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  )
}

function QualityDetailDrawer({ item, onClose }) {
  if (!item) return null
  const cfg = QUALITY_BADGE[item.qualityStatus] || QUALITY_BADGE.pending
  const reasons = item.anomalyReasons ?? []

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-[22rem] max-w-[90vw] bg-card border-l border-border shadow-2xl flex flex-col card-depth"
        role="dialog"
        aria-labelledby="quality-drawer-title"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <h3 id="quality-drawer-title" className="text-sm font-medium">质检详情</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <DrawerField label="文件名">
            <span className="break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.fileName}</span>
          </DrawerField>
          <DrawerField label="质检状态">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg[1]}`}>{cfg[0]}</span>
          </DrawerField>
          <DrawerField label="异常类型">
            {item.anomalyType ?? '—'}
          </DrawerField>
          <DrawerField label="异常原因">
            {reasons.length > 0 ? (
              <ul className="space-y-2">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="text-muted-foreground shrink-0 tabular-nums">{i + 1}.</span>
                    <span className="break-words">{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DrawerField>
          <DrawerField label="本地存储地址">
            <span className="break-all text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {item.localPath || '—'}
            </span>
          </DrawerField>
        </div>
      </aside>
    </>
  )
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const { tasks, setTasks } = useApp()
  const task = tasks.find((t) => t.id === taskId)

  const [page, setPage] = useState(1)
  const [cFilter, setCFilter] = useState('all')
  const [uFilter, setUFilter] = useState('all')
  const [qFilter, setQFilter] = useState('all')
  const pageSize = 8

  const [progress, setProgress] = useState(null)   // { mode, idx, total, fileName, skippedUpload? }
  const [submitModal, setSubmitModal] = useState(false)
  const [confirmStart, setConfirmStart] = useState(false)
  const [toast, setToast] = useState(null)
  const [qualityDrawerItem, setQualityDrawerItem] = useState(null)

  // Drive the batch progress for compress / upload
  useEffect(() => {
    if (!progress || progress.idx >= progress.total) return
    const t = setTimeout(() => {
      setProgress((p) => p ? { ...p, idx: p.idx + 1 } : p)
      setTasks((all) => all.map((tk) => {
        if (tk.id !== taskId) return tk
        const targets = tk.items.filter((it) =>
          progress.mode === 'compressing' ? compressEligible(it) : uploadEligible(it))
        const current = targets[progress.idx]
        if (!current) return tk
        return {
          ...tk,
          items: tk.items.map((it) => it.id === current.id
            ? progress.mode === 'compressing'
              ? { ...it, compressStatus: 'done' }
              : { ...it, uploadStatus: 'uploaded' }
            : it),
        }
      }))
    }, 800)
    return () => clearTimeout(t)
  }, [progress, taskId, setTasks])

  useEffect(() => {
    if (progress && progress.idx >= progress.total) {
      const t = setTimeout(() => {
        if (progress.mode === 'uploading') {
          const skipped = progress.skippedUpload ?? 0
          flashToast(
            skipped > 0
              ? `已上传 ${progress.total} 条，${skipped} 条未上传（异常/待检）`
              : `已上传 ${progress.total} 条`,
          )
        }
        setProgress(null)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [progress])

  const flashToast = (msg) => {
    setToast({ msg, id: Date.now() })
    setTimeout(() => setToast(null), 2400)
  }

  const startCompress = () => {
    if (!task) return
    const list = task.items.filter(compressEligible)
    const skippedQuality = task.items.filter(
      (it) => it.compressStatus === 'pending' && it.collectStatus === 'done' && it.qualityStatus === 'failed',
    ).length
    if (list.length === 0) {
      flashToast(skippedQuality > 0 ? `没有可压缩的文件，${skippedQuality} 条因质检异常已跳过` : '没有需要压缩的文件')
      return
    }
    setProgress({ mode: 'compressing', idx: 0, total: list.length, fileName: list[0].fileName, skippedQuality })
  }

  const startUpload = () => {
    if (!task) return
    const list = task.items.filter(uploadEligible)
    const skippedUpload = countUploadSkippedByQuality(task.items)
    if (list.length === 0) {
      flashToast(skippedUpload > 0 ? '没有可上传的文件' : '没有需要上传的文件')
      return
    }
    setProgress({ mode: 'uploading', idx: 0, total: list.length, fileName: list[0].fileName, skippedUpload })
  }

  const startCollect = () => {
    setConfirmStart(false)
    nav(`/collection/workstation/${taskId}`)
  }

  const submitTask = () => {
    setSubmitModal(false)
    setTasks((all) => all.map((tk) => tk.id !== taskId ? tk : { ...tk, status: 'completed' }))
    flashToast('任务已提交至云平台')
  }

  const filtered = useMemo(() => {
    if (!task) return []
    return task.items
      .filter((it) => {
        if (cFilter !== 'all' && it.compressStatus !== cFilter) return false
        if (uFilter !== 'all' && it.uploadStatus !== uFilter) return false
        if (qFilter !== 'all' && it.qualityStatus !== qFilter) return false
        return true
      })
      .sort((a, b) => {
        const ia = a.index ?? 0
        const ib = b.index ?? 0
        if (ia !== ib) return ia - ib
        return (a.collectTime || '').localeCompare(b.collectTime || '')
      })
  }, [task, cFilter, uFilter, qFilter])

  useEffect(() => {
    setPage(1)
  }, [taskId, cFilter, uFilter, qFilter])

  if (!task) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">任务未找到</div>
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const list = filtered.slice((page - 1) * pageSize, page * pageSize)
  const canSubmit = task.items.length > 0 && task.completedItems === task.totalItems

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border shrink-0">
          <button
            onClick={() => nav('/collection')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-3 transition-colors"
          >
            <ArrowLeft size={16} />
            返回任务列表
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="truncate">{task.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  task.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                  task.status === 'completed' ? 'bg-success/20 text-success' :
                  'bg-warning/20 text-warning'
                }`}>
                  {task.status === 'in_progress' ? '进行中' : task.status === 'completed' ? '已完成' : '待执行'}
                </span>
              </div>
            </div>
            {task.status === 'in_progress' ? (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={startCompress} disabled={!!progress} className={OUTLINE_BTN}>
                  <Archive size={14} />
                  批量压缩
                </button>
                <button onClick={startUpload} disabled={!!progress} className={OUTLINE_BTN}>
                  <Send size={14} />
                  批量上传
                </button>
                <button onClick={() => setSubmitModal(true)} className={OUTLINE_BTN}>
                  <ArchiveRestore size={14} />
                  提交任务
                </button>
                <CollectPrimaryButton onClick={() => setConfirmStart(true)}>
                  <Play size={14} fill="currentColor" />
                  继续采集
                </CollectPrimaryButton>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={startCompress} disabled={!!progress} className={OUTLINE_BTN}>
                  <Archive size={14} />
                  批量压缩
                </button>
                <button onClick={startUpload} disabled={!!progress} className={OUTLINE_BTN}>
                  <Send size={14} />
                  批量上传
                </button>
                <button
                  onClick={() => nav(`/collection/workstation/${taskId}`)}
                  className={OUTLINE_BTN}
                >
                  <MonitorPlay size={14} />
                  打开工作站
                </button>
                <button
                  onClick={() => setSubmitModal(true)}
                  disabled={!canSubmit || task.status === 'completed'}
                  className={OUTLINE_BTN}
                >
                  <ArchiveRestore size={14} />
                  {task.status === 'completed' ? '已提交' : '提交任务'}
                </button>
                <CollectPrimaryButton
                  onClick={() => setConfirmStart(true)}
                  disabled={task.completedItems >= task.totalItems}
                >
                  <Play size={14} fill="currentColor" />
                  {task.completedItems > 0 ? '继续采集' : '开始采集'}
                </CollectPrimaryButton>
              </div>
            )}
          </div>
          <CollectProgressBar task={task} />
        </div>

        <div className="px-6 py-3 border-b border-border shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="text-muted-foreground mr-auto">
            共 {filtered.length} 条
          </span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>压缩:</span>
            <select
              value={cFilter}
              onChange={(e) => { setCFilter(e.target.value); setPage(1) }}
              className="bg-secondary border border-border text-foreground text-xs rounded px-2 py-1 focus:border-primary focus:outline-none"
            >
              {COMPRESS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>上传:</span>
            <select
              value={uFilter}
              onChange={(e) => { setUFilter(e.target.value); setPage(1) }}
              className="bg-secondary border border-border text-foreground text-xs rounded px-2 py-1 focus:border-primary focus:outline-none"
            >
              {UPLOAD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>质检:</span>
            <select
              value={qFilter}
              onChange={(e) => { setQFilter(e.target.value); setPage(1) }}
              className="bg-secondary border border-border text-foreground text-xs rounded px-2 py-1 focus:border-primary focus:outline-none"
            >
              {QUALITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {list.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              暂无文件
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-[48px] max-w-[48px] px-2 py-2.5 font-medium text-center">#</th>
                    <th className="text-center px-3 py-2.5 font-medium">文件名</th>
                    <th className="text-center px-2 py-2.5 font-medium whitespace-nowrap">采集时间</th>
                    <th className="text-center px-2 py-2.5 font-medium whitespace-nowrap">大小</th>
                    <th className="text-center px-2 py-2.5 font-medium whitespace-nowrap">时长</th>
                    <th className="text-center px-2 py-2.5 font-medium whitespace-nowrap">压缩</th>
                    <th className="text-center px-2 py-2.5 font-medium whitespace-nowrap">质检状态</th>
                    <th className="text-center px-2 py-2.5 font-medium whitespace-nowrap">上传</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it, rowIdx) => {
                    const cp = STATUS_BADGE.compress[it.compressStatus] || ['—', 'text-muted-foreground']
                    const us = STATUS_BADGE.upload[it.uploadStatus] || ['—', 'text-muted-foreground']
                    const rowNum = (page - 1) * pageSize + rowIdx + 1
                    return (
                      <tr key={it.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="w-[48px] max-w-[48px] px-2 py-2.5 text-muted-foreground tabular-nums text-center text-xs">{it.index ?? rowNum}</td>
                        <td className="px-3 py-2.5 min-w-0 truncate text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }} title={it.fileName}>{it.fileName}</td>
                        <td className="px-2 py-2.5 text-muted-foreground text-xs whitespace-nowrap text-center">{it.collectTime || '—'}</td>
                        <td className="px-2 py-2.5 text-muted-foreground text-xs whitespace-nowrap text-center">{it.dataSize || '—'}</td>
                        <td className="px-2 py-2.5 text-muted-foreground text-xs whitespace-nowrap text-center">{it.duration || '—'}</td>
                        <td className={`px-2 py-2.5 text-xs whitespace-nowrap text-center ${cp[1]}`}>{cp[0]}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-center">
                          <QualityBadge item={it} onInspect={setQualityDrawerItem} />
                        </td>
                        <td className={`px-2 py-2.5 text-xs whitespace-nowrap text-center ${us[1]}`}>{us[0]}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              共 {filtered.length} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium border border-border"
                  >
                    <ChevronLeft size={14} /> 上一页
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium border border-border"
                  >
                    下一页 <ChevronRight size={14} />
                  </button>
                </div>
          </div>
        )}
      </div>

      {/* Batch progress modal */}
      {progress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <LoaderCircle size={18} className="text-primary animate-spin" />
              <h3>{progress.mode === 'compressing' ? '批量压缩中' : '批量上传中'}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {progress.fileName}
            </p>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(progress.idx / progress.total) * 100}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {progress.idx} / {progress.total}
            </div>
          </div>
        </div>
      )}

      {/* Confirm start */}
      {confirmStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="mb-3">打开工作站</h3>
            <p className="text-sm text-muted-foreground mb-6">即将进入工作站准备本次采集，是否继续？</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setConfirmStart(false)} className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] transition-colors text-sm font-medium border border-border">取消</button>
              <button onClick={startCollect} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-colors text-sm font-medium">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit task modal */}
      {submitModal && (() => {
        const totalCount = task.items.length
        const collectedItems = task.items.filter((it) => it.collectStatus === 'done' || it.uploadStatus !== 'idle' || it.compressStatus !== 'idle')
        const uploadedItems = task.items.filter((it) => it.uploadStatus === 'uploaded')
        const notUploaded = task.items.filter((it) => it.collectStatus === 'done' && it.uploadStatus !== 'uploaded')
        const canSubmitNow = notUploaded.length === 0 && totalCount > 0
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
              {canSubmitNow ? (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                    <ArchiveRestore size={20} />
                  </div>
                  <div>
                    <h3>确认提交任务？</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">所有已采集条目均已上传完成</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                    <TriangleAlert size={20} />
                  </div>
                  <div>
                    <h3>无法提交任务</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">部分条目尚未上传完成</p>
                  </div>
                </div>
              )}
              {canSubmitNow ? (
                <div className="p-3 rounded-lg bg-secondary/50 mb-4 text-xs space-y-1.5">
                  <div className="flex justify-between text-foreground">
                    <span className="text-muted-foreground">已采集条目</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{collectedItems.length}/{totalCount}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span className="text-muted-foreground">已上传条目</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{uploadedItems.length}/{totalCount}</span>
                  </div>
                  <div className="flex justify-between text-warning">
                    <span>未上传条目</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>0 条</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 mb-4 text-xs space-y-1.5">
                    <div className="flex justify-between text-foreground">
                      <span>已采集条目</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{collectedItems.length}/{totalCount}</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>已上传条目</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{uploadedItems.length}/{totalCount}</span>
                    </div>
                    <div className="flex justify-between text-warning">
                      <span>未上传条目</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{notUploaded.length} 条</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                    请先完成所有已采集条目的上传后再提交任务。可使用"批量上传"功能快速上传。
                  </p>
                </>
              )}
              <div className="flex gap-2.5 justify-end">
                {canSubmitNow ? (
                  <>
                    <button onClick={() => setSubmitModal(false)} className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] transition-colors text-sm font-medium border border-border">取消</button>
                    <button onClick={submitTask} className="px-5 py-2.5 rounded-xl bg-success text-white hover:bg-success/90 active:scale-[0.98] transition-colors text-sm font-medium">确认提交任务</button>
                  </>
                ) : (
                  <button onClick={() => setSubmitModal(false)} className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] transition-colors text-sm font-medium border border-border">知道了</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <QualityDetailDrawer item={qualityDrawerItem} onClose={() => setQualityDrawerItem(null)} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-card border border-border text-sm shadow-2xl">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
