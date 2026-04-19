// src/components/layout/AdminLayout.jsx
import { useState } from 'react';
import { useOrders, useStoreConfig } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import AdminAnalyst from '../admin/AdminAnalyst';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';
import Header from './Header';

/**
 * AdminLayout
 * Envoltorio global para todas las páginas administrativas.
 * Gestiona el Sidebar (Desktop), el Header y el BottomNav (Mobile) con adaptabilidad.
 */
export default function AdminLayout({ children }) {
  const { orders } = useOrders();
  const { products } = useProducts();
  const { config } = useStoreConfig();
  
  const [showAnalyst, setShowAnalyst] = useState(false);

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

      {/* Botón flotante del Asistente IA (Savit Analyst) */}
      <button 
        className={`ai-floating-btn ${showAnalyst ? 'active' : ''}`}
        onClick={() => setShowAnalyst(true)}
        title="Asistente IA Savit"
      >
        <svg className="ai-btn-sparkle" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </button>

      {/* Componente del Analista */}
      {showAnalyst && (
        <AdminAnalyst 
          onClose={() => setShowAnalyst(false)} 
          orders={orders}
          products={products}
          config={config}
        />
      )}

      {/* Navegación inferior (visible solo en móvil vía CSS) */}
      <BottomNav />
    </div>
  );
}
