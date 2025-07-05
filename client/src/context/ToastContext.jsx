import React from 'react';
import { createContext, useContext, useCallback, useState } from 'react';
import Toast from '../components/common/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type, title, message, duration, position }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((currentToasts) => [
      ...currentToasts,
      { id, type, title, message, duration, position }
    ]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 5000,
      position = 'top-right'
    }) => {
      return addToast({ type, title, message, duration, position });
    },
    [addToast]
  );

  // Convenience methods for different toast types
  const success = useCallback(
    (title, message, options = {}) =>
      showToast({ type: 'success', title, message, ...options }),
    [showToast]
  );

  const error = useCallback(
    (title, message, options = {}) =>
      showToast({ type: 'error', title, message, ...options }),
    [showToast]
  );

  const warning = useCallback(
    (title, message, options = {}) =>
      showToast({ type: 'warning', title, message, ...options }),
    [showToast]
  );

  const info = useCallback(
    (title, message, options = {}) =>
      showToast({ type: 'info', title, message, ...options }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ showToast, success, error, warning, info, removeToast }}
    >
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          show={true}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          position={toast.position}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}