import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

const ICONS = {
  success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
  error:   <XCircle    size={16} className="text-red-500 shrink-0" />,
  warning: <AlertCircle size={16} className="text-yellow-500 shrink-0" />,
  info:    <Info       size={16} className="text-blue-500 shrink-0" />,
};

const BORDERS = {
  success: 'border-l-green-500',
  error:   'border-l-red-500',
  warning: 'border-l-yellow-500',
  info:    'border-l-blue-500',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // Convenience methods
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error',   dur);
  toast.warning = (msg, dur) => toast(msg, 'warning', dur);
  toast.info    = (msg, dur) => toast(msg, 'info',    dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-6 right-4 z-[9999] flex flex-col gap-3 max-w-[340px] w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 bg-white border border-faint border-l-4 ${BORDERS[t.type]} shadow-lg px-4 py-3.5 pointer-events-auto animate-slide-in`}

          >
            {ICONS[t.type]}
            <p className="text-xs text-body leading-relaxed flex-1 tracking-wide">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-lighter hover:text-muted transition-colors border-none bg-transparent cursor-pointer p-0 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);