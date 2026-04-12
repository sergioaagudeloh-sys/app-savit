import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipe } from '../../hooks/useSwipe';
import { useCustomer } from '../../context/CustomerContext';
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
    id: 'points',
    title: 'Premiamos tu fidelidad',
    subtitle: 'Acumula puntos Sávit con cada pedido',
    bg: 'linear-gradient(135deg, #a4c93a 0%, #325a24 100%)',
  },
];

export default function Banner({ banners = DEFAULT_BANNERS }) {
  const [active, setActive] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();
  const { customer, isIdentified } = useCustomer();

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
             <h2 className="banner-title">{current.title}</h2>
          </div>
          <p className="banner-subtitle">{current.subtitle}</p>
        </div>
        
        {/* Rewards Target - The Arcón de Puntos */}
        <div 
          className="rewards-target-box" 
          id="rewards-target"
          onClick={() => navigate('/rewards', { viewTransition: true })}
          title="Ver mis puntos"
        >
           <div className="points-label">Sávit Puntos</div>
           <div className="points-value">
             <span>{isIdentified ? (customer?.savitPoints || 0).toLocaleString() : '---'}</span>
             <span className="points-coin-small">🪙</span>
           </div>
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
