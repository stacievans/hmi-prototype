import { TriangleAlert } from 'lucide-react'

export default function LeaveConfirmModal({ mode, onCancel, onConfirm }) {
  const isRec = mode === 'recording'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-2xl card-depth">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-warning/15 flex items-center justify-center">
            <TriangleAlert className="text-warning" size={20} />
          </div>
          <h3 className="text-foreground">安全确认</h3>
        </div>
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          {isRec
            ? '当前正在录制中，离开将自动停止录制并释放设备控制。'
            : '当前处于设备控制中，离开将自动释放控制，设备进入安全停止状态。'}
        </p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] transition-colors text-sm font-medium border border-border"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98] transition-colors text-sm font-medium"
          >
            确认离开
          </button>
        </div>
      </div>
    </div>
  )
}
