import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import Mascot from '../ui/Mascot';
import BottomNav from './BottomNav';
import Header from './Header';

/**
 * ClientLayout
 * Wrapper para todas las páginas del cliente que asegura la presencia
 * global y persistente de Sávit IA (la ardilla) y la navegación inferior.
 */
export default function ClientLayout({ children }) {
  const location = useLocation();
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

  return (
    <>
      {/* Header Global Sávit - Uno solo para toda la app */}
      <Header onCartOpen={() => setCartOpen(true)} />

      {/* Renderizado de la página actual */}
      {children}

      {/* Navegación Inferior Global */}
      <BottomNav />

      {/* Asistente IA Global (Squirrel Mascot) */}
      <Mascot page={pageType} key={pageType} />
    </>
  );
}
