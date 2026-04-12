// src/components/layout/Toast.jsx
import './Toast.css';

export default function Toast({ toasts }) {
  if (!toasts || !toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' && '✓'}
            {t.type === 'error' && '✕'}
            {t.type === 'warning' && '⚠'}
            {t.type === 'order' && '🛍️'}
          </span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
