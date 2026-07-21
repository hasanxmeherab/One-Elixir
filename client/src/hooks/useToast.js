import { useState, useCallback } from 'react';

let _toastId = 0;

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration + 400); // extra 400ms for exit animation
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => push(msg, 'success', duration),
    error:   (msg, duration) => push(msg, 'error',   duration || 5000),
    info:    (msg, duration) => push(msg, 'info',    duration),
    warning: (msg, duration) => push(msg, 'warning', duration),
  };

  return { toasts, toast, dismiss };
};

export default useToast;
