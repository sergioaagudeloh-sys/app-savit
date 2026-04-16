import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './NotificationFAB.css';

const BellIcon = () => (
  <svg 
    width="24" height="24" 
    viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function NotificationFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { 
    notifications, 
    unreadCount, 
    isOpen, 
    setIsOpen, 
    markAsRead, 
    markAllAsRead,
    clearNotifications
  } = useNotifications();
  
  const [showHistory, setShowHistory] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const panelRef = useRef();

  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const recentNotifs = notifications.filter(n => (now - new Date(n.timestamp).getTime()) < DAY_IN_MS);
  const olderNotifs = notifications.filter(n => (now - new Date(n.timestamp).getTime()) >= DAY_IN_MS);

  // Close panel on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowHistory(false); // Reset history view when closing
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.orderId) {
      if (isAdmin) {
        navigate('/admin/orders');
      } else {
        navigate('/orders');
      }
    } else if (notif.category === 'subscription' && isAdmin) {
      navigate('/admin/subscriptions');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const dateNow = new Date();
    
    // Si es hoy, solo mostrar hora
    if (d.toDateString() === dateNow.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Si no, mostrar fecha corta y hora
    return `${d.getDate()}/${d.getMonth() + 1} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getIcon = (category) => {
    switch (category) {
      case 'order': return '📦';
      case 'subscription': return '🌿';
      case 'promo': return '✨';
      default: return '🔔';
    }
  };

  const displayedNotifs = showHistory ? notifications : notifications.slice(0, 3);
  const hasMore = !showHistory && notifications.length > 3;

  return (
    <div className="notification-fab-container" ref={panelRef}>
      <button 
        className="notification-fab-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir Notificaciones"
      >
        <BellIcon />
        {unreadCount > 0 && <span className="fab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notif-header">
            <h3>Notificaciones</h3>
            <div className="notif-actions">
              <button 
                onClick={markAllAsRead} 
                className="notif-action-btn"
                title="Marcar todas como leídas"
              >
                <span>✓ Todas</span>
              </button>
              {notifications.length > 0 && (
                <button 
                  onClick={() => setShowConfirmModal(true)}
                  className="notif-action-btn clear"
                  title="Vaciar todo"
                >
                  <span>🗑️</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="notif-body">
            {notifications.length === 0 && (
              <div className="notif-empty">
                <div className="empty-icon">🌿</div>
                <h4>Todo al día</h4>
                <p>No tienes notificaciones por ahora</p>
              </div>
            )}

            {displayedNotifs.map((n, idx) => (
              <React.Fragment key={n.id}>
                {showHistory && idx >= 3 && idx === 3 && (
                   <div className="notif-divider">Historial Anterior</div>
                )}
                
                <div 
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="notif-item-icon">
                    {getIcon(n.category)}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-top">
                      <h4>{n.title}</h4>
                      <span className="notif-time">{formatDate(n.timestamp)}</span>
                    </div>
                    <p>{n.message}</p>
                  </div>
                  {!n.read && <div className="unread-dot" />}
                </div>
              </React.Fragment>
            ))}

            {hasMore && (
              <button className="notif-history-toggle" onClick={() => setShowHistory(true)}>
                Ver historial ({notifications.length}) ↓
              </button>
            )}

            {showHistory && (
              <button className="notif-history-toggle less" onClick={() => setShowHistory(false)}>
                Ver menos ↑
              </button>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && createPortal(
        <div className="notif-modal-overlay" onClick={(e) => {
          if (e.target.className === 'notif-modal-overlay') setShowConfirmModal(false);
        }}>
          <div className="notif-modal">
            <div className="notif-modal-icon">🗑️</div>
            <h4>¿VACIAR HISTORIAL?</h4>
            <p>Se borrarán todas tus notificaciones de forma permanente.</p>
            <div className="notif-modal-actions">
              <button className="modal-btn-cancel" onClick={() => setShowConfirmModal(false)}>CONSERVAR</button>
              <button className="modal-btn-delete" onClick={() => {
                clearNotifications();
                setShowConfirmModal(false);
              }}>VACIAR TODO</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

