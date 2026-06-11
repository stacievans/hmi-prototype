import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import { ArrowLeft, Archive, Send, Play, ArchiveRestore, LoaderCircle, Trash2, X, MonitorPlay, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待采集' },
  { key: 'completed', label: '已完成' },
]
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

const STATUS_BADGE = {
  collect: { pending: ['待采集','text-muted-foreground'], done: ['已采集','text-success'] },
  compress: { pending: ['待压缩','text-muted-foreground'], compressing: ['压缩中','text-warning'], done: ['已压缩','text-success'] },
  upload: { pending: ['待上传','text-muted-foreground'], uploading: ['上传中','text-primary'], uploaded: ['已上传','text-success'], failed: ['失败','text-destructive'] },
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const { tasks, setTasks } = useApp()
  const task = tasks.find((t) => t.id === taskId)

  const [tab, setTab] = useState('all')
  const [cFilter, setCFilter] = useState('all')
  const [uFilter, setUFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [progress, setProgress] = useState(null)   // { mode, idx, total, fileName }
  const [submitModal, setSubmitModal] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState(null)
  const [confirmStart, setConfirmStart] = useState(false)
  const [toast, setToast] = useState(null)

  // Drive the batch progress for compress / upload
  useEffect(() => {
    if (!progress || progress.idx >= progress.total) return
    const t = setTimeout(() => {
      setProgress((p) => p ? { ...p, idx: p.idx + 1 } : p)
      setTasks((all) => all.map((tk) => {
        if (tk.id !== taskId) return tk
        const targets = tk.items.filter((it) => progress.mode === 'compressing'
          ? it.compressStatus === 'pending' && it.collectStatus === 'done'
          : it.compressStatus === 'done' && it.uploadStatus === 'pending')
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
      const t = setTimeout(() => setProgress(null), 600)
      return () => clearTimeout(t)
    }
  }, [progress])

  const flashToast = (msg) => {
    setToast({ msg, id: Date.now() })
    setTimeout(() => setToast(null), 2400)
  }

  const startCompress = () => {
    if (!task) return
    const list = task.items.filter((it) => it.compressStatus === 'pending' && it.collectStatus === 'done')
    if (list.length === 0) { flashToast('没有需要压缩的文件'); return }
    setProgress({ mode: 'compressing', idx: 0, total: list.length, fileName: list[0].fileName })
  }

  const startUpload = () => {
    if (!task) return
    const list = task.items.filter((it) => it.compressStatus === 'done' && it.uploadStatus === 'pending')
    if (list.length === 0) { flashToast('没有需要上传的文件'); return }
    setProgress({ mode: 'uploading', idx: 0, total: list.length, fileName: list[0].fileName })
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

  const deleteItem = () => {
    if (!deleteItemId) return
    setTasks((all) => all.map((tk) => tk.id !== taskId ? tk : {
      ...tk,
      items: tk.items.filter((it) => it.id !== deleteItemId),
      completedItems: Math.max(0, tk.completedItems - 1),
    }))
    setDeleteItemId(null)
  }

  const filtered = useMemo(() => {
    if (!task) return []
    return task.items.filter((it) => {
      if (tab === 'pending' && it.collectStatus === 'done') return false
      if (tab === 'completed' && it.collectStatus !== 'done') return false
      if (cFilter !== 'all' && it.compressStatus !== cFilter) return false
      if (uFilter !== 'all' && it.uploadStatus !== uFilter) return false
      return true
    })
  }, [task, tab, cFilter, uFilter])

  if (!task) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">任务未找到</div>
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const list = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pct = task.totalItems > 0 ? (task.completedItems / task.totalItems) * 100 : 0
  const itemCounts = {
    all: task.items.length,
    pending: task.items.filter((it) => it.collectStatus === 'pending').length,
    completed: task.items.filter((it) => it.collectStatus === 'done').length,
  }
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
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span>任务ID: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{task.taskId}</span></span>
                <span>项目: {task.project}</span>
                <span>场景: {task.scene}</span>
                <span>采集方式: {task.collectionMethod}</span>
                <span>用途: {task.purpose}</span>
              </div>
            </div>
            {task.status === 'in_progress' ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={startCompress}
                  disabled={!!progress}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm"
                >
                  <Archive size={14} />
                  批量压缩
                </button>
                <button
                  onClick={startUpload}
                  disabled={!!progress}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm"
                >
                  <Send size={14} />
                  批量上传
                </button>
                <button
                  onClick={() => setConfirmStart(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                >
                  <Play size={14} />
                  继续采集
                </button>
                <button
                  onClick={() => setSubmitModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90 transition-colors text-sm"
                >
                  <ArchiveRestore size={14} />
                  提交任务
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={startCompress}
                  disabled={!!progress}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm"
                >
                  <Archive size={14} />
                  批量压缩
                </button>
                <button
                  onClick={startUpload}
                  disabled={!!progress}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm"
                >
                  <Send size={14} />
                  批量上传
                </button>
                <button
                  onClick={() => nav(`/collection/workstation/${taskId}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
                >
                  <MonitorPlay size={14} />
                  打开工作站
                </button>
                <button
                  onClick={() => setConfirmStart(true)}
                  disabled={task.completedItems >= task.totalItems}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 text-sm"
                >
                  <Play size={14} />
                  {task.completedItems > 0 ? '继续采集' : '开始采集'}
                </button>
                <button
                  onClick={() => setSubmitModal(true)}
                  disabled={!canSubmit || task.status === 'completed'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success text-white hover:bg-success/90 transition-colors disabled:opacity-40 text-sm"
                >
                  <ArchiveRestore size={14} />
                  {task.status === 'completed' ? '已提交' : '提交任务'}
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {task.completedItems}/{task.totalItems}
            </span>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-border shrink-0 flex items-center gap-3 flex-wrap text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1) }}
              className={`px-3 py-1 rounded-full transition-colors
                ${tab === t.key ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {t.label} ({itemCounts[t.key]})
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3">
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
            <button
                onClick={() => { setCFilter('all'); setUFilter('all') }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
                清除筛选
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {list.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              暂无文件
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium w-10">#</th>
                    <th className="text-left px-3 py-2.5 font-medium">文件名</th>
                    <th className="text-left px-3 py-2.5 font-medium">采集时间</th>
                    <th className="text-left px-3 py-2.5 font-medium">大小</th>
                    <th className="text-left px-3 py-2.5 font-medium">时长</th>
                    <th className="text-left px-3 py-2.5 font-medium">压缩</th>
                    <th className="text-left px-3 py-2.5 font-medium">上传</th>
                    <th className="text-left px-3 py-2.5 font-medium w-20">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) => {
                    const cp = STATUS_BADGE.compress[it.compressStatus] || ['—', 'text-muted-foreground']
                    const us = STATUS_BADGE.upload[it.uploadStatus] || ['—', 'text-muted-foreground']
                    return (
                      <tr key={it.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground">{it.index}</td>
                        <td className="px-3 py-2.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{it.fileName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{it.collectTime || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{it.dataSize || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{it.duration || '—'}</td>
                        <td className={`px-3 py-2.5 text-xs ${cp[1]}`}>{cp[0]}</td>
                        <td className={`px-3 py-2.5 text-xs ${us[1]}`}>{us[0]}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => setDeleteItemId(it.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-secondary"
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
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
                className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
              >
                <ChevronLeft size={14} /> 上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
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
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmStart(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">取消</button>
              <button onClick={startCollect} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">确认</button>
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
              <div className="flex gap-3 justify-end">
                {canSubmitNow ? (
                  <>
                    <button onClick={() => setSubmitModal(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">取消</button>
                    <button onClick={submitTask} className="px-4 py-2 rounded-lg bg-success text-white text-sm">确认提交任务</button>
                  </>
                ) : (
                  <button onClick={() => setSubmitModal(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">知道了</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete confirmation */}
      {deleteItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="mb-3 text-destructive">删除文件</h3>
            <p className="text-sm text-muted-foreground mb-6">确认删除该采集文件？此操作不可恢复。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">取消</button>
              <button onClick={deleteItem} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-card border border-border text-sm shadow-2xl">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
