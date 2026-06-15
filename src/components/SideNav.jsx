import { Joystick, ClipboardList, Cpu, Plug, Settings as SettingsIcon } from 'lucide-react'
import logoUrl from '../assets/智平方logo.svg'

const NAV = [
  { path: '/', icon: Plug, label: '连接', key: 'connect' },
  { path: '/teleop', icon: Joystick, label: '链接', key: 'link' },
  { path: '/collection', icon: ClipboardList, label: '采集', key: 'collection' },
  { path: '/devices', icon: Cpu, label: '设备', key: 'devices' },
  { path: '/settings', icon: SettingsIcon, label: '设置', key: 'settings' },
]

export default function SideNav({ currentPath, onNavigate }) {
  const isActive = (p) => p === '/' ? currentPath === '/' : currentPath.startsWith(p)
  return (
    <nav className="flex flex-col w-16 min-w-16 bg-[#010409] border-r border-border py-5 z-50">
      <div className="mb-6 w-9 h-9 mx-auto rounded-md bg-card flex items-center justify-center p-1.5 card-depth">
        <img src={logoUrl} alt="智平方" className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-col items-center gap-1">
        {NAV.map((n) => {
          const Icon = n.icon
          const active = isActive(n.path)
          return (
            <div key={n.key} className="relative group">
              <button
                onClick={() => onNavigate(n.path)}
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors
                  ${active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                aria-label={n.label}
              >
                <Icon size={18} strokeWidth={1.75} />
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />}
              </button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-popover text-popover-foreground rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-border card-depth">
                {n.label}
              </div>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
