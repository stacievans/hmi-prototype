import { useState } from 'react'
import { Eye, EyeOff, Maximize2, Video } from 'lucide-react'

const INITIAL = [
  { id: 'head', label: '头部相机', enabled: true },
  { id: 'chest', label: '胸部相机', enabled: true },
  { id: 'left', label: '左手相机', enabled: true },
  { id: 'right', label: '右手相机', enabled: true },
]

function CameraTile({ label, large = false }) {
  return (
    <div
      className={`w-full h-full bg-[#0a0d12] flex flex-col items-center justify-center border border-white/5
        ${large ? '' : 'rounded'} relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 3px)',
      }} />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-b from-primary/40 to-transparent" />
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-2 relative">
        <Video size={24} className="text-muted-foreground" />
      </div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-muted-foreground/50 text-xs mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        30fps · 1280x720
      </span>
    </div>
  )
}

export default function CameraGrid() {
  const [cams, setCams] = useState(INITIAL)
  const [fullscreenId, setFullscreenId] = useState(null)
  const toggle = (id) => setCams((c) => c.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x))
  const enabled = cams.filter((c) => c.enabled)
  const fsCam = fullscreenId ? cams.find((c) => c.id === fullscreenId && c.enabled) : null

  return (
    <div className="flex-1 relative rounded-lg overflow-hidden bg-[#0d1117]">
      <div className="absolute top-3 left-3 z-10 flex gap-1">
        {cams.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors
              ${c.enabled ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-secondary/80 text-muted-foreground hover:text-foreground'}`}
          >
            {c.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
            {c.label}
          </button>
        ))}
      </div>

      {fsCam ? (
        <div className="w-full h-full relative">
          <CameraTile label={fsCam.label} large />
          <button
              onClick={onExitFullscreen}
              className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-secondary/80 text-foreground text-xs hover:bg-secondary transition-colors border border-border"
            >
              退出全屏
            </button>
        </div>
      ) : (
        <div className={`w-full h-full grid gap-1 p-1 ${enabled.length <= 1 ? 'grid-cols-1' : enabled.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
          {enabled.map((c) => (
            <div key={c.id} className="relative group rounded overflow-hidden">
              <CameraTile label={c.label} />
              <button
                onClick={() => setFullscreenId(c.id)}
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/50 text-white"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          ))}
          {enabled.length === 0 && (
            <div className="col-span-2 row-span-2 flex items-center justify-center text-muted-foreground">
              所有相机已关闭
            </div>
          )}
        </div>
      )}
    </div>
  )
}
