// src/components/ui/SwipeButton.jsx
import { useRef, useState, useCallback } from 'react';
import './SwipeButton.css';

/**
 * SwipeButton — "Desliza para Confirmar" express checkout button.
 * When the user drags the thumb all the way to the right, onConfirm() is called.
 */
export default function SwipeButton({ onConfirm, label = 'Desliza para Confirmar', disabled = false }) {
  const trackRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const dragging = useRef(false);
  const startX   = useRef(0);

  const THUMB_SIZE  = 54;
  const THRESHOLD   = 0.82; // 82% of track width to confirm

  const getMax = () => {
    if (!trackRef.current) return 0;
    return trackRef.current.clientWidth - THUMB_SIZE - 8;
  };

  const handleStart = useCallback((clientX) => {
    if (disabled || confirmed) return;
    dragging.current = true;
    startX.current = clientX - offset;
  }, [disabled, confirmed, offset]);

  const handleMove = useCallback((clientX) => {
    if (!dragging.current) return;
    const max = getMax();
    const newOffset = Math.min(Math.max(clientX - startX.current, 0), max);
    setOffset(newOffset);

    if (newOffset / max >= THRESHOLD) {
      dragging.current = false;
      setConfirmed(true);
      setOffset(max);
      setTimeout(() => onConfirm(), 350);
    }
  }, [onConfirm]);

  const handleEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!confirmed) {
      // Spring back
      setOffset(0);
    }
  }, [confirmed]);

  // Mouse events
  const onMouseDown = (e) => handleStart(e.clientX);
  const onMouseMove = (e) => handleMove(e.clientX);
  const onMouseUp   = () => handleEnd();

  // Touch events
  const onTouchStart = (e) => handleStart(e.touches[0].clientX);
  const onTouchMove  = (e) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
  const onTouchEnd   = () => handleEnd();

  const progress = trackRef.current ? offset / getMax() : 0;

  return (
    <div
      ref={trackRef}
      className={`swipe-btn-track${confirmed ? ' swipe-btn-track--confirmed' : ''}${disabled ? ' swipe-btn-track--disabled' : ''}`}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ '--progress': progress }}
    >
      {/* Fill background */}
      <div className="swipe-btn-fill" />

      {/* Label text */}
      <span className="swipe-btn-label">
        {confirmed ? '¡Pedido Confirmado! 🎉' : label}
      </span>

      {/* Draggable thumb */}
      <div
        className={`swipe-btn-thumb${confirmed ? ' swipe-btn-thumb--confirmed' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {confirmed ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </div>
  );
}
