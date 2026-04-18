// src/components/layout/AdminSidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../../firebase';
import { collection, query, where } from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';
import './AdminSidebar.css';

const IconDashboard = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const IconOrders = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconInventory = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconOffers = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9 9h.01M15 15h.01M16 8L8 16"/>
  </svg>
);

const IconConfig = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const IconLogout = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconStore = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconIngredients = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const IconFinance = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);



const navItems = [
  { to: '/admin',             label: 'Dashboard',   icon: IconDashboard,  end: true },
  { to: '/admin/orders',      label: 'Pedidos',     icon: IconOrders,     end: false },
  { to: '/admin/products',    label: 'Inventario',  icon: IconInventory,  end: false },
  { to: '/admin/ingredients', label: 'Ingredientes',icon: IconIngredients,end: false },
  { to: '/admin/offers',      label: 'Ofertas',     icon: IconOffers,     end: false },
  { to: '/admin/subscriptions',label: 'Pagos Fijos', icon: IconFinance,    end: false },
  { to: '/admin/config',      label: 'Ajustes',     icon: IconConfig,     end: false },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const isInitialLoad = useRef(true);
  const lastProcessedId = useRef(null);

  // Global Notification Listener: Handled by NotificationContext
  // (We removed the redundant manual listener to avoid duplicate toasts)

  const handleLogout = async () => {
    try { await signOut(auth); } catch (_) { /* ignore */ }
    localStorage.removeItem('savit_admin_auth');
    navigate('/');
  };

  const goToStore = () => navigate('/home');

  return (
    <aside className="admin-sidebar" aria-label="Navegación administrativa">
      {/* Brand */}
      <div className="admin-sidebar-brand">
        <img src="/logo.png" alt="Sávit logo" className="admin-sidebar-logo" />
        <div>
          <div className="admin-sidebar-brand-name">Sávit</div>
          <div className="admin-sidebar-brand-sub">Panel Admin</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `admin-sidebar-item${isActive ? ' active' : ''}`
            }
          >
            <span className="admin-sidebar-icon">{item.icon}</span>
            <span className="admin-sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="admin-sidebar-footer">
        <button className="admin-sidebar-store-btn" onClick={goToStore}>
          {IconStore}
          <span>Ver Tienda</span>
        </button>
        <button className="admin-sidebar-logout" onClick={handleLogout}>
          {IconLogout}
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
