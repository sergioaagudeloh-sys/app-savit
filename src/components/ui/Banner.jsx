import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipe } from '../../hooks/useSwipe';
import { useCustomer } from '../../context/CustomerContext';
import { useStoreConfig } from '../../hooks/useOrders';
import './Banner.css';

const DEFAULT_BANNERS = [
  {
    id: 'open',
    title: '¡Estamos abiertos!',
    subtitle: 'Escoge tus favoritos antes de que se agoten',
    bg: 'linear-gradient(135deg, #1d3a1f 0%, #244c26 100%)',
    isLive: true
  },
  {
    id: 'keto',
    title: 'Keto & Sin Gluten',
    subtitle: 'El equilibrio perfecto entre sabor y salud',
    bg: 'linear-gradient(135deg, #325a24 0%, #41602b 100%)',
  },
  {
    id: 'delivery',
    title: 'Domicilio Express',
    subtitle: 'Llevamos la salud hasta la puerta de tu casa',
    bg: 'linear-gradient(135deg, #c9a43a 0%, #8b6b1a 100%)',
  },
];

export default function Banner({ banners: initialBanners = DEFAULT_BANNERS }) {
  const [active, setActive] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();
  const { customer, isIdentified } = useCustomer();
  const { config } = useStoreConfig();

  const isOpen = config?.isOpen !== false;

  // Dynamically update the 'open' banner based on store status
  const banners = initialBanners.map(b => {
    if (b.id === 'open') {
      return {
        ...b,
        title: isOpen ? '¡Estamos abiertos!' : 'Tienda Cerrada',
        subtitle: isOpen 
          ? 'Escoge tus favoritos antes de que se agoten' 
          : 'Procesaremos tu pedido a primera hora. ¡Gracias por elegirnos! 🌿',
        bg: isOpen 
          ? 'linear-gradient(135deg, #1d3a1f 0%, #244c26 100%)'
          : 'linear-gradient(135deg, #0a140b 0%, #1a1a1a 100%)',
        isLive: isOpen
      };
    }
    return b;
  });

  const next = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setActive(prev => (prev + 1) % banners.length);
      setIsAnimating(false);
    }, 200);
  }, [banners.length]);

  const prev = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setActive(curr => (curr - 1 + banners.length) % banners.length);
      setIsAnimating(false);
    }, 200);
  }, [banners.length]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: next,
    onSwipeRight: prev,
    threshold: 50
  });

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const current = banners[active];

  return (
    <div className="banner" style={{ background: current.bg }} {...swipeHandlers}>
      <div className={`banner-content ${isAnimating ? 'fading' : ''}`}>
        <div className="banner-text">
          <div className="banner-status-wrapper">
             {current.isLive && <span className="live-dot-indicator" />}
             <h2 className="banner-title" style={{ color: !isOpen && current.id === 'open' ? '#ff9800' : 'white' }}>
               {current.title}
             </h2>
          </div>
          <p className="banner-subtitle">{current.subtitle}</p>
        </div>
      </div>
      <div className="banner-dots">
        {banners.map((_, i) => (
          <button
            key={i}
            className={`banner-dot ${i === active ? 'active' : ''}`}
            onClick={() => {
              if (i === active) return;
              setIsAnimating(true);
              setTimeout(() => {
                setActive(i);
                setIsAnimating(false);
              }, 200);
            }}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
