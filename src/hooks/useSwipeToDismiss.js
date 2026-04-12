// src/hooks/useSwipeToDismiss.js
// Hook reutilizable para cerrar drawers/modales con un gesto de deslizamiento hacia abajo.
import { useRef, useCallback, useEffect } from 'react';

/**
 * @param {React.RefObject} ref - Referencia al elemento arrastrable.
 * @param {Function} onDismiss - Callback que se ejecuta al superar el umbral.
 * @param {Object} options
 * @param {number} options.threshold - Píxeles mínimos para disparar el dismiss (default: 80).
 * @param {string} options.direction - 'down' | 'up' (default: 'down').
 * @param {boolean} options.enabled - Si el gesto está activo (default: true).
 */
export function useSwipeToDismiss(ref, onDismiss, { threshold = 80, direction = 'down', enabled = true } = {}) {
  const startY = useRef(null);
  const startX = useRef(null);
  const isDragging = useRef(false);
  const isVertical = useRef(false); // Solo arrastramos si el gestor es claramente vertical

  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    isDragging.current = false;   // aún no confirmamos dirección
    isVertical.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;

    const deltaY = e.touches[0].clientY - startY.current;
    const deltaX = e.touches[0].clientX - startX.current;

    // Primera vez que movemos: determinar si el gesto es vertical u horizontal
    if (!isDragging.current && !isVertical.current) {
      if (Math.abs(deltaY) < 5 && Math.abs(deltaX) < 5) return; // Todavía sin movimiento claro
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Es un gesto horizontal → ignorar completamente este gesto
        startY.current = null;
        return;
      }
      // Es un gesto vertical → activar arrastre
      isVertical.current = true;
      isDragging.current = true;
      const el = ref?.current;
      if (el) el.style.transition = 'none';
    }

    if (!isDragging.current) return;

    // Solo seguir si el gesto va en la dirección correcta
    const isCorrectDirection = direction === 'down' ? deltaY > 0 : deltaY < 0;
    if (!isCorrectDirection) return;

    // ✅ Bloquear pull-to-refresh del navegador
    e.preventDefault();

    const el = ref?.current;
    if (!el) return;

    // Resistencia visual: el drawer sigue al dedo pero más lento
    const resistance = 0.45;
    const translate = deltaY * resistance;
    el.style.transform = `translateY(${translate}px)`;

    // Feedback visual progresivo en opacidad
    const progress = Math.min(Math.abs(deltaY) / (threshold * 2), 1);
    el.style.opacity = `${1 - progress * 0.25}`;
  }, [ref, direction, threshold]);

  const handleTouchEnd = useCallback((e) => {
    if (!isDragging.current || startY.current === null) return;

    const deltaY = e.changedTouches[0].clientY - startY.current;
    isDragging.current = false;
    isVertical.current = false;

    const el = ref?.current;
    if (!el) return;

    // Restaurar transición CSS
    el.style.transition = '';

    const isCorrectDirection = direction === 'down' ? deltaY > threshold : deltaY < -threshold;

    if (isCorrectDirection) {
      // Animar hacia fuera antes de llamar onDismiss
      const exitY = direction === 'down' ? '120%' : '-120%';
      el.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s ease';
      el.style.transform = `translateY(${exitY})`;
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.transition = '';
        onDismiss?.();
      }, 220);
    } else {
      // Spring back: vuelve a la posición original con rebote
      el.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease';
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
      setTimeout(() => {
        el.style.transition = '';
      }, 380);
    }

    startY.current = null;
    startX.current = null;
  }, [ref, onDismiss, direction, threshold]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref?.current;
    if (!el) return;

    // touchstart y touchend pueden ser passive (no bloquean scroll)
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    // touchmove DEBE ser { passive: false } para poder llamar e.preventDefault()
    // y así evitar el pull-to-refresh del browser mientras arrastramos
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
