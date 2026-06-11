import { useApp } from '../state/AppContext.jsx'
import { Hand, Glasses, Play, ArrowRightLeft, TriangleAlert, Check } from 'lucide-react'

export default function TeleopSidePanel() {
  const {
    controlState, teleopMode, inputSource, setInputSource,
    easingProgress, takeControl, releaseControl, switchToFollow,
    connectedDevices, multipleDevicesConnected,
  } = useApp()

  const cd = connectedDevices
  const sources = [
    { key: 'exoskeleton', label: '外骨骼', connected: cd.exoskeleton, Icon: Hand },
    { key: 'vr', label: 'VR', connected: cd.vr, Icon: Glasses },
  ]

  return (
    <div className="w-72 min-w-72 border-l border-border bg-[#0d1117] flex flex-col overflow-y-auto">
      {/* Multiple devices warning */}
      {multipleDevicesConnected && inputSource === null && (
        <div className="m-3 p-3 rounded-lg bg-warning/10 border border-warning/30 flex gap-2">
          <TriangleAlert size={14} className="text-warning shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-warning mb-1">检测到多个手柄设备</p>
            <p className="text-muted-foreground">请在下方选择输入源</p>
          </div>
        </div>
      )}

      {/* Input source */}
      <div className="p-4 border-b border-border">
        <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">输入源</h4>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {sources.map(({ key, label, connected, Icon }) => (
            <button
              key={key}
              onClick={() => setInputSource(key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all relative
                ${inputSource === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'}`}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
              <span
                className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`}
              />
            </button>
          ))}
        </div>
        {inputSource ? (
          <div
            className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${
              (inputSource === 'exoskeleton' ? cd.exoskeleton : cd.vr)
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
            }`}
          >
            {(inputSource === 'exoskeleton' ? cd.exoskeleton : cd.vr)
              ? <><Check size={12} /> {inputSource === 'exoskeleton' ? '外骨骼' : 'VR'} 连接成功</>
              : <><TriangleAlert size={12} /> {inputSource === 'exoskeleton' ? '外骨骼' : 'VR'} 未连接</>}
          </div>
        ) : (
          <div className="text-xs text-warning text-center py-2">请先在下方开启遥操控制</div>
        )}
      </div>

      {/* Teleop control */}
      <div className="p-4 border-b border-border">
        <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">遥操控制</h4>
        {controlState === 'idle' ? (
          <button
            onClick={takeControl}
            disabled={!inputSource}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play size={18} />
            开启控制
          </button>
        ) : (
          <button
            onClick={releaseControl}
            className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          >
            退出控制
          </button>
        )}
      </div>

      {/* Motion mode (only when controlling) */}
      {controlState === 'controlling' && inputSource === 'exoskeleton' && (
        <div className="p-4 border-b border-border">
          <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">运动模式</h4>
          {teleopMode === 'easing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-warning text-xs">
                <TriangleAlert size={12} />
                <span>缓动对齐中，请保持手臂静止</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full transition-all duration-300"
                  style={{ width: `${easingProgress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                对齐进度: {Math.round(easingProgress)}%
              </span>
              <button
                onClick={switchToFollow}
                disabled={easingProgress < 100}
                className="w-full py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ArrowRightLeft size={16} />
                切换随动模式
              </button>
            </div>
          )}
          {teleopMode === 'follow' && (
            <div className="flex items-center gap-2 text-success text-xs p-3 rounded-lg bg-success/10">
              <Check size={14} />
              <span>随动模式 · 实时映射中</span>
            </div>
          )}
        </div>
      )}

      {controlState === 'controlling' && inputSource === 'vr' && (
        <div className="p-4 border-b border-border">
          <h4 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">运动模式</h4>
          <div className="flex items-center gap-2 text-success text-xs p-3 rounded-lg bg-success/10">
            <Check size={14} />
            <span>标准模式 · 实时映射中</span>
          </div>
        </div>
      )}
    </div>
  )
}
