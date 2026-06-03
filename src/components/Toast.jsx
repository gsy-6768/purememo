import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 2500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 animate-slide-up ${
              t.type === 'success' ? 'bg-success-500 text-white' :
              t.type === 'error' ? 'bg-danger-500 text-white' :
              'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
