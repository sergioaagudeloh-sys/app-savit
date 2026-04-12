import { useState, useEffect } from 'react';
import './Gamification.css';

export default function Gamification() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPreCoin, setShowPreCoin] = useState(false);

  useEffect(() => {
    const handleThrow = () => {
      if (isAnimating) return;
      
      setIsAnimating(true);
      setShowPreCoin(true);
      
      // Sequence: 
      // 1. Show pre-coin (0ms)
      // 2. Pre-coin glows and vanishes (300ms)
      // 3. Main coin is launched (300ms)
      
      setTimeout(() => {
        setShowPreCoin(false);
      }, 400);

      // Animation duration: 1.2s total (matches squirrel visibility)
      setTimeout(() => {
        setIsAnimating(false);
        // Trigger effect on target
        const target = document.getElementById('rewards-target');
        if (target) {
          target.classList.add('receiving');
          setTimeout(() => target.classList.remove('receiving'), 500);
        }
      }, 1200);
    };

    window.addEventListener('savit_throw_coin', handleThrow);
    return () => window.removeEventListener('savit_throw_coin', handleThrow);
  }, [isAnimating]);

  if (!isAnimating) return null;

  return (
    <div className="gamification-layer">
      {/* The Squirrel Launcher */}
      <div className="squirrel-animator">
        {showPreCoin && (
          <div className="pre-launch-coin">
            <span className="pre-coin-icon">🪙</span>
            <div className="pre-coin-glow"></div>
          </div>
        )}
        <span className="squirrel-icon">🐿️</span>
      </div>
      
      {/* The Main Flying Coin - Starts slightly after pre-coin glow */}
      {!showPreCoin && <div className="flying-coin">🪙</div>}
    </div>
  );
}
