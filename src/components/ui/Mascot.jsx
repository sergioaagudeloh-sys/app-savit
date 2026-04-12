// src/components/ui/Mascot.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStoreConfig } from '../../hooks/useOrders';
import './Mascot.css';
import { playPromoSound, playMascotSound } from '../../utils/audio';

const PAGE_MESSAGES = {
  home: [
    { text: "¡Qué alegría verte de nuevo! ✨", isPromo: false },
    { text: "¿Qué vamos a elegir hoy para tu bienestar? 🌱", isPromo: false },
    { text: "¡Sávit tiene los mejores productos para ti! 🐿️", isPromo: false },
    { text: "¡Una casa saludable es una casa feliz! ✨", isPromo: false },
  ],
  catalog: [
    { text: "¡Tengo el ojo puesto en lo más fresco! 🐿️", isPromo: false },
    { text: "¿Buscas algo específico? ¡Mi olfato no falla! 🔍", isPromo: false },
    { text: "¡Frutas y verduras llenas de energía! 🍏", isPromo: false },
    { text: "Añade al carrito y yo cuidaré de tu pedido. 🧺", isPromo: false },
  ],
  orders: [
    { text: "¡Estamos preparando tu pedido con cuidado! 🐿️", isPromo: false },
    { text: "Tus productos descansarán pronto en tu hogar. 🚚", isPromo: false },
    { text: "¡Casi listo! Lo más fresco de Sávit va en camino. ✨", isPromo: false },
    { text: "¡Prepárate para disfrutar de lo mejor! 💚", isPromo: false },
  ],
  favorites: [
    { text: "¡Tus favoritos son una elección excelente! ❤️", isPromo: false },
    { text: "¿Listo para llevarte lo que más amas? 🐿️", isPromo: false },
    { text: "¡Veo que tienes muy buen gusto! ✨", isPromo: false },
    { text: "Añade tus preferidos al carrito y yo los guardo. 🧺", isPromo: false },
  ],
  default: [
    { text: "¡Hola! Soy Sávit, tu asistente saludable. 🐿️", isPromo: false },
    { text: "¡Lo mejor para tu bienestar está aquí! 🛒", isPromo: false },
    { text: "¡Cuida tu salud con lo más natural! 💚", isPromo: false },
  ]
};


export default function Mascot({ page = 'default' }) {
  const { config } = useStoreConfig();

  const activeMessages = useMemo(() => {
    const base = PAGE_MESSAGES[page] || PAGE_MESSAGES.default;
    const messages = [...base];

    const activePromos = config?.promos?.filter(p => p.active) || (config?.promo?.active ? [config.promo] : []);

    activePromos.forEach(promo => {
      if (promo.title) {
        messages.push({ text: `¡No te pierdas: ${promo.title}! 🔥`, isPromo: true });
      }
    });

    if (activePromos.length > 0) {
      messages.push({ text: `¡Aprovecha nuestras promos especiales! 🥑`, isPromo: true });
    }

    return messages;
  }, [config?.promos, config?.promo, page]);

  // States
  const [msg, setMsg] = useState(activeMessages[0]);
  const [showBubble, setShowBubble] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const [showPromoGlow, setShowPromoGlow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs for logic consistency
  const activeMessagesRef = useRef(activeMessages);
  const showBubbleRef = useRef(false);
  const msgRef = useRef(activeMessages[0]);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const totalDragDistance = useRef(0);
  const lastTapTime = useRef(0);
  
  const rotationTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Sync messages ref
  useEffect(() => {
    activeMessagesRef.current = activeMessages;
  }, [activeMessages]);

  // --- Stable Core Functions ---

  const scheduleNextRotation = useCallback(() => {
    if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);
    
    // Wait 30 seconds before next random message
    rotationTimeoutRef.current = setTimeout(() => {
      if (isDraggingRef.current) {
        scheduleNextRotation();
        return;
      }
      
      const msgs = activeMessagesRef.current;
      if (!msgs || msgs.length === 0) return;

      const currentText = msgRef.current?.text;
      let nextMsg = msgs[Math.floor(Math.random() * msgs.length)];
      
      // Try to avoid showing same text immediately if possible
      if (nextMsg.text === currentText && msgs.length > 1) {
        nextMsg = msgs.find(m => m.text !== currentText) || nextMsg;
      }

      triggerMessage(nextMsg);
    }, 30000);
  }, []);

  const triggerMessage = useCallback((newMsg) => {
    // Clear everything first
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);

    const DISPLAY_DURATION = 4000;

    const performShow = () => {
      // Sound sync: Check visibility and focus
      const isWindowActive = document.visibilityState === 'visible' && document.hasFocus();

      setMsg(newMsg);
      msgRef.current = newMsg;
      setShowBubble(true);
      showBubbleRef.current = true;
      setIsSpeaking(true);

      if (isWindowActive) {
        if (newMsg.isPromo) {
          playPromoSound();
          setShowPromoGlow(false);
          setTimeout(() => setShowPromoGlow(true), 20);
        } else {
          playMascotSound();
        }
      }

      // Automatically hide after 4s
      hideTimeoutRef.current = setTimeout(() => {
        setShowBubble(false);
        showBubbleRef.current = false;
        setIsSpeaking(false);
        // Start next rotation timer AFTER hiding
        scheduleNextRotation();
      }, DISPLAY_DURATION);
    };

    if (showBubbleRef.current) {
      if (msgRef.current?.text === newMsg.text) {
        // Refresh timer if same message
        hideTimeoutRef.current = setTimeout(() => {
          setShowBubble(false);
          showBubbleRef.current = false;
          setIsSpeaking(false);
          scheduleNextRotation();
        }, DISPLAY_DURATION);
        return;
      }
      // Hide then show the new one
      setShowBubble(false);
      showBubbleRef.current = false;
      setIsSpeaking(false);
      setTimeout(performShow, 450);
    } else {
      performShow();
    }
  }, [scheduleNextRotation]);

  // Lifecycle: Handle initial mount and page changes
  useEffect(() => {
    // Initial delay to let the page settle
    const initialTimer = setTimeout(() => {
      if (activeMessagesRef.current.length > 0) {
        triggerMessage(activeMessagesRef.current[0]);
      }
    }, 1200);

    return () => {
      clearTimeout(initialTimer);
      if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [page, triggerMessage]);

  // --- Interaction Handlers ---

  const handleDragStart = (e) => {
    if (isDraggingRef.current) return;

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartPos.current = { x: clientX - position.x, y: clientY - position.y };
    totalDragDistance.current = 0;
  };

  const handleDragMove = useCallback((e) => {
    if (!isDraggingRef.current) return;

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragStartPos.current.x;
    const newY = clientY - dragStartPos.current.y;

    totalDragDistance.current += Math.abs(newX - position.x) + Math.abs(newY - position.y);
    setPosition({ x: newX, y: newY });
  }, [position.x, position.y]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 500) return;
    lastTapTime.current = now;

    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 500);

    const msgs = activeMessagesRef.current;
    if (!msgs.length) return;

    const randomIndex = Math.floor(Math.random() * msgs.length);
    let randomMsg = msgs[randomIndex];

    if (randomMsg.text === msgRef.current?.text && msgs.length > 1) {
      const altIndex = (randomIndex + 1) % msgs.length;
      randomMsg = msgs[altIndex];
    }
    
    triggerMessage(randomMsg);
  }, [triggerMessage]);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;

    setIsDragging(false);
    isDraggingRef.current = false;

    if (totalDragDistance.current < 15) {
      handleTap();
    }
  }, [handleTap]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <>
      {showPromoGlow && <div className="promo-screen-glow" onAnimationEnd={() => setShowPromoGlow(false)} />}

      <div
        className="mascot-container"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {showBubble && (
          <div className="mascot-bubble-wrapper" key={msg?.text}>
            <div className={`mascot-bubble ${msg?.isPromo ? 'mascot-bubble-promo' : ''}`}>
              {msg?.text}
            </div>
          </div>
        )}

        <div
          className={`mascot-character glow-mode ${isWiggling ? 'wiggle' : ''} ${isSpeaking ? 'speaking' : ''}`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="mascot-star">✨</div>
          <div className="mascot-shadow shadow-glow" />
          <img 
            src="/mascot.png" 
            alt="Mascot" 
            className="mascot-img" 
            draggable="false"
          />
        </div>
      </div>
    </>
  );
}

