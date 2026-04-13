import { useState, useEffect, useRef } from 'react';
import './Gamification.css';

export default function Gamification() {
  const [coins, setCoins] = useState([]);
  const coinCounter = useRef(0);

  useEffect(() => {
    const handleThrow = () => {
      // 1. Ubicar la mascota real y el destino de recompensas (Header prioritario)
      const mascot = document.querySelector('.mascot-character');
      const target = document.getElementById('header-points-target') || document.getElementById('rewards-target');
      
      if (!mascot || !target) {
        // Fallback al elemento que disparó el evento si no hay mascota
        console.warn('Mascota o Target de recompensas no encontrados');
        return;
      }

      const mascotRect = mascot.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // 2. Efecto visual en la mascota (impulso)
      mascot.classList.add('mascot-action-pop');
      setTimeout(() => mascot.classList.remove('mascot-action-pop'), 400);

      // 3. Crear moneda dinámica
      const newCoin = {
        id: ++coinCounter.current,
        startX: mascotRect.left + mascotRect.width / 2,
        startY: mascotRect.top + mascotRect.height / 2,
        endX: targetRect.left + targetRect.width / 2,
        endY: targetRect.top + targetRect.height / 2
      };

      setCoins(prev => [...prev, newCoin]);

      // 4. Limpieza y feedback de impacto
      setTimeout(() => {
        setCoins(prev => prev.filter(c => c.id !== newCoin.id));
        
        // Impacto en el target
        target.classList.add('receiving');
        setTimeout(() => target.classList.remove('receiving'), 500);
      }, 1000); // Duración de la animación en CSS
    };

    window.addEventListener('savit_throw_coin', handleThrow);
    return () => window.removeEventListener('savit_throw_coin', handleThrow);
  }, []);

  return (
    <div className="gamification-layer">
      {coins.map(coin => (
        <div 
          key={coin.id}
          className="dynamic-flying-coin"
          style={{
            '--start-x': `${coin.startX}px`,
            '--start-y': `${coin.startY}px`,
            '--end-x': `${coin.endX}px`,
            '--end-y': `${coin.endY}px`,
          }}
        >
          🪙
        </div>
      ))}
    </div>
  );
}
