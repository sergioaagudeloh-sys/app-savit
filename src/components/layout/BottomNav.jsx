import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useCart } from '../../context/CartContext';
import CustomerWizard from '../ui/CustomerWizard';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import './BottomNav.css';

const IconHome = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconCategories = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
const IconCart = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.97-1.67L23 6H6"/></svg>;
const IconProfile = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconBox = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const IconStore = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>;
const IconPromo = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const IconHeart = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;

export default function BottomNav() {
  const { setCartOpen } = useCart();
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const navigate = useNavigate();
  
  const clientNav = [
    { to: '/home',      label: 'Inicio',     icon: IconHome },
    { to: '/catalog',   label: 'Catálogo',   icon: IconCategories },
    { to: '/favorites', label: 'Favoritos',  icon: IconHeart },
    { to: '/orders',    label: 'Pedidos',    icon: IconBox },
    { to: '#profile',   label: 'Perfil',     icon: IconProfile },
  ];

  const adminNav = [
    { to: '/admin', label: 'Inicio', icon: IconHome },
    { to: '/admin/orders', label: 'Pedidos', icon: IconBox },
    { to: '/admin/products', label: 'Inventario', icon: IconCategories },
    { to: '#adminmenu', label: 'Menú', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> },
  ];

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const navItems = isAdmin ? adminNav : clientNav;

  // Lock scroll for either the admin menu or the customer profile wizard
  useBodyScrollLock(showAdminMenu || showProfile);
  return (
    <>
      {showProfile && <CustomerWizard onClose={() => setShowProfile(false)} />}
      
      {/* Admin Mobile Menu Drawer */}
      {showAdminMenu && (
        <div className="admin-menu-overlay" onClick={() => setShowAdminMenu(false)}>
          <div className="admin-menu-drawer" onClick={e => e.stopPropagation()}>
            <div className="admin-menu-header">
              <h3>Menú de Administración</h3>
              <button className="admin-menu-close" onClick={() => setShowAdminMenu(false)}>✕</button>
            </div>
            <div className="admin-menu-grid">
              <button className="admin-menu-btn" onClick={() => { navigate('/admin/offers'); setShowAdminMenu(false); }}>
                <span className="admin-menu-icon">{IconPromo}</span>
                <span>Ofertas</span>
              </button>
              <button className="admin-menu-btn" onClick={() => { navigate('/admin/awards'); setShowAdminMenu(false); }}>
                <span className="admin-menu-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </span>
                <span>Premios</span>
              </button>
              <button className="admin-menu-btn" onClick={() => { navigate('/admin/ingredients'); setShowAdminMenu(false); }}>
                 <span className="admin-menu-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                 </span>
                 <span>Ingredientes</span>
              </button>
              <button className="admin-menu-btn" onClick={() => { navigate('/admin/subscriptions'); setShowAdminMenu(false); }}>
                 <span className="admin-menu-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                 </span>
                 <span>Pagos Fijos</span>
              </button>
              <button className="admin-menu-btn" onClick={() => { navigate('/admin/config'); setShowAdminMenu(false); }}>
                <span className="admin-menu-icon">{IconProfile}</span>
                <span>Ajustes</span>
              </button>
              <button className="admin-menu-btn store" onClick={() => { navigate('/home'); setShowAdminMenu(false); }}>
                <span className="admin-menu-icon">{IconStore}</span>
                <span>Ver Tienda</span>
              </button>
              <button className="admin-menu-btn logout" onClick={async () => {
                try { await signOut(auth); } catch (_) { }
                localStorage.removeItem('savit_admin_auth');
                navigate('/');
                setShowAdminMenu(false);
              }}>
                <span className="admin-menu-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {navItems.map(item => {
          if (item.to === '/drawer') {
            return (
              <div 
                key="drawer" 
                className="bottom-nav-item" 
                onClick={() => setCartOpen(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="bottom-nav-icon">{item.icon}</div>
                <span className="bottom-nav-label">{item.label}</span>
              </div>
            );
          }

          if (item.to === '#adminmenu') {
            return (
              <div 
                key="adminmenu" 
                className={`bottom-nav-item ${showAdminMenu ? 'active' : ''}`} 
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                style={{ cursor: 'pointer' }}
              >
                <div className="bottom-nav-icon">{item.icon}</div>
                <span className="bottom-nav-label">{item.label}</span>
              </div>
            );
          }

          if (item.to === '#profile') {
            return (
              <div 
                key="profile" 
                className={`bottom-nav-item ${showProfile ? 'active' : ''}`} 
                onClick={() => setShowProfile(!showProfile)}
                style={{ cursor: 'pointer' }}
              >
                <div className="bottom-nav-icon">{item.icon}</div>
                <span className="bottom-nav-label">{item.label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={['/', '/admin', '/home', '/catalog', '/admin/config'].includes(item.to)}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="bottom-nav-icon">{item.icon}</div>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
