import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppContext.jsx'
import { LogIn, LogOut, Search, ChevronLeft, ChevronRight, X, ClipboardList } from 'lucide-react'

const STATUS_MAP = {
  pending: { text: '待执行', color: 'bg-warning/20 text-warning' },
  in_progress: { text: '进行中', color: 'bg-primary/20 text-primary' },
  completed: { text: '已完成', color: 'bg-success/20 text-success' },
}

export default function CollectionPage() {
  const { isLoggedIn, userName, login, logout, tasks } = useApp()
  const nav = useNavigate()
  const [showLogin, setShowLogin] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({ username: '', password: '' })
  const pageSize = 6

  const filtered = tasks.filter((t) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return t.name.toLowerCase().includes(q) || t.taskId.toLowerCase().includes(q)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const list = filtered.slice((page - 1) * pageSize, page * pageSize)

  const onLogin = (e) => {
    e.preventDefault()
    if (form.username) { login(form.username); setShowLogin(false) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardList size={18} className="text-primary" />
            <h2>采集任务</h2>
            <span className="text-xs text-muted-foreground">· 共 {tasks.length} 项</span>
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>已连接云平台 · {userName}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-secondary hover:text-foreground transition-colors"
              >
                <LogOut size={12} /> 退出登录
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-colors text-sm font-medium shadow-md"
            >
              <LogIn size={15} />
              登录云平台
            </button>
          )}
        </div>

        {isLoggedIn ? (
          <>
            <div className="flex items-center justify-end gap-2 px-6 py-3 shrink-0">
              <div className="flex items-center gap-1.5 w-64">
                <Search size={14} className="text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="w-full px-2.5 py-1.5 rounded-md bg-secondary border border-border text-foreground text-xs focus:border-primary focus:outline-none"
                  placeholder="搜索任务名或任务ID..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
              {list.length === 0 && (
                <div className="text-center text-muted-foreground py-12">暂无任务</div>
              )}
              {list.map((t) => {
                const s = STATUS_MAP[t.status] || { text: t.status, color: 'bg-secondary text-muted-foreground' }
                const pct = t.totalItems > 0 ? (t.completedItems / t.totalItems) * 100 : 0
                return (
                  <div
                    key={t.id}
                    onClick={() => nav(`/collection/task/${t.id}`)}
                    className="p-4 rounded-md bg-card border border-border hover:border-primary/30 transition-all cursor-pointer group card-depth"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-foreground group-hover:text-primary transition-colors">{t.name}</h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.text}</span>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {t.completedItems}/{t.totalItems}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  共 {filtered.length} 条，第 {page}/{totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium border border-border"
                  >
                    <ChevronLeft size={14} /> 上一页
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium border border-border"
                  >
                    下一页 <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-base text-foreground mb-6">请先登录云平台以查看采集任务</h3>
              <button
                onClick={() => setShowLogin(true)}
                className="px-7 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-colors font-medium inline-flex items-center gap-2 shadow-md"
              >
                <LogIn size={16} />
                登录
              </button>
            </div>
          </div>
        )}
      </div>

      {showLogin && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowLogin(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-80 z-50 bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3>登录云平台</h3>
              <button onClick={() => setShowLogin(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={onLogin} className="p-4 space-y-4 flex-1">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">用户名</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-input-background border border-border text-foreground focus:border-primary focus:outline-none"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">密码</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-input-background border border-border text-foreground focus:border-primary focus:outline-none"
                  placeholder="请输入密码"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] font-medium shadow-md"
              >
                登录
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
