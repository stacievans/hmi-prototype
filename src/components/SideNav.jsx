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
    <nav className="flex flex-col items-center w-16 min-w-16 bg-[#010409] border-r border-border py-4 gap-2 z-50">
      <div className="mb-4 w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(88,166,255,0.25)]">
        <span className="text-primary" style={{ fontSize: 18, fontWeight: 700 }}>H</span>
      </div>
      {NAV.map((n) => {
        const Icon = n.icon
        const active = isActive(n.path)
        return (
          <div key={n.key} className="relative group">
            <button
              onClick={() => onNavigate(n.path)}
              className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all
                ${active
                  ? 'bg-primary/20 text-primary shadow-[0_0_12px_rgba(88,166,255,0.18)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              aria-label={n.label}
            >
              <Icon size={20} />
            </button>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-border">
              {n.label}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
