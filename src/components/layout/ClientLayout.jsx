import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import Mascot from '../ui/Mascot';
import BottomNav from './BottomNav';
import Header from './Header';

const CLIENT_TABS = ['/home', '/catalog', '/favorites', '/orders'];

/**
 * ClientLayout
 * Wrapper para todas las páginas del cliente que asegura la presencia
 * global y persistente de Sávit IA (la ardilla) y la navegación inferior.
 */
export default function ClientLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCartOpen } = useCart();

  // Mapeo dinámico de rutas a contextos de conversación para la IA
  const pageType = useMemo(() => {
    const path = location.pathname;
    if (path === '/home') return 'home';
    if (path === '/catalog') return 'catalog';
    if (path === '/orders') return 'orders';
    if (path === '/favorites') return 'favorites';
    if (path === '/checkout') return 'checkout';
    if (path === '/order-confirm') return 'confirm';
    return 'default';
  }, [location.pathname]);

  const currentTabIndex = CLIENT_TABS.indexOf(location.pathname);
  const isMainTab = currentTabIndex !== -1;

  const handleDragEnd = (event, info) => {
    if (!isMainTab) return;
    
    // Sensibilidad del deslizamiento
    const swipeThreshold = 60;
    
    if (info.offset.x < -swipeThreshold && currentTabIndex < CLIENT_TABS.length - 1) {
      // Swipe hacia la izquierda -> siguiente pestaña
      navigate(CLIENT_TABS[currentTabIndex + 1], { viewTransition: true });
    } else if (info.offset.x > swipeThreshold && currentTabIndex > 0) {
      // Swipe hacia la derecha -> pestaña anterior
      navigate(CLIENT_TABS[currentTabIndex - 1], { viewTransition: true });
    }
  };

  return (
    <>
      {/* Header Global Sávit - Uno solo para toda la app */}
      <Header onCartOpen={() => setCartOpen(true)} />

      {/* Renderizado interactivo con efecto rebote de WhatsApp */}
      <motion.main
        drag={isMainTab ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ 
          flex: 1,
          width: '100%',
          touchAction: 'pan-y', // Permitir scroll vertical nativo
          overflowX: 'hidden'
        }}
      >
        {children}
      </motion.main>

      {/* Navegación Inferior Global */}
      <BottomNav />

      {/* Asistente IA Global (Squirrel Mascot) */}
      <Mascot page={pageType} key={pageType} />
    </>
  );
}
