// src/hooks/useSwipeToDelete.js
import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook para eliminar elementos de una lista mediante deslizamiento horizontal (swipe).
 * @param {React.RefObject} ref - Referencia al elemento de la lista.
 * @param {Function} onDelete - Acción al completar el swipe.
 * @param {Object} options 
 */
export function useSwipeToDelete(ref, onDelete, { threshold = 100, enabled = true } = {}) {
  const startX = useRef(null);
  const startY = useRef(null);
  const isDragging = useRef(false);
  const isHorizontal = useRef(false);

  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
    isHorizontal.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startX.current === null) return;

    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (!isDragging.current && !isHorizontal.current) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical scroll - ignore
        startX.current = null;
        return;
      }
      isHorizontal.current = true;
      isDragging.current = true;
    }

    if (!isDragging.current) return;

    // Solo permitir swipe a la izquierda (delete)
    if (deltaX > 0) return;

    if (isHorizontal.current) {
      if (e.cancelable) e.preventDefault();
    }

    const el = ref?.current;
    if (el) {
      el.style.transition = 'none';
      // Mover el elemento
      el.style.transform = `translateX(${deltaX}px)`;
      // Cambiar opacidad basado en el progreso
      const opacity = Math.max(1 - Math.abs(deltaX) / (threshold * 1.5), 0.5);
      el.style.opacity = opacity;
    }
  }, [ref, threshold]);

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current) return;
    
    const deltaX = e.changedTouches[0].clientX - startX.current;
    isDragging.current = false;
    isHorizontal.current = false;

    const el = ref?.current;
    if (!el) return;

    el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    if (deltaX < -threshold) {
      // Lanzar hacia afuera
      el.style.transform = 'translateX(-120%)';
      el.style.opacity = '0';
      
      setTimeout(() => {
        onDelete?.();
        // Reset properties in case element is reused (though usually it's removed from DOM)
        el.style.transform = '';
        el.style.opacity = '';
        el.style.transition = '';
      }, 300);
    } else {
      // Volver a posición original
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    }

    startX.current = null;
    startY.current = null;
  }, [ref, onDelete, threshold]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref?.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
