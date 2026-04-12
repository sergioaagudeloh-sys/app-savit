import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { useStoreConfig } from '../../hooks/useOrders';
import NotificationFAB from '../ui/NotificationFAB';
import CartBadge from '../ui/CartBadge';
import CustomerWizard from '../ui/CustomerWizard';
import './Header.css';

export default function Header({ showBack, title, onCartOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, addCount } = useCart();
  const { customer, isIdentified } = useCustomer();
  const { config } = useStoreConfig();
  const [cartBounce, setCartBounce] = useState(false);
  const isAdminAuth = localStorage.getItem('savit_admin_auth') === 'true';
  const isClientView = !location.pathname.startsWith('/admin');

  useEffect(() => {
    if (addCount === 0) return;
    setCartBounce(true);
    const t = setTimeout(() => setCartBounce(false), 650);
    return () => clearTimeout(t);
  }, [addCount]);

  const handleBack = useCallback(() => {
    const historyState = window.history.state;
    if (historyState && historyState.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isDashboard = location.pathname === '/admin';
  const shouldShowBack = showBack || (isAdminRoute && !isDashboard);

  return (
    <header className="header">
      <div className="header-left">
        {shouldShowBack ? (
          <button className="btn-icon header-back" onClick={handleBack} aria-label="Volver">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        ) : (
          <div className="header-brand">
            <div className="header-logo">
              <img src="/logo.png" alt="Savit" />
            </div>
            <div>
              <div className="header-store-name">Savit</div>
            </div>
          </div>
        )}
      </div>

      {title && <h1 className="header-title">{title}</h1>}

      <div className="header-right">
        {isAdminAuth && isClientView && (
          <button
            className="btn-icon header-cart"
            onClick={() => navigate('/admin')}
            aria-label="Panel Admin"
            style={{ marginRight: '4px', background: 'rgba(255, 193, 7, 0.2)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC107" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </button>
        )}

        {isIdentified && config?.pointsConfig?.enabled && (
           <div className="header-points-badge animate-fade-in" onClick={() => navigate('/rewards')}>
             <span className="points-icon">✨</span>
             <span className="points-value">{customer.savitPoints || 0}</span>
           </div>
        )}

        <NotificationFAB />
        
        {onCartOpen && (
          <button
            className={`btn-icon header-cart${cartBounce ? ' cart-bounce' : ''}`}
            onClick={onCartOpen}
            aria-label="Carrito"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <CartBadge count={totalItems} />
          </button>
        )}
      </div>
    </header>
  );
}
