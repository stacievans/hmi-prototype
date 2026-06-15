import { useApp } from '../state/AppContext.jsx'
import { AlertTriangle, X } from 'lucide-react'

export default function EasingOverlay() {
  const { easingProgress, releaseControl } = useApp()
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 pointer-events-auto">
      <div className="bg-card border border-border rounded-md p-6 max-w-md w-full mx-4 shadow-2xl card-depth">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-md bg-warning/15 flex items-center justify-center">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <div>
            <h2 className="text-warning text-lg font-semibold">缓动对齐中</h2>
            <p className="text-xs text-muted-foreground">请保持手臂静止，等待设备就绪</p>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <div className="w-full h-2 rounded-md bg-secondary overflow-hidden">
            <div
              className="h-full bg-warning rounded-md transition-all duration-300"
              style={{ width: `${easingProgress}%` }}
            />
          </div>
          <div className="text-center text-xs text-muted-foreground font-mono">
            对齐进度 {Math.round(easingProgress)}%
          </div>
        </div>
        <button
          onClick={releaseControl}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-warning text-warning-foreground transition-all hover:bg-warning/90 active:scale-[0.98] font-medium text-sm"
        >
          <X size={14} />
          取消对齐
        </button>
      </div>
    </div>
  )
}
