import React from 'react';
import './StoreStatusBanner.css';

const StoreStatusBanner = ({ isOpen, variant = 'catalog' }) => {
  if (isOpen) return null;

  return (
    <div className={`store-status-banner variant-${variant} animate-slide-down`}>
      <div className="banner-status-content">
        <div className="banner-status-icon">
          <span className="emoji-pulse">🌙</span>
        </div>
        <div className="banner-status-text">
          <h4 className="banner-status-title">Tienda Cerrada</h4>
          <p className="banner-status-desc">
            Recibiremos tu pedido y lo procesaremos apenas abramos. ¡Gracias por elegirnos! 🌿
          </p>
        </div>
      </div>
    </div>
  );
};

export default StoreStatusBanner;
