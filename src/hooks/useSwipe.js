// src/hooks/useSwipe.js
import { useRef } from 'react';

/**
 * Hook para detectar gestos de swipe (deslizamiento) en dispositivos táctiles.
 */
export function useSwipe({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown, 
  threshold = 60 
}) {
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const handleTouchStart = (e) => {
    moved.current = false;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
    touchEnd.current = { ...touchStart.current };
  };

  const handleTouchMove = (e) => {
    moved.current = true;
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchEnd = () => {
    if (!moved.current) return;

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      if (absX > threshold) {
        if (deltaX > 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }
    } else {
      if (absY > threshold) {
        if (deltaY > 0) onSwipeUp?.();
        else onSwipeDown?.();
      }
    }

    // Resetear
    moved.current = false;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}
