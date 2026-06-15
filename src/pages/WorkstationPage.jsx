import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import {
  ArrowLeft, Play, LoaderCircle, ChevronDown, ChevronRight,
  Hand, Glasses, Check, TriangleAlert, Video, Maximize2, Eye, EyeOff, Circle,
} from 'lucide-react'
import GripperTimeDock from '../components/charts/GripperTimeDock.jsx'

const MIN_DURATION = 3
const MAX_DURATION = 300   // 5 minutes

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
    exportRecordingCSV, setTasks,
    connectedDevices, easingProgress,
    setRecordingDisplayState, setPaused,
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
  const [showNeedControl, setShowNeedControl] = useState(false)
  const [toast, setToast] = useState(null)
  const [showTaskDetails, setShowTaskDetails] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [enabledCams, setEnabledCams] = useState({ head: true, chest: true, left: true, right: true })
  const [fullscreenCam, setFullscreenCam] = useState(null)

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
    setRecordingDisplayState('live')
    setPaused(false)
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
    setRecordingDisplayState('frozen')  // 切换到 frozen：曲线冻结在最后 10s
    setPaused(true)                     // 暂停仿真器，history 不再增长
    setElapsed(0)
    setShowWarnShort(false)
    setShowWarnLong(false)
    setCurrentStep(0)
  }

  const handleRecordClick = () => {
    if (recordingState === 'recording') { stopRecord(); return }
    // 必须先完成遥操控制才能采集
    if (controlState !== 'controlling') {
      setShowNeedControl(true)
      return
    }
    // 已开启控制但 exoskeleton 还在缓动对齐时，给 3s 倒计时
    if (inputSource === 'exoskeleton' && teleopMode !== 'follow') {
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
  const enabledList = CAMS.filter((c) => enabledCams[c.id])
  const fsCam = fullscreenCam ? CAMS.find((c) => c.id === fullscreenCam) : null

  return (
    <div className={`flex flex-col h-full overflow-hidden ${recordingState === 'recording' ? 'ring-4 ring-inset ring-destructive/60' : ''}`}>
      <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">
        {/* Header strip */}
        <div className="flex items-center justify-between shrink-0 px-1">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors rounded-md px-2.5 py-1 -ml-2 hover:bg-secondary"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <div className="flex items-center gap-3">
            {recordingState === 'recording' && (
              <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />
                REC
              </div>
            )}
            <span className="text-sm font-medium">{task.name}</span>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{task.taskId}</span>
          </div>
        </div>

        {/* Main row: cameras (2/3) + side panel (1/3) */}
        <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
          {/* Camera area: 2x2 grid, fills 2/3 width */}
          <div className="col-span-2 rounded-md border border-border bg-[#0a0d12] relative overflow-hidden flex flex-col">
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
            <div className="flex-1 p-1.5 pt-12">
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

          {/* Right side panel: progress / task details / collection timer / input source / teleop */}
          <div className="rounded-md border border-border bg-[#0d1117] overflow-y-auto flex flex-col">
            {/* Current progress */}
            <div className="p-3 border-b border-border">
              <h4 className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">当前进度</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ep.toString().padStart(2, '0')}</span>
                <span className="text-xs text-muted-foreground">/ {task.totalItems}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${epPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>EP {ep.toString().padStart(4, '0')}</span>
                <span>{epPct.toFixed(0)}%</span>
              </div>
            </div>

            {/* Task details (collapsible) */}
            <div className="border-b border-border">
              <button
                onClick={() => setShowTaskDetails((v) => !v)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
              >
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider">任务详情</h4>
                {showTaskDetails ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
              </button>
              {showTaskDetails && (
                <div className="px-3 pb-3 text-xs space-y-2.5">
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
            <div className="p-3 border-b border-border">
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
                    disabled={controlState !== 'controlling'}
                    className="w-full py-3 rounded-2xl bg-destructive text-white hover:bg-destructive/90 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-destructive flex items-center justify-center gap-2 text-sm font-medium shadow-md"
                    title={controlState !== 'controlling' ? '请先开启遥操控制' : ''}
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
                </>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={stopRecord}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium shadow-sm"
                  >
                    结束采集 (S)
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs font-medium border border-border"
                  >
                    取消采集 (Esc)
                  </button>
                </div>
              )}
            </div>

            {/* Footer: input source + teleop control */}
            <div className="bg-[#010409] mt-auto p-3 space-y-3">
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
                      onClick={releaseControl}
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

        {/* Gripper + force curves dock with scrubber (fixed 10s window) */}
        <div className="shrink-0">
          <GripperTimeDock />
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
                ? '当前正在录制中，离开将自动停止录制并释放设备控制。'
                : '当前处于设备控制中，离开将自动释放控制，设备进入安全停止状态。'}
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowLeaveConfirm(false)}
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-card border border-border text-sm shadow-2xl card-depth">
          {toast.msg}
        </div>
      )}
    </div>
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
