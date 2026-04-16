// src/pages/OrderConfirm.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
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
      <main className="page-content order-confirm">
        <div className="order-confirm-animation" style={{ margin: '30px 0', height: '200px' }}>
          <LottiePlayer 
            key={animationKey}
            animationData="https://lottie.host/79015a88-6627-4a0b-80a5-f93897858971/mO9zI52w5k.json" 
            loop={false}
          />
        </div>
        <h1 className="confirm-title">¡Pedido Generado!</h1>
        <p className="confirm-desc">Tu orden <strong>#{orderId}</strong> ha sido creada exitosamente.</p>
        
        <div className="confirm-card">
          <h3>¿Qué sigue ahora?</h3>
          <p>Toca el botón para enviar tu pedido por WhatsApp y coordinar la entrega.</p>
          <p className="confirm-note">
            <strong>Transferencia:</strong> Te enviaremos el número de cuenta por el mismo chat.
          </p>
        </div>

        <button 
          className="btn btn-whatsapp btn-lg" 
          onClick={() => openWhatsApp(message)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
          </svg>
          Abrir WhatsApp
        </button>

        <button 
          className="btn btn-outline btn-lg mt-md" 
          onClick={() => navigate('/home')}
        >
          Volver a la tienda
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
