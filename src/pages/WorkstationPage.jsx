import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import { ArrowLeft, Square, Play, LoaderCircle, ChevronDown, ChevronRight, Hand, Glasses, Check, TriangleAlert, ArrowRightLeft } from 'lucide-react'
import CurvesPanel from '../components/charts/CurvesPanel.jsx'

const MIN_DURATION = 3
const MAX_DURATION = 300   // 5 minutes

export default function WorkstationPage() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const {
    tasks, controlState, teleopMode, inputSource, setInputSource,
    takeControl, releaseControl, setRecordingState, recordingState,
    exportRecordingCSV, setTasks,
    connectedDevices, easingProgress, switchToFollow,
  } = useApp()
  const task = tasks.find((t) => t.id === taskId)

  const [elapsed, setElapsed] = useState(0)
  const timer = useRef(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [showWarnShort, setShowWarnShort] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelCountdown, setCancelCountdown] = useState(3)
  const [showWarnLong, setShowWarnLong] = useState(false)
  const [toast, setToast] = useState(null)
  const [showTaskDetails, setShowTaskDetails] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)

  // Tick recording time
  useEffect(() => {
    if (recordingState === 'recording') {
      timer.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 1
          if (next >= MAX_DURATION) {
            setShowWarnLong(true)
          }
          return next
        })
      }, 1000)
    }
    return () => clearInterval(timer.current)
  }, [recordingState])

  // Long duration warning: auto-stop after 5s
  useEffect(() => {
    if (!showWarnLong) return
    const t = setTimeout(() => doStop(), 5000)
    return () => clearTimeout(t)
  }, [showWarnLong])

  // Countdown effect (before recording)
  useEffect(() => {
    if (!showCountdown) return
    if (countdown === 0) {
      setShowCountdown(false)
      setCountdown(3)
      startRecord()
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [showCountdown, countdown])

  // Cancel confirmation 3s auto-confirm
  useEffect(() => {
    if (!showCancelConfirm) return
    if (cancelCountdown === 0) {
      doStop(true)
      setShowCancelConfirm(false)
      setCancelCountdown(3)
      return
    }
    const t = setTimeout(() => setCancelCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [showCancelConfirm, cancelCountdown])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'r' || e.key === 'R') {
        if (recordingState !== 'recording') handleRecordClick()
      } else if (e.key === 's' || e.key === 'S') {
        if (recordingState === 'recording') stopRecord()
      } else if (e.key === 'Escape') {
        if (recordingState === 'recording') setShowCancelConfirm(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [recordingState])

  const startRecord = () => {
    setRecordingState('recording')
    setElapsed(0)
  }
  const stopRecord = () => {
    if (elapsed > 0 && elapsed < MIN_DURATION) {
      setShowWarnShort(true)
      return
    }
    doStop()
  }
  const doStop = (cancelled = false) => {
    const csv = exportRecordingCSV()
    const sampleCount = csv ? csv.split('\n').length - 1 : 0
    if (sampleCount > 0 && !cancelled) {
      const idx = task.items.length + 1
      const fileName = task.items.length > 0
        ? task.items[0].fileName
        : (() => {
            const now = new Date()
            return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.h5`
          })()
      const collectTime = (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      })()
      setTasks((all) => all.map((tk) => tk.id !== task.id ? tk : {
        ...tk,
        completedItems: Math.min(tk.totalItems, tk.completedItems + 1),
        items: [
          { id: `it-${Date.now()}`, index: idx, fileName, dataSize: `${(sampleCount / 30 * 0.6).toFixed(1)} MB`, duration: `${sampleCount / 30 | 0}s`, collectTime, compressStatus: 'pending', qualityStatus: 'pending', uploadStatus: 'pending', collectStatus: 'done' },
          ...tk.items,
        ],
      }))
      flashToast(`已保存 ${fileName} · ${sampleCount} 帧 (${(sampleCount / 30).toFixed(1)}s)`)
    } else if (cancelled) {
      flashToast('已取消本次录制')
    }
    setRecordingState('idle')
    setElapsed(0)
    setShowWarnShort(false)
    setShowWarnLong(false)
    setCurrentStep(0)
  }

  const handleRecordClick = () => {
    if (recordingState === 'recording') { stopRecord(); return }
    if (controlState !== 'controlling' || (inputSource === 'exoskeleton' && teleopMode !== 'follow')) {
      setShowCountdown(true)
      setCountdown(3)
      return
    }
    startRecord()
  }

  const handleBack = () => {
    if (controlState === 'controlling' || recordingState === 'recording') {
      setShowLeaveConfirm(true)
    } else {
      nav(`/collection/task/${taskId}`)
    }
  }

  const confirmLeave = () => {
    releaseControl()
    setRecordingState('idle')
    setShowLeaveConfirm(false)
    nav(`/collection/task/${taskId}`)
  }

  const handleCSV = useCallback((csv) => {
    if (!csv) { flashToast('暂无可导出的数据'); return }
    const fileName = `${task.taskId}_ep${(task.completedItems + 1).toString().padStart(4, '0')}_${Date.now()}.csv`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    flashToast(`已导出 ${fileName}`)
  }, [task])

  const flashToast = (msg) => {
    setToast({ msg, id: Date.now() })
    setTimeout(() => setToast(null), 2400)
  }

  if (!task) return <div className="flex-1 flex items-center justify-center text-muted-foreground">任务未找到</div>

  const cd = connectedDevices
  const sources = [
    { key: 'exoskeleton', label: '外骨骼', connected: cd.exoskeleton, Icon: Hand },
    { key: 'vr', label: 'VR', connected: cd.vr, Icon: Glasses },
  ]
  const ep = task.completedItems + 1
  const epPct = Math.min(100, (task.completedItems / task.totalItems) * 100)

  return (
    <div className={`flex flex-col h-full overflow-hidden ${recordingState === 'recording' ? 'ring-4 ring-inset ring-destructive/60' : ''}`}>
      <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">
        {/* Header strip */}
        <div className="flex items-center justify-between shrink-0 px-1">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <div className="flex items-center gap-3">
            {recordingState === 'recording' && (
              <div className="flex items-center gap-1.5 text-destructive text-xs">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />
                REC
              </div>
            )}
            <span className="text-sm">{task.name}</span>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{task.taskId}</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
          {/* Camera area */}
          <div className="col-span-2 rounded-2xl border border-border bg-[#0a0d12] relative overflow-hidden flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                {recordingState === 'recording'
                  ? <Square size={28} className="text-destructive" />
                  : <Play size={28} className="text-muted-foreground" />}
              </div>
              <p className="text-muted-foreground text-sm">
                {recordingState === 'recording' ? '录制中...' : '准备录制'}
              </p>
            </div>
          </div>

          {/* Right side panel: progress / task details / collection timer / input source / teleop */}
          <div className="rounded-2xl border border-border bg-[#0d1117] overflow-y-auto flex flex-col">
            {/* Current progress */}
            <div className="p-3 border-b border-border">
              <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">当前进度</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>EP {ep.toString().padStart(4, '0')}</span>
                <span className="text-xs text-muted-foreground">/ {task.totalItems}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${epPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>已完成 {task.completedItems}</span>
                <span>{epPct.toFixed(0)}%</span>
              </div>
            </div>

            {/* Task details (collapsible) */}
            <div className="border-b border-border">
              <button
                onClick={() => setShowTaskDetails((v) => !v)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
              >
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider">任务详情</h4>
                {showTaskDetails ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </button>
              {showTaskDetails && (
                <div className="px-3 pb-3 text-xs space-y-3">
                  <div>
                    <div className="text-muted-foreground mb-1">初始场景：</div>
                    <div className="text-foreground">{task.initialScene}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1.5">步骤描述：</div>
                    <ol className="space-y-1">
                      {(task.steps || []).map((s, i) => (
                        <li key={i} className={`flex gap-2 ${i === currentStep && recordingState === 'recording' ? 'text-primary' : 'text-foreground'}`}>
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Collection timer */}
            <div className="p-3 border-b border-border">
              <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">采集计时</h4>
              <div className="text-3xl text-center text-foreground my-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(elapsed)}</div>
              {recordingState === 'recording' && elapsed > 0 && elapsed < MAX_DURATION && elapsed >= MAX_DURATION - 30 && (
                <div className="text-xs text-warning text-center mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  即将达到最大时长 {Math.floor(MAX_DURATION / 60)} 分钟
                </div>
              )}
              {recordingState !== 'recording' ? (
                <button
                  onClick={handleRecordClick}
                  className="w-full py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={14} />
                  开始采集 (R)
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={stopRecord}
                    className="py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 text-xs"
                  >
                    结束采集 (S)
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1 text-xs"
                  >
                    取消采集 (Esc)
                  </button>
                </div>
              )}
            </div>

            {/* Footer: input source + teleop control */}
            <div className="bg-[#010409] mt-auto p-3 space-y-3">
              <div>
                <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">输入源</h4>
                <div className="grid grid-cols-2 gap-2">
                  {sources.map(({ key, label, connected, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setInputSource(key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all relative
                        ${inputSource === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px]">{label}</span>
                      <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">遥操控制</h4>
                {controlState === 'idle' ? (
                  <button
                    onClick={takeControl}
                    disabled={!inputSource}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Play size={12} /> 开启控制
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">运动模式</span>
                      <span className="text-warning">{teleopMode === 'easing' ? '缓动对齐' : '随动'}</span>
                    </div>
                    {inputSource === 'exoskeleton' && teleopMode === 'easing' && (
                      <>
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${easingProgress}%` }} />
                        </div>
                        <button
                          onClick={switchToFollow}
                          disabled={easingProgress < 100}
                          className="w-full py-1.5 rounded border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 text-xs flex items-center justify-center gap-1"
                        >
                          <ArrowRightLeft size={11} /> 切换随动
                        </button>
                      </>
                    )}
                    {((inputSource === 'exoskeleton' && teleopMode === 'follow') || inputSource === 'vr') && (
                      <div className="text-success text-xs flex items-center gap-1.5">
                        <Check size={12} /> 实时映射中
                      </div>
                    )}
                    <button
                      onClick={releaseControl}
                      className="w-full py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-xs"
                    >
                      退出控制
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Curves panel (added on top of original) */}
        <div className="shrink-0">
          <CurvesPanel onCSV={handleCSV} />
        </div>
      </div>

      {/* Countdown */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <LoaderCircle size={32} className="mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm mb-2">系统接管中</p>
            <p className="text-6xl text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{countdown}</p>
          </div>
        </div>
      )}

      {/* Short recording warning */}
      {showWarnShort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="mb-3 text-warning">录制时长过短</h3>
            <p className="text-sm text-muted-foreground mb-6">本次录制时长不足 {MIN_DURATION} 秒，建议丢弃或继续录制。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => doStop(true)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">丢弃</button>
              <button onClick={() => setShowWarnShort(false)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">继续录制</button>
            </div>
          </div>
        </div>
      )}

      {/* Long duration warning (5min timeout) */}
      {showWarnLong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border-2 border-warning rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-3 text-warning">
              <TriangleAlert size={20} />
              <h3>采集已超过 {Math.floor(MAX_DURATION / 60)} 分钟，正在自动结束...</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">系统将在 5 秒后自动保存并结束本次录制。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => doStop()} className="px-4 py-2 rounded-lg bg-warning text-white">强制结束</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel recording confirmation (3s auto-confirm) */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="mb-3 text-warning">确认取消录制？</h3>
            <p className="text-sm text-muted-foreground mb-6">
              取消后本次数据将不保存，{cancelCountdown} 秒后自动确认。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelCountdown(3) }}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground"
              >
                继续录制
              </button>
              <button
                onClick={() => { doStop(true); setShowCancelConfirm(false); setCancelCountdown(3) }}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground"
              >
                确认取消 ({cancelCountdown})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="mb-3">离开确认</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {recordingState === 'recording'
                ? '当前正在录制中，离开将自动停止录制并释放设备控制。'
                : '当前处于设备控制中，离开将自动释放控制，设备进入安全停止状态。'}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLeaveConfirm(false)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">取消</button>
              <button onClick={confirmLeave} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground">确认离开</button>
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

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
}
