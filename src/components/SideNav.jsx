import { Joystick, ClipboardList, Cpu, Settings } from 'lucide-react'

const NAV = [
  { path: '/', icon: Joystick, label: '遥操', key: 'teleop' },
  { path: '/collection', icon: ClipboardList, label: '采集', key: 'collection' },
  { path: '/devices', icon: Cpu, label: '设备', key: 'devices' },
  { path: '/settings', icon: Settings, label: '设置', key: 'settings' },
]

export default function SideNav({ currentPath, onNavigate }) {
  const isActive = (p) => p === '/' ? currentPath === '/' : currentPath.startsWith(p)
  return (
    <nav className="flex flex-col w-[200px] min-w-[200px] bg-[#010409] border-r border-border py-6 z-50">
      <div className="mb-8 px-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(88,166,255,0.25)] shrink-0">
          <span className="text-primary" style={{ fontSize: 16, fontWeight: 700 }}>H</span>
        </div>
        <span className="text-sm font-semibold tracking-wide text-foreground">Web HMI</span>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
        {NAV.map((n) => {
          const Icon = n.icon
          const active = isActive(n.path)
          return (
            <button
              key={n.key}
              onClick={() => onNavigate(n.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                ${active
                  ? 'bg-primary/15 text-primary shadow-[inset_2px_0_0_rgba(88,166,255,1)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
              aria-label={n.label}
            >
              <Icon size={18} className={active ? "opacity-100" : "opacity-70"} />
              {n.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
