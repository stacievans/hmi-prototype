import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, parseDataSizeMB } from '../state/AppContext.jsx'
import {
  AlertTriangle, ChevronLeft, ChevronRight, HardDrive, FileWarning,
  Copy, Check, Trash2,
} from 'lucide-react'

const ANOMALY_TYPES = ['文件异常', '数据缺失', '时序异常', '传感器异常']

/** 异常类型 → 分段色条颜色（与质检红/黄/绿、存储空间条区分，饱和度适中） */
const ANOMALY_TYPE_COLORS = {
  '文件异常': '#79c0ff',
  '数据缺失': '#a371f7',
  '时序异常': '#56d4dd',
  '传感器异常': '#db6d9c',
}

const ANOMALY_TYPE_FALLBACK_COLOR = '#8b949e'

function getAnomalyTypeColor(type) {
  return ANOMALY_TYPE_COLORS[type] ?? ANOMALY_TYPE_FALLBACK_COLOR
}

function anomalySegmentPct(count, total) {
  if (total <= 0 || count <= 0) return 0
  return Math.min(100, (count / total) * 100)
}

const TYPE_OPTS = [
  { value: 'all', label: '全部异常类型' },
  ...ANOMALY_TYPES.map((t) => ({ value: t, label: t })),
]

function formatStorageGB(mb) {
  if (!Number.isFinite(mb) || mb <= 0) return '0.00 GB'
  return `${(mb / 1024).toFixed(2)} GB`
}

function summarizeReasons(reasons) {
  if (!reasons?.length) return '—'
  return reasons.join('；')
}

function collectAnomalies(tasks) {
  const rows = []
  for (const task of tasks) {
    for (const item of task.items ?? []) {
      if (item.qualityStatus !== 'failed') continue
      rows.push({
        key: `${task.id}-${item.id}`,
        itemId: item.id,
        fileName: item.fileName,
        taskId: task.id,
        taskName: task.name,
        collectTime: item.collectTime,
        dataSize: item.dataSize,
        dataSizeMB: parseDataSizeMB(item.dataSize),
        anomalyType: item.anomalyType ?? '—',
        anomalyReasons: item.anomalyReasons ?? [],
        localPath: item.localPath ?? '',
      })
    }
  }
  return rows.sort((a, b) => (b.collectTime || '').localeCompare(a.collectTime || ''))
}

function CopyPathButton({ path, onToast }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!path) return
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      onToast('地址已复制')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast('复制失败，请手动复制')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!path}
      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      title={copied ? '已复制' : '复制地址'}
      aria-label={copied ? '已复制' : '复制本地存储地址'}
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  )
}

function DeleteConfirmModal({ count, releaseMB, onCancel, onConfirm }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} aria-hidden="true" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-2xl p-6 card-depth">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-destructive/15 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-foreground">确认批量删除？</h3>
            <p className="text-xs text-muted-foreground mt-0.5">删除后不可恢复</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 mb-5 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">将删除条目</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{count} 条</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">预计释放空间</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatStorageGB(releaseMB)}</span>
          </div>
        </div>
        <div className="flex gap-2.5 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] transition-colors text-sm font-medium border border-border"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98] transition-colors text-sm font-medium"
          >
            确认删除
          </button>
        </div>
      </div>
    </>
  )
}

export default function AnomalyDataPage() {
  const { tasks, setTasks, storage } = useApp()
  const [taskFilter, setTaskFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState(null)
  const selectAllRef = useRef(null)
  const pageSize = 8

  const allAnomalies = useMemo(() => collectAnomalies(tasks), [tasks])

  const overview = useMemo(() => {
    const byType = Object.fromEntries(ANOMALY_TYPES.map((t) => [t, 0]))
    for (const r of allAnomalies) {
      if (byType[r.anomalyType] !== undefined) byType[r.anomalyType] += 1
    }
    return { count: allAnomalies.length, byType }
  }, [allAnomalies])

  const taskOptions = useMemo(() => {
    const names = new Map()
    for (const r of allAnomalies) names.set(r.taskId, r.taskName)
    return [{ value: 'all', label: '全部任务' }, ...Array.from(names, ([id, name]) => ({ value: id, label: name }))]
  }, [allAnomalies])

  const filtered = useMemo(() => {
    return allAnomalies.filter((r) => {
      if (taskFilter !== 'all' && r.taskId !== taskFilter) return false
      if (typeFilter !== 'all' && r.anomalyType !== typeFilter) return false
      return true
    })
  }, [allAnomalies, taskFilter, typeFilter])

  const selectedRows = useMemo(
    () => allAnomalies.filter((r) => selected.has(r.key)),
    [allAnomalies, selected],
  )
  const selectedCount = selectedRows.length

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const list = filtered.slice((page - 1) * pageSize, page * pageSize)

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.key))
  const someFilteredSelected = filtered.some((r) => selected.has(r.key)) && !allFilteredSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someFilteredSelected
  }, [someFilteredSelected])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const flashToast = (msg) => {
    setToast({ msg, id: Date.now() })
    setTimeout(() => setToast(null), 2400)
  }

  const toggleRow = (key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const r of filtered) next.delete(r.key)
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const r of filtered) next.add(r.key)
        return next
      })
    }
  }

  const confirmDelete = () => {
    const keys = new Set(selectedRows.map((r) => r.key))
    const count = keys.size
    const releaseMB = selectedRows.reduce((sum, r) => sum + r.dataSizeMB, 0)

    setTasks((all) => all.map((task) => {
      const removed = task.items.filter((it) => keys.has(`${task.id}-${it.id}`)).length
      if (removed === 0) return task
      return {
        ...task,
        items: task.items.filter((it) => !keys.has(`${task.id}-${it.id}`)),
        completedItems: Math.max(0, task.completedItems - removed),
      }
    }))

    setSelected(new Set())
    setShowDeleteConfirm(false)
    flashToast(`已删除 ${count} 条，释放 ${formatStorageGB(releaseMB)}`)
  }

  const deletePreviewMB = selectedRows.reduce((sum, r) => sum + r.dataSizeMB, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-destructive" />
            <h2>异常数据管理</h2>
            <span className="text-xs text-muted-foreground">· 机器人本地异常数据汇总</span>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<FileWarning size={16} className="text-destructive" />}
              label="异常数据总条数"
              value={String(overview.count)}
              mono
            />
            <StatCard
              icon={<HardDrive size={16} className="text-primary" />}
              label="总占用空间"
              value={formatStorageGB(storage.anomalyMB)}
              mono
            />
            <div className="lg:col-span-2 min-w-0">
              <AnomalyTypeDistributionCard byType={overview.byType} total={overview.count} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3 min-h-[28px]">
              <span className="text-muted-foreground">
                已选{' '}
                <span className="text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {selectedCount}
                </span>{' '}
                条
              </span>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors active:scale-[0.98] text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/30"
              >
                <Trash2 size={13} />
                批量删除
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>所属任务:</span>
                <select
                  value={taskFilter}
                  onChange={(e) => { setTaskFilter(e.target.value); setPage(1) }}
                  className="bg-secondary border border-border text-foreground text-xs rounded px-2 py-1 focus:border-primary focus:outline-none max-w-[12rem]"
                >
                  {taskOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>异常类型:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                  className="bg-secondary border border-border text-foreground text-xs rounded px-2 py-1 focus:border-primary focus:outline-none"
                >
                  {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                <AlertTriangle size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">暂无异常数据</p>
              <p className="text-xs text-muted-foreground/70 mt-1">所有采集条目质检均正常，或当前筛选条件下无匹配结果</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '9.5rem' }} />
                  <col style={{ width: '4.75rem' }} />
                  <col style={{ width: '5.25rem' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '44px' }} />
                </colgroup>
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-1.5 py-3 text-center">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="rounded border-border accent-primary cursor-pointer"
                        aria-label="全选当前筛选结果"
                      />
                    </th>
                    <th className="text-center px-3 py-3 font-medium">文件名</th>
                    <th className="text-center px-3 py-3 font-medium">所属任务</th>
                    <th className="text-center px-3 py-3 font-medium whitespace-nowrap">采集时间</th>
                    <th className="text-center px-3 py-3 font-medium whitespace-nowrap">大小</th>
                    <th className="text-center px-2 py-3 font-medium whitespace-nowrap">异常类型</th>
                    <th className="text-center px-3 py-3 font-medium">异常原因</th>
                    <th className="text-center px-3 py-3 font-medium">本地存储地址</th>
                    <th className="px-1.5 py-3 text-center">
                      <span className="sr-only">复制</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => {
                    const reasonText = summarizeReasons(row.anomalyReasons)
                    const checked = selected.has(row.key)
                    return (
                      <tr key={row.key} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-1.5 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(row.key)}
                            className="rounded border-border accent-primary cursor-pointer"
                            aria-label={`选择 ${row.fileName}`}
                          />
                        </td>
                        <td
                          className="px-3 py-3 min-w-0 max-w-0 truncate align-middle"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          title={row.fileName}
                        >
                          {row.fileName}
                        </td>
                        <td className="px-3 py-3 min-w-0 max-w-0 truncate text-foreground align-middle" title={row.taskName}>
                          {row.taskName}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap text-center align-middle tabular-nums">
                          {row.collectTime || '—'}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap text-center align-middle tabular-nums">
                          {row.dataSizeMB > 0 ? formatStorageGB(row.dataSizeMB) : '—'}
                        </td>
                        <td className="px-2 py-3 text-xs text-destructive whitespace-nowrap text-center align-middle">
                          {row.anomalyType}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground min-w-0 max-w-0 truncate align-middle leading-relaxed" title={reasonText}>
                          {reasonText}
                        </td>
                        <td
                          className="px-3 py-3 min-w-0 max-w-0 truncate text-xs text-muted-foreground align-middle"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          title={row.localPath || '—'}
                        >
                          {row.localPath || '—'}
                        </td>
                        <td className="px-1.5 py-3 text-center align-middle">
                          <CopyPathButton path={row.localPath} onToast={flashToast} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && totalPages > 1 && (
            <div className="py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                共 {filtered.length} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium border border-border"
                >
                  <ChevronLeft size={14} /> 上一页
                </button>
                <button
                  type="button"
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
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selectedRows.length}
          releaseMB={deletePreviewMB}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-card border border-border text-sm shadow-2xl">
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function AnomalyTypeLegendItem({ color, type, count, pct }) {
  return (
    <span className="inline-flex items-center gap-1 min-w-0 shrink">
      <span
        className="w-2 h-2 rounded-sm shrink-0 border border-border/40"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground truncate">{type}</span>
      <span className="text-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {count}条·{pct}%
      </span>
    </span>
  )
}

function AnomalyTypeDistributionCard({ byType, total }) {
  const segments = useMemo(() => {
    if (total <= 0) return []
    return ANOMALY_TYPES
      .map((type) => ({
        type,
        count: byType[type] ?? 0,
        color: getAnomalyTypeColor(type),
      }))
      .filter((seg) => seg.count > 0)
  }, [byType, total])

  const ariaLabel = segments.length > 0
    ? segments.map((s) => `${s.type} ${s.count} 条`).join('，')
    : '暂无异常类型分布'

  return (
    <div className="p-3.5 rounded-md bg-card border border-border card-depth h-full">
      <div className="text-xs text-muted-foreground mb-3">异常类型分布</div>

      <div
        className="w-full h-3 rounded-full bg-secondary overflow-hidden mb-2.5 flex"
        role="img"
        aria-label={ariaLabel}
      >
        {segments.map((seg, index) => (
          <div
            key={seg.type}
            className={`h-full shrink-0 transition-all duration-300 ${
              index < segments.length - 1 ? 'border-r border-background/30' : ''
            }`}
            style={{
              width: `${anomalySegmentPct(seg.count, total)}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.type} ${seg.count} 条 (${anomalySegmentPct(seg.count, total).toFixed(0)}%)`}
          />
        ))}
      </div>

      <div className="flex flex-nowrap items-center justify-between gap-x-2 text-[11px] w-full overflow-hidden">
        {segments.length > 0 ? (
          segments.map((seg) => (
            <AnomalyTypeLegendItem
              key={seg.type}
              color={seg.color}
              type={seg.type}
              count={seg.count}
              pct={anomalySegmentPct(seg.count, total).toFixed(0)}
            />
          ))
        ) : (
          <span className="text-muted-foreground text-xs">暂无异常数据</span>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, mono = false }) {
  return (
    <div className="p-3.5 rounded-md bg-card border border-border card-depth">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl text-foreground" style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}>
        {value}
      </div>
    </div>
  )
}
