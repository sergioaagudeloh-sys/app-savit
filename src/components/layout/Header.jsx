import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { useStoreConfig } from '../../hooks/useOrders';
import NotificationFAB from '../ui/NotificationFAB';
import CartBadge from '../ui/CartBadge';
import CustomerWizard from '../ui/CustomerWizard';
import './Header.css';

export default function Header({ showBack, title, onCartOpen, heroRgb = '26, 58, 28' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, addCount, totalPrice } = useCart();
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
  const isClientHome = location.pathname === '/' || location.pathname === '/home' || location.pathname === '/client';
  const hasHistory = window.history.state && window.history.state.idx > 0;

  // Mostrar botón atrás en:
  // 1. Admin (todas las páginas excepto el Dashboard principal)
  // 2. Cliente: sólo cuando hay historial y NO está en el Home
  const shouldShowBack = showBack || (isAdminRoute && !isDashboard) || (!isAdminRoute && hasHistory && !isClientHome);

  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = (e) => {
      // Intentamos detectar el scroll de window
      let scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      
      // Detectamos scroll de contenedores internos (PWA / div con overflow)
      if (e && e.target) {
        if (typeof e.target.scrollTop === 'number') {
          scrollPos = Math.max(scrollPos, e.target.scrollTop);
        } else if (e.target.scrollingElement && typeof e.target.scrollingElement.scrollTop === 'number') {
          scrollPos = Math.max(scrollPos, e.target.scrollingElement.scrollTop);
        }
      }
      
      // Calcular la opacidad gradualmente
      // Limitamos la opacidad a 0.92 para conservar el efecto cristal traslúcido
      const maxScroll = 60;
      const maxOpacity = 0.92; 
      const opacity = Math.min(Math.max((scrollPos / maxScroll) * maxOpacity, 0), maxOpacity);
      setScrollOpacity(opacity);
      setIsScrolled(scrollPos > 10);
    };

    // Escuchamos en window y en modo captura para atrapar scrolls internos
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Captura = true es clave para detectar scroll en divs que no burbujean hacia el window
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    
    // Ejecutamos una vez al inicio
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const isOrderConfirm = location.pathname === '/order-confirm';

  // Usamos el heroRgb para adaptarse dinámicamente al color del banner subyacente
  const headerOpacityStyle = {
    backgroundColor: `rgba(${heroRgb}, ${scrollOpacity})`,
    boxShadow: scrollOpacity > 0 ? `0 4px 12px rgba(0, 0, 0, ${0.2 * Math.min(scrollOpacity, 1)})` : 'none',
    borderBottom: scrollOpacity > 0 ? `1px solid rgba(255, 255, 255, ${0.05 * Math.min(scrollOpacity, 1)})` : 'none'
  };

  return (
    <header 
      className={`header ${isScrolled ? 'header-scrolled' : ''} ${isOrderConfirm ? 'header-dark-icons' : ''}`}
      style={headerOpacityStyle}
    >
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

        {isAdminRoute && (
          <Link 
            to="/admin/config" 
            className={`header-store-status ${config?.isOpen !== false ? 'open' : 'closed'}`}
          >
            <span className="status-dot"></span>
            <span className="status-text">{config?.isOpen !== false ? 'Abierta' : 'Cerrada'}</span>
          </Link>
        )}

        <NotificationFAB />
        
        {onCartOpen && (
          <button
            id="cart-btn-header"
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
