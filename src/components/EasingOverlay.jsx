import { useApp } from '../state/AppContext.jsx'

export default function EasingOverlay() {
  const { easingProgress, releaseControl } = useApp()
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 pointer-events-auto">
      <div className="bg-card border-2 border-warning rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center animate-pulse-dot">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-warning text-2xl font-semibold">缓动对齐中</h2>
        </div>
        <p className="text-lg text-foreground mb-6 text-center">请保持手臂静止，等待设备就绪</p>
        <div className="space-y-4 mb-8">
          <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-warning rounded-full transition-all duration-300"
              style={{ width: `${easingProgress}%` }}
            />
          </div>
          <div className="text-center text-lg text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            对齐进度: {Math.round(easingProgress)}%
          </div>
        </div>
        <button
          onClick={releaseControl}
          className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium text-lg"
        >
          取消对齐
        </button>
      </div>
    </div>
  )
}
