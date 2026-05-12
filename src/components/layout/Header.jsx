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

  // Mapa de títulos automáticos segun la ruta (Desactivado para Admin ya que usan Hero)
  const getAutoTitle = () => {
    if (isAdminRoute) return ''; // No mostrar títulos en Admin para evitar duplicidad con el Hero
    if (title) return title; 
    
    const path = location.pathname;
    if (path === '/catalog') return 'Catálogo';
    if (path === '/categories') return 'Categorías';
    if (path === '/orders') return 'Mis Pedidos';
    if (path === '/favorites') return 'Mis Favoritos';
    if (path === '/checkout') return 'Confirmar Pedido';
    if (path === '/order-confirm') return '¡Pedido Recibido!';
    
    // Rutas de Admin
    if (path === '/admin') return 'Panel de Control';
    if (path === '/admin/products') return 'Inventario';
    if (path === '/admin/orders') return 'Gestión de Pedidos';
    if (path === '/admin/ingredients') return 'Ingredientes Extra';
    if (path === '/admin/config') return 'Configuración';
    
    return ''; // Home o desconocido (usa logo)
  };

  const currentTitle = getAutoTitle();

  // Mostrar botón atrás en:
  // 1. Admin (todas las páginas excepto el Dashboard principal)
  // 2. Cliente: cuando no es el Home y hay historial o es una página profunda
  const deepClientPaths = ['/catalog', '/categories', '/orders', '/favorites', '/checkout', '/order-confirm'];
  const isDeepPath = deepClientPaths.includes(location.pathname);
  
  const shouldShowBack = showBack || (isAdminRoute && !isDashboard) || (!isAdminRoute && isDeepPath && (hasHistory || !isClientHome));

  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = (e) => {
      let scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      
      // En administración PC el scroll ocurre en .admin-main-content
      if (isAdminRoute) {
        const adminContent = document.querySelector('.admin-main-content');
        if (adminContent) {
          scrollPos = adminContent.scrollTop;
        }
      }

      // Si no es admin o si el evento viene de un contenedor con scroll explícito
      if (e && e.target && e.target !== document) {
        if (typeof e.target.scrollTop === 'number') {
          scrollPos = Math.max(scrollPos, e.target.scrollTop);
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
    boxShadow: scrollOpacity > 0 ? `0 4px 12px rgba(0, 0, 0, ${0.15 * (scrollOpacity / 0.92)})` : 'none',
    borderBottom: scrollOpacity > 0 ? `1px solid rgba(255, 255, 255, ${0.1 * (scrollOpacity / 0.92)})` : 'none',
    backdropFilter: scrollOpacity > 0 ? `blur(${12 * (scrollOpacity / 0.92)}px) saturate(180%)` : 'none',
    WebkitBackdropFilter: scrollOpacity > 0 ? `blur(${12 * (scrollOpacity / 0.92)}px) saturate(180%)` : 'none'
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

      {currentTitle && <h1 className="header-title">{currentTitle}</h1>}

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
