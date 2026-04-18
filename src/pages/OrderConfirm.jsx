// src/pages/OrderConfirm.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Header from '../components/layout/Header';
import LottiePlayer from '../components/common/LottiePlayer';
import { openWhatsApp } from '../utils/whatsapp';
import './OrderConfirm.css';

export default function OrderConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [animationKey, setAnimationKey] = useState(0);
  
  useEffect(() => {
    // Replay animation when user returns to the app
    const handleFocus = () => {
      setAnimationKey(prev => prev + 1);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Redirect if no order state
  if (!state || !state.orderId) {
    return <Navigate to="/home" replace />;
  }

  const { orderId, message } = state;

  return (
    <div className="app-container">
      <Header />
      <main className="page-content order-confirm-redesign">
        
        {/* Success Header Section */}
        <div className="confirm-hero">
          <div className="confirm-hero-inner">
            <div className="success-lottie-container">
              {/* Fallback Static Icon */}
              <div className="success-fallback-icon">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              
              <LottiePlayer 
                key={animationKey}
                animationData="https://lottie.host/79015a88-6627-4a0b-80a5-f93897858971/mO9zI52w5k.json" 
                loop={false}
              />
            </div>
            <h1 className="confirm-title">¡Pedido Generado!</h1>
            <p className="confirm-desc">Orden <strong>#{orderId}</strong></p>
          </div>
        </div>

        {/* Action Card */}
        <div className="confirm-body">
          <div className="confirm-card-elite">
            <div className="card-top-accent"></div>
            <div className="confirm-card-content">
              <h3>¿Qué sigue ahora?</h3>
              <p>Envía tu pedido por WhatsApp para coordinar el pago y la entrega.</p>
              
              <div className="confirm-transfer-info">
                <span className="info-icon">💳</span>
                <p><strong>Transferencia:</strong> Te daremos la cuenta por el chat.</p>
              </div>
            </div>
          </div>

          <div className="confirm-actions">
            <button 
              className="btn btn-whatsapp btn-lg btn-glow" 
              onClick={() => openWhatsApp(message)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
              Confirmar por WhatsApp
            </button>

            <button 
              className="btn btn-ghost btn-lg mt-sm" 
              onClick={() => navigate('/home')}
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
