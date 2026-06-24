import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import { CollectProgressInline } from '../components/CollectProgressBar.jsx'
import {
  ArrowLeft, Play, LoaderCircle, ChevronDown, ChevronRight,
  Hand, Glasses, Check, TriangleAlert, Video, Maximize2, Eye, EyeOff, Circle, HardDrive,
} from 'lucide-react'
import GripperTimeDock from '../components/charts/GripperTimeDock.jsx'

const MIN_DURATION = 3
const MAX_DURATION = 300   // 5 minutes

const QC_TOAST_STYLE = {
  passed: {
    color: '#3fb950',
    backgroundColor: 'rgba(63, 185, 80, 0.12)',
    border: '1px solid rgba(63, 185, 80, 0.35)',
  },
  failed: {
    color: '#f85149',
    backgroundColor: 'rgba(248, 81, 73, 0.12)',
    border: '1px solid rgba(248, 81, 73, 0.35)',
  },
  warning: {
    color: '#d29922',
    backgroundColor: 'rgba(210, 153, 34, 0.12)',
    border: '1px solid rgba(210, 153, 34, 0.35)',
  },
}

const QC_TOAST_LABELS = { passed: '合格', failed: '异常', warning: '警告' }

function pickMockQcOutcome() {
  const r = Math.random() * 100
  if (r < 68) return 'passed'
  if (r < 84) return 'warning'
  return 'failed'
}

function mockQcPatch(status) {
  if (status === 'passed') return { qualityStatus: 'passed' }
  if (status === 'warning') {
    return {
      qualityStatus: 'warning',
      anomalyType: '警告类',
      anomalyReasons: ['关节超限位时间段及占比'],
    }
  }
  return {
    qualityStatus: 'failed',
    anomalyType: '时序异常',
    anomalyReasons: ['数据断帧：存在采集卡顿/丢帧'],
  }
}

const CAMS = [
  { id: 'head',  label: '头部相机' },
  { id: 'chest', label: '胸部相机' },
  { id: 'left',  label: '左手相机' },
  { id: 'right', label: '右手相机' },
]

export default function WorkstationPage() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const {
    tasks, controlState, teleopMode, inputSource, setInputSource,
    takeControl, releaseControl, setRecordingState, recordingState,
    exportRecordingCSV, setTasks, storage,
    connectedDevices, easingProgress,
    beginLiveRecordingDisplay, finishRecordingDisplay, abortRecordingSession,
    showAppToast,
  } = useApp()
  const task = tasks.find((t) => t.id === taskId)

  const [elapsed, setElapsed] = useState(0)
  const timer = useRef(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [showWarnShort, setShowWarnShort] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingLeavePath, setPendingLeavePath] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelCountdown, setCancelCountdown] = useState(3)
  const [showWarnLong, setShowWarnLong] = useState(false)
  const [showNeedControl, setShowNeedControl] = useState(false)
  const [showWaitingAlign, setShowWaitingAlign] = useState(false)
  const [toast, setToast] = useState(null)
  const [qcToasts, setQcToasts] = useState([])
  const [showTaskDetails, setShowTaskDetails] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [enabledCams, setEnabledCams] = useState({ head: true, chest: true, left: true, right: true })
  const [fullscreenCam, setFullscreenCam] = useState(null)
  const qcScheduledRef = useRef(new Set())
  const prevQualityRef = useRef(new Map())
  const qcInitRef = useRef(false)

  const enqueueQcToast = useCallback((index, status) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setQcToasts((prev) => [...prev, { id, index, status }])
    setTimeout(() => {
      setQcToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const scheduleMockQc = useCallback((itemId) => {
    if (qcScheduledRef.current.has(itemId)) return
    qcScheduledRef.current.add(itemId)
    const delay = 2200 + Math.random() * 2800
    window.setTimeout(() => {
      const outcome = pickMockQcOutcome()
      setTasks((all) => all.map((tk) => {
        if (tk.id !== taskId) return tk
        return {
          ...tk,
          items: tk.items.map((it) => (
            it.id === itemId ? { ...it, ...mockQcPatch(outcome) } : it
          )),
        }
      }))
    }, delay)
  }, [setTasks, taskId])

  useEffect(() => {
    qcInitRef.current = false
    qcScheduledRef.current = new Set()
    prevQualityRef.current = new Map()
  }, [taskId])

  useEffect(() => {
    if (!task) return

    if (!qcInitRef.current) {
      for (const it of task.items ?? []) {
        prevQualityRef.current.set(it.id, it.qualityStatus ?? 'pending')
      }
      qcInitRef.current = true
    }

    for (const it of task.items ?? []) {
      const prev = prevQualityRef.current.get(it.id)
      const curr = it.qualityStatus ?? 'pending'
      if (prev === 'pending' && curr !== 'pending' && prev !== undefined) {
        enqueueQcToast(it.index, curr)
      }
      prevQualityRef.current.set(it.id, curr)

      if (curr === 'pending' && it.collectStatus === 'done') {
        scheduleMockQc(it.id)
      }
    }
  }, [task, enqueueQcToast, scheduleMockQc])
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
    beginLiveRecordingDisplay()
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
      finishRecordingDisplay()
    } else if (cancelled) {
      abortRecordingSession()
      flashToast('已取消本次录制')
    } else {
      abortRecordingSession()
    }
    setElapsed(0)
    setShowWarnShort(false)
    setShowWarnLong(false)
    setCurrentStep(0)
  }

  const resetLocalRecordingUi = () => {
    setElapsed(0)
    setCurrentStep(0)
    setShowWarnShort(false)
    setShowWarnLong(false)
    setShowCancelConfirm(false)
    setShowCountdown(false)
    setCancelCountdown(3)
  }

  const handleReleaseControl = () => {
    const interrupted = releaseControl()
    if (interrupted) {
      resetLocalRecordingUi()
      flashToast('采集已中断，本次数据未保存')
    }
  }

  const handleRecordClick = () => {
    if (recordingState === 'recording') { stopRecord(); return }
    if (controlState !== 'controlling') {
      setShowNeedControl(true)
      return
    }
    if (inputSource === 'exoskeleton' && teleopMode !== 'follow') {
      setShowWaitingAlign(true)
      return
    }
    startRecord()
  }

  const requestLeave = (path) => {
    if (controlState === 'controlling' || recordingState === 'recording') {
      setPendingLeavePath(path)
      setShowLeaveConfirm(true)
    } else {
      nav(path)
    }
  }

  const handleBack = () => {
    requestLeave(`/collection/task/${taskId}`)
  }

  const confirmLeave = () => {
    const interrupted = releaseControl()
    if (interrupted) {
      resetLocalRecordingUi()
      showAppToast('采集已中断，本次数据未保存')
    }
    setShowLeaveConfirm(false)
    nav(pendingLeavePath ?? `/collection/task/${taskId}`)
    setPendingLeavePath(null)
  }

  const cancelLeave = () => {
    setShowLeaveConfirm(false)
    setPendingLeavePath(null)
  }

  const flashToast = (msg) => {
    setToast({ msg, id: Date.now() })
    setTimeout(() => setToast(null), 2400)
  }

  useEffect(() => {
    if (!showWaitingAlign) return
    if (inputSource === 'exoskeleton' && teleopMode === 'follow') {
      setShowWaitingAlign(false)
      flashToast('随动就绪，可以开始采集')
    }
  }, [showWaitingAlign, teleopMode, inputSource])

  if (!task) return <div className="flex-1 flex items-center justify-center text-muted-foreground">任务未找到</div>

  const canStartRecord = controlState === 'controlling'
    && (inputSource === 'vr' || teleopMode === 'follow')
  const exoskeletonAligning = inputSource === 'exoskeleton'
    && controlState === 'controlling'
    && teleopMode !== 'follow'

  const cd = connectedDevices
  const sources = [
    { key: 'exoskeleton', label: '外骨骼', connected: cd.exoskeleton, Icon: Hand },
    { key: 'vr', label: 'VR', connected: cd.vr, Icon: Glasses },
  ]
  const enabledList = CAMS.filter((c) => enabledCams[c.id])
  const fsCam = fullscreenCam ? CAMS.find((c) => c.id === fullscreenCam) : null

  return (
    <div className={`flex flex-col h-full overflow-hidden ${recordingState === 'recording' ? 'ring-4 ring-inset ring-destructive/60' : ''}`}>
      <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">
        {/* Header strip: 返回+存储 | 采集进度 | 任务名 */}
        <div className="flex items-center shrink-0 px-1 min-w-0 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors rounded-md px-2.5 py-1 -ml-2 hover:bg-secondary shrink-0"
            >
              <ArrowLeft size={16} />
              返回
            </button>
            <StorageStatusBadge storage={storage} onNavigate={() => requestLeave('/anomaly')} />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CollectProgressInline task={task} showLabel />
            {recordingState === 'recording' && (
              <div className="flex items-center gap-1.5 text-destructive text-xs font-medium shrink-0">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />
                REC
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 min-w-0 max-w-[40%] lg:max-w-none pl-2 sm:pl-4">
            <span className="text-sm font-medium truncate">{task.name}</span>
            <span
              className="text-[10px] text-muted-foreground shrink-0 hidden md:inline truncate max-w-[6.5rem] lg:max-w-[9rem] xl:max-w-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {task.taskId}
            </span>
          </div>
        </div>

        {/* Main row: left = cameras + gripper dock; right = task panel */}
        <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
          {/* Left column: camera grid + gripper curves (2/3 width) */}
          <div className="col-span-2 flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0 rounded-md border border-border bg-[#0a0d12] relative overflow-hidden flex flex-col">
              {/* Camera toggles */}
              <div className="absolute top-2.5 left-2.5 z-10 flex gap-1">
                {CAMS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEnabledCams((m) => ({ ...m, [c.id]: !m[c.id] }))}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
                      enabledCams[c.id]
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-secondary/80 text-muted-foreground border border-border'
                    }`}
                  >
                    {enabledCams[c.id] ? <Eye size={11} /> : <EyeOff size={11} />}
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Camera grid */}
              <div className="flex-1 min-h-0 p-1.5 pt-12">
                {fsCam ? (
                  <CameraTile cam={fsCam} recording={recordingState === 'recording'} large />
                ) : enabledList.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">所有相机已关闭</div>
                ) : (
                  <div className={`w-full h-full grid gap-1.5 ${enabledList.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {enabledList.map((c) => (
                      <div key={c.id} className="relative group rounded overflow-hidden">
                        <CameraTile cam={c} recording={recordingState === 'recording'} />
                        <button
                          onClick={() => setFullscreenCam(c.id)}
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-black/60 text-white"
                        >
                          <Maximize2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {fsCam && (
                  <button
                    onClick={() => setFullscreenCam(null)}
                    className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-1 rounded-md bg-secondary/80 text-foreground text-[11px] hover:bg-secondary transition-colors border border-border"
                  >
                    退出全屏
                  </button>
                )}
              </div>
            </div>

            <div className="shrink-0 min-h-0">
              <GripperTimeDock />
            </div>
          </div>

          {/* Right column: task details / collection timer / input source / teleop */}
          <div className="col-span-1 min-h-0 rounded-md border border-border bg-[#0d1117] flex flex-col overflow-hidden">
            {/* Task details (collapsible) */}
            <div className="border-b border-border flex-1 min-h-0 flex flex-col overflow-hidden">
              <button
                onClick={() => setShowTaskDetails((v) => !v)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors shrink-0"
              >
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider">任务详情</h4>
                {showTaskDetails ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
              </button>
              {showTaskDetails && (
                <div className="px-3 pb-3 text-xs space-y-2.5 overflow-y-auto flex-1 min-h-0">
                  <div>
                    <div className="text-muted-foreground mb-1">初始场景</div>
                    <div className="text-foreground leading-relaxed">{task.initialScene}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1.5">步骤描述</div>
                    <ol className="space-y-1">
                      {(task.steps || []).map((s, i) => (
                        <li
                          key={i}
                          className={`flex gap-2 leading-relaxed ${i === currentStep && recordingState === 'recording' ? 'text-primary' : 'text-foreground'}`}
                        >
                          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Collection timer */}
            <div className="p-3 border-b border-border shrink-0">
              <h4 className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">采集计时</h4>
              <div
                className={`text-3xl text-center my-2 ${recordingState === 'recording' ? 'text-destructive' : 'text-foreground'}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatTime(elapsed)}
              </div>
              <div className="text-[10px] text-warning text-center mb-3">最短采集时长 {MIN_DURATION}s</div>
              {recordingState === 'recording' && elapsed > 0 && elapsed < MAX_DURATION && elapsed >= MAX_DURATION - 30 && (
                <div className="text-[10px] text-warning text-center mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  即将达到最大时长 {Math.floor(MAX_DURATION / 60)} 分钟
                </div>
              )}
              {recordingState !== 'recording' ? (
                <>
                  <button
                    onClick={handleRecordClick}
                    disabled={!canStartRecord}
                    className="w-full py-3 rounded-2xl bg-destructive text-white hover:bg-destructive/90 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-destructive flex items-center justify-center gap-2 text-sm font-medium shadow-md"
                    title={
                      controlState !== 'controlling'
                        ? '请先开启遥操控制'
                        : exoskeletonAligning
                          ? '请等待缓动对齐完成'
                          : ''
                    }
                  >
                    <Circle size={11} className="fill-white" strokeWidth={0} />
                    开始采集 (R)
                  </button>
                  {controlState !== 'controlling' && (
                    <div className="text-[10px] text-warning text-center mt-2 flex items-center justify-center gap-1">
                      <TriangleAlert size={10} />
                      请先开启遥操控制
                    </div>
                  )}
                  {exoskeletonAligning && (
                    <div className="text-[10px] text-warning text-center mt-2 flex items-center justify-center gap-1">
                      <TriangleAlert size={10} />
                      缓动对齐中 ({Math.round(easingProgress)}%)，请等待随动就绪
                    </div>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={stopRecord}
                    className="flex-1 min-w-0 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium shadow-sm"
                  >
                    结束采集 (S)
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex-1 min-w-0 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium border border-border"
                  >
                    取消采集 (Esc)
                  </button>
                </div>
              )}
            </div>

            {/* Footer: input source + teleop control */}
            <div className="bg-[#010409] p-3 space-y-3 shrink-0">
              <div>
                <h4 className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">输入源</h4>
                <div className="grid grid-cols-2 gap-2">
                  {sources.map(({ key, label, connected, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setInputSource(key)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-md border transition-all relative ${
                        inputSource === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="text-xs">{label}</span>
                      <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${connected ? 'bg-success' : 'bg-destructive'}`} />
                    </button>
                  ))}
                </div>
                {inputSource && (
                  <div className={`text-[11px] mt-2 flex items-center gap-1.5 px-2 py-1 rounded ${
                    (inputSource === 'exoskeleton' ? cd.exoskeleton : cd.vr)
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {(inputSource === 'exoskeleton' ? cd.exoskeleton : cd.vr)
                      ? <><Check size={11} /> {inputSource === 'exoskeleton' ? '外骨骼' : 'VR'} 连接成功</>
                      : <><TriangleAlert size={11} /> {inputSource === 'exoskeleton' ? '外骨骼' : 'VR'} 未连接</>}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">遥操控制</h4>
                {controlState === 'idle' ? (
                  <button
                    onClick={takeControl}
                    disabled={!inputSource}
                    className="w-full py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium shadow-md animate-pulse-glow"
                  >
                    <Play size={14} fill="currentColor" />
                    开启控制
                  </button>
                ) : (
                  <div className="space-y-2">
                    {inputSource === 'exoskeleton' && teleopMode === 'easing' && (
                      <>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">缓动对齐</span>
                          <span className="text-warning tabular-nums">{easingProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${easingProgress}%` }} />
                        </div>
                      </>
                    )}
                    <button
                      onClick={handleReleaseControl}
                      className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] text-xs font-medium border border-border"
                    >
                      退出控制
                    </button>
                    {((inputSource === 'exoskeleton' && teleopMode === 'follow') || inputSource === 'vr') && (
                      <div className="text-[11px] flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 text-success">
                        <Check size={11} /> 随动模式 · 实时映射中
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-md p-8 text-center shadow-2xl card-depth">
            <LoaderCircle size={32} className="mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm mb-2">系统接管中</p>
            <p className="text-6xl text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{countdown}</p>
          </div>
        </div>
      )}

      {/* Short recording warning */}
      {showWarnShort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <h3 className="mb-3 text-warning">录制时长过短</h3>
            <p className="text-sm text-muted-foreground mb-6">本次录制时长不足 {MIN_DURATION} 秒，建议丢弃或继续录制。</p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => doStop(true)}
                className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] text-sm font-medium border border-border"
              >
                丢弃
              </button>
              <button
                onClick={() => setShowWarnShort(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] text-sm font-medium"
              >
                继续录制
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Long duration warning (5min timeout) */}
      {showWarnLong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border-2 border-warning rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <div className="flex items-center gap-2.5 mb-3 text-warning">
              <TriangleAlert size={20} />
              <h3>采集已超过 {Math.floor(MAX_DURATION / 60)} 分钟，正在自动结束…</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">系统将在 5 秒后自动保存并结束本次录制。</p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => doStop()}
                className="px-5 py-2.5 rounded-xl bg-warning text-warning-foreground hover:bg-warning/90 transition-colors active:scale-[0.98] text-sm font-medium"
              >
                强制结束
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel recording confirmation (3s auto-confirm) */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <h3 className="mb-3 text-warning">确认取消录制？</h3>
            <p className="text-sm text-muted-foreground mb-6">
              取消后本次数据将不保存，{cancelCountdown} 秒后自动确认。
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelCountdown(3) }}
                className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] text-sm font-medium border border-border"
              >
                继续录制
              </button>
              <button
                onClick={() => { doStop(true); setShowCancelConfirm(false); setCancelCountdown(3) }}
                className="px-5 py-2.5 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors active:scale-[0.98] text-sm font-medium"
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
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <h3 className="mb-3">离开确认</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {recordingState === 'recording'
                ? '当前正在录制中，离开将中断采集并释放设备控制。'
                : '当前处于设备控制中，离开将释放控制，设备进入安全停止状态。'}
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={cancelLeave}
                className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] text-sm font-medium border border-border"
              >
                取消
              </button>
              <button
                onClick={confirmLeave}
                className="px-5 py-2.5 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors active:scale-[0.98] text-sm font-medium"
              >
                确认离开
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Need control warning (shown when user presses R or clicks 开始采集 without control) */}
      {showNeedControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <div className="flex items-center gap-2.5 mb-3 text-warning">
              <TriangleAlert size={20} />
              <h3>请先开启遥操控制</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              必须先在下方"遥操控制"区域点击「开启控制」按钮，待设备完成接管后才能开始采集。
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowNeedControl(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] text-sm font-medium"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exoskeleton alignment in progress — block recording until follow */}
      {showWaitingAlign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
            <div className="flex items-center gap-2.5 mb-3 text-warning">
              <LoaderCircle size={20} className="animate-spin" />
              <h3>缓动对齐中</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              外骨骼正在缓动对齐，需进入随动状态后才能开始采集。请等待对齐完成。
            </p>
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-muted-foreground">对齐进度</span>
                <span className="text-warning tabular-nums">{Math.round(easingProgress)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full transition-all"
                  style={{ width: `${easingProgress}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowWaitingAlign(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] text-sm font-medium"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-card border border-border text-sm shadow-2xl card-depth">
          {toast.msg}
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2 pointer-events-none">
        {qcToasts.map((t) => (
          <div
            key={t.id}
            className="px-3.5 py-2 rounded-lg text-sm font-medium shadow-2xl card-depth pointer-events-none"
            style={QC_TOAST_STYLE[t.status] ?? QC_TOAST_STYLE.passed}
          >
            第{t.index}条：{QC_TOAST_LABELS[t.status] ?? t.status}
          </div>
        ))}
      </div>
    </div>
  )
}

function StorageStatusBadge({ storage, onNavigate }) {
  const { usagePct } = storage
  const level = usagePct >= 90 ? 'critical' : usagePct >= 80 ? 'warning' : 'normal'
  const isAlert = level !== 'normal'
  const isCritical = level === 'critical'

  const badgeStyle = {
    normal: {
      color: '#8b949e',
      backgroundColor: 'rgba(33, 38, 45, 0.65)',
      border: '1px solid rgba(240, 246, 252, 0.12)',
    },
    warning: {
      color: '#d29922',
      backgroundColor: 'rgba(210, 153, 34, 0.2)',
      border: '1px solid rgba(210, 153, 34, 0.45)',
    },
    critical: {
      color: '#f85149',
      backgroundColor: 'rgba(248, 81, 73, 0.22)',
      border: '1px solid rgba(248, 81, 73, 0.55)',
      boxShadow: '0 0 0 1px rgba(248, 81, 73, 0.12)',
    },
  }[level]

  const content = (
    <>
      <HardDrive size={12} className="shrink-0" strokeWidth={2.25} />
      <span>存储</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{usagePct.toFixed(0)}%</span>
      {isCritical && <TriangleAlert size={10} className="shrink-0" strokeWidth={2.5} />}
    </>
  )

  const sharedClass = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0'

  if (isAlert) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        title={isCritical ? '存储空间严重不足，点击前往清理异常数据' : '存储空间紧张，点击前往清理异常数据'}
        className={`${sharedClass} transition-opacity hover:opacity-90 active:scale-[0.98]`}
        style={badgeStyle}
      >
        {content}
      </button>
    )
  }

  return (
    <span
      title={`本地存储使用率 ${usagePct.toFixed(0)}%`}
      className={sharedClass}
      style={badgeStyle}
    >
      {content}
    </span>
  )
}

function CameraTile({ cam, recording, large = false }) {
  return (
    <div
      className={`w-full h-full bg-[#0a0d12] flex flex-col items-center justify-center border border-white/5 ${
        large ? '' : 'rounded-md'
      } relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 3px)',
      }} />
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-b ${recording ? 'from-destructive/60' : 'from-primary/40'} to-transparent`} />
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 relative ${recording ? 'bg-destructive/15' : 'bg-secondary/50'}`}>
        <Video size={24} className={recording ? 'text-destructive' : 'text-muted-foreground'} />
      </div>
      <span className="text-muted-foreground text-xs">{cam.label}</span>
      <span className="text-muted-foreground/50 text-[10px] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        30fps · 1280x720
      </span>
    </div>
  )
}

function formatTime(s) {
  const h = Math.floor(s / 3600).toString().padStart(2, '0')
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${h}:${m}:${ss}`
}
