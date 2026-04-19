import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminBackFAB.css';

export default function AdminBackFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Only show if user is admin AND NOT on an admin page
  if (!isAdmin || location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="admin-back-fab-container">
      <div className="admin-back-fab-hint">
        <span>Modo Vista Previa Admin</span>
      </div>
      <button 
        className="admin-back-fab"
        onClick={() => navigate('/admin')}
        aria-label="Volver al panel de administración"
      >
        <div className="admin-back-fab-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        </div>
        <span className="admin-back-fab-text">Volver al Panel</span>
      </button>
    </div>
  );
}
