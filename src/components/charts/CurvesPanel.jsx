import { useEffect, useState } from 'react'
import { Pause, Play, Download, Trash2, LineChart as LineIcon, RotateCcw, Square } from 'lucide-react'
import { useApp } from '../../state/AppContext.jsx'
import { JointAnglesChart, SixDForceChart, GripperChart } from './CurveCards.jsx'

export default function CurvesPanel({ onCSV }) {
  const { paused, setPaused, exportRecordingCSV, clearRecordingBuffer, recordingState, recordingBufferSize, startReplay, stopReplay } = useApp()
  const [bufferLen, setBufferLen] = useState(0)
  const [hidden, setHidden] = useState(false)

  // Poll buffer length while recording
  useEffect(() => {
    if (recordingState === 'replaying') return
    const t = setInterval(() => setBufferLen(recordingBufferSize()), 500)
    return () => clearInterval(t)
  }, [recordingState, recordingBufferSize])

  const handleExport = () => {
    const csv = exportRecordingCSV()
    if (onCSV) onCSV(csv)
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <LineIcon size={14} className="text-primary" />
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider">实时数据曲线</h4>
          {recordingState === 'recording' && (
            <span className="ml-2 flex items-center gap-1.5 text-[10px] text-destructive">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-dot" />
              正在采集 ({bufferLen} 帧)
            </span>
          )}
          {recordingState === 'replaying' && (
            <span className="ml-2 flex items-center gap-1.5 text-[10px] text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              本地回放中
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {recordingState === 'replaying' ? (
            <button
              onClick={stopReplay}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-success hover:bg-success/10 transition-colors"
            >
              <Square size={12} />
              停止回放
            </button>
          ) : (
            <button
              onClick={startReplay}
              disabled={!bufferLen || recordingState === 'recording'}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="回放最新录制的数据"
            >
              <RotateCcw size={12} />
              回放
            </button>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={paused ? '继续' : '暂停'}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? '继续' : '冻结'}
          </button>
          <button
            onClick={handleExport}
            disabled={!bufferLen && recordingState !== 'recording'}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="导出本次录制 CSV"
          >
            <Download size={12} />
            导出 CSV
          </button>
          <button
            onClick={() => { clearRecordingBuffer(); setBufferLen(0) }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="清空录制缓冲"
          >
            <Trash2 size={12} />
            清空
          </button>
          <button
            onClick={() => setHidden((h) => !h)}
            className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {hidden ? '展开' : '收起'}
          </button>
        </div>
      </div>
      {!hidden && (
        <div className="grid grid-cols-3 gap-2 p-2">
          <JointAnglesChart compact />
          <SixDForceChart compact />
          <GripperChart compact />
        </div>
      )}
    </div>
  )
}
