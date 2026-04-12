// src/components/ui/ToastContainer.jsx
import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import './Toast.css';

const IconInfo = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconSuccess = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconWarning = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconError = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;

const icons = {
  info: IconInfo,
  success: IconSuccess,
  warning: IconWarning,
  danger: IconError,
  error: IconError
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast-item toast-${toast.type || 'info'} ${toast.isExiting ? 'exit' : ''}`}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-icon">
            {icons[toast.type] || IconInfo}
          </div>
          <div className="toast-content">
            {toast.title && <div className="toast-title">{toast.title}</div>}
            <div className="toast-message">{toast.message}</div>
          </div>
          <div 
            className="toast-progress" 
            style={{ animationDuration: `${toast.duration || 5000}ms` }} 
          />
        </div>
      ))}
    </div>
  );
}
