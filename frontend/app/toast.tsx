'use client'
import React from 'react'

type Toast = { id: number; message: string; type?: 'info'|'success'|'error' }

const ToastContext = React.createContext<{ push: (t: Omit<Toast,'id'>) => void }|null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const push = React.useCallback((t: Omit<Toast,'id'>) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, ...t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', top: 72, right: 16, display: 'grid', gap: 8, zIndex: 50 }}>
        {toasts.map(t => (
          <div key={t.id} className="card" style={{ borderColor: t.type === 'error' ? '#fecaca' : t.type === 'success' ? '#86efac' : '#e5e7eb', background: t.type === 'error' ? '#fef2f2' : t.type === 'success' ? '#f0fdf4' : 'white' }}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}


