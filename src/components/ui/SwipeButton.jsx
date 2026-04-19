// src/components/ui/SwipeButton.jsx
import { useRef, useState, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import './SwipeButton.css';

export default function SwipeButton({ onConfirm, label = 'Desliza para Confirmar', disabled = false }) {
  const trackRef = useRef(null);
  const [confirmed, setConfirmed] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const controls = useAnimation();
  const x = useMotionValue(0);

  const THUMB_SIZE = 54;
  
  // Progress uses useTransform to map the 'x' value (0 to track max) into a 0 to 1 range
  const maxDrag = Math.max(0, trackWidth - THUMB_SIZE - 8);
  
  // This helps CSS know the pull progress, we map it into an inline style variable.
  const progress = useTransform(x, [0, maxDrag || 1], [0, 1]);

  useEffect(() => {
    if (trackRef.current) {
      setTrackWidth(trackRef.current.clientWidth);
    }
  }, []);

  const handleDragEnd = async (event, info) => {
    if (disabled || confirmed || maxDrag <= 0) return;

    // Check if the drag crossed the threshold (e.g. 80%)
    if (info.offset.x > maxDrag * 0.8) {
      setConfirmed(true);
      // Snap to end
      await controls.start({ x: maxDrag });
      setTimeout(() => onConfirm(), 350);
    } else {
      // Snap back to 0
      controls.start({ x: 0 });
    }
  };

  return (
    <motion.div
      ref={trackRef}
      className={`swipe-btn-track${confirmed ? ' swipe-btn-track--confirmed' : ''}${disabled ? ' swipe-btn-track--disabled' : ''}`}
      style={{ '--progress': progress }}
    >
      {/* Fill background */}
      <motion.div 
        className="swipe-btn-fill" 
        style={{ scaleX: progress, transformOrigin: 'left' }}
      />

      {/* Label text */}
      <span className="swipe-btn-label">
        {confirmed ? '¡Pedido Confirmado! 🎉' : label}
      </span>

      {/* Draggable thumb */}
      <motion.div
        drag={disabled || confirmed ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.05} // Baja elasticidad para sentir que es "real" pero firme
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`swipe-btn-thumb${confirmed ? ' swipe-btn-thumb--confirmed' : ''}`}
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
      </motion.div>
    </motion.div>
  );
}
