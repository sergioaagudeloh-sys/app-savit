import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Mascot from '../ui/Mascot';

/**
 * ClientLayout
 * Wrapper para todas las páginas del cliente que asegura la presencia
 * global y persistente de Sávit IA (la ardilla).
 */
export default function ClientLayout({ children }) {
  const location = useLocation();

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
      {/* Renderizado de la página actual */}
      {children}

      {/* Asistente IA Global (Squirrel Mascot) */}
      <Mascot page={pageType} key={pageType} />
    </>
  );
}
