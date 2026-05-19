// src/components/layout/AdminLayout.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';
import Header from './Header';

const ADMIN_TABS = ['/admin', '/admin/orders', '/admin/products'];

/**
 * AdminLayout
 * Envoltorio global para todas las páginas administrativas.
 * Gestiona el Sidebar (Desktop), el Header y el BottomNav (Mobile) con adaptabilidad.
 */
export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Manage admin-page class on body for CSS targeting
  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => document.body.classList.remove('admin-page');
  }, []);

  const currentTabIndex = ADMIN_TABS.indexOf(location.pathname);
  const isMainTab = currentTabIndex !== -1;

  const handleDragEnd = (event, info) => {
    if (!isMainTab) return;
    
    // Sensibilidad del deslizamiento
    const swipeThreshold = 60;
    
    if (info.offset.x < -swipeThreshold && currentTabIndex < ADMIN_TABS.length - 1) {
      // Swipe hacia la izquierda -> siguiente pestaña
      navigate(ADMIN_TABS[currentTabIndex + 1], { viewTransition: true });
    } else if (info.offset.x > swipeThreshold && currentTabIndex > 0) {
      // Swipe hacia la derecha -> pestaña anterior
      navigate(ADMIN_TABS[currentTabIndex - 1], { viewTransition: true });
    }
  };

  return (
    <div className="admin-layout-container">
      {/* Header global para Admin */}
      <Header />

      {/* Sidebar persistente en PC (oculto en móvil vía CSS) */}
      <AdminSidebar />

      {/* El contenido principal se desplaza automáticamente vía CSS padding-left en PC */}
      <motion.div 
        className="admin-main-content"
        drag={isMainTab ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ 
          touchAction: 'pan-y', 
          width: '100%',
          overflowX: 'hidden'
        }}
      >
        {children}
      </motion.div>

      {/* Navegación inferior (visible solo en móvil vía CSS) */}
      <BottomNav />
    </div>
  );
}
