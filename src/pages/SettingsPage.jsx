import { Info } from 'lucide-react'

const ITEMS = [
  { label: '系统版本', value: 'v1.5.2' },
  { label: '前端服务版本', value: 'v3.2.1' },
  { label: '后端服务版本', value: 'v2.8.0' },
  { label: 'Build', value: '20260402-b9k2d8' },
  { label: '版权', value: '© 2026 RoboTech Inc.' },
]

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
      <section className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Info size={18} className="text-primary" />
          <h3>系统版本与关于</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {ITEMS.map((it) => (
            <div key={it.label}>
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{it.value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
