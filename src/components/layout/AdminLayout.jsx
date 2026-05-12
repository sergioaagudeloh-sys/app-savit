// src/components/layout/AdminLayout.jsx
import { useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';
import Header from './Header';

/**
 * AdminLayout
 * Envoltorio global para todas las páginas administrativas.
 * Gestiona el Sidebar (Desktop), el Header y el BottomNav (Mobile) con adaptabilidad.
 */
export default function AdminLayout({ children }) {
  // Manage admin-page class on body for CSS targeting
  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => document.body.classList.remove('admin-page');
  }, []);

  return (
    <div className="admin-layout-container">
      {/* Header global para Admin */}
      <Header />

      {/* Sidebar persistente en PC (oculto en móvil vía CSS) */}
      <AdminSidebar />

      {/* El contenido principal se desplaza automáticamente vía CSS padding-left en PC */}
      <div className="admin-main-content">
        {children}
      </div>

      {/* Navegación inferior (visible solo en móvil vía CSS) */}
      <BottomNav />
    </div>
  );
}
