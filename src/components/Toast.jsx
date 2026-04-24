import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, toast.duration - 400);

    return () => clearTimeout(exitTimer);
  }, [toast.duration]);

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`toast toast-${toast.type} ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <span className="toast-icon">{icons[toast.type] || icons.info}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>✕</button>
    </div>
  );
}
