// src/components/ui/Mascot.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
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
  checkout: [
    { text: "¡Ya casi es tuyo! Todo se ve delicioso. 😋", isPromo: false },
    { text: "Revisa bien tus datos, yo vigilaré que todo salga bien. 🐿️", isPromo: false },
    { text: "¿Dudas con tu dirección? ¡Aquí te ayudo! 📍", isPromo: false },
    { text: "¡Sávit garantiza la frescura en cada entrega! ✨", isPromo: false },
  ],
  confirm: [
    { text: "¡Felicidades por tu compra saludable! 🎉", isPromo: false },
    { text: "¡Tu pedido va en camino a ser una realidad! 🐿️", isPromo: false },
    { text: "Gracias por confiar en Sávit para tu bienestar. 💚", isPromo: false },
    { text: "¡Nos vemos pronto con lo más fresco! 🚚", isPromo: false },
  ],
  default: [
    { text: "¡Hola! Soy Sávit, tu asistente saludable. 🐿️", isPromo: false },
    { text: "¡Lo mejor para tu bienestar está aquí! 🛒", isPromo: false },
    { text: "¡Cuida tu salud con lo más natural! 💚", isPromo: false },
  ]
};

// ── Healthy Tips Bank ─────────────────────────────────────────────────────────
const HEALTHY_TIPS = [
  { id: 'tip-1', title: 'Hidratación', text: 'Bebe al menos 8 vasos de agua al día para mantener tu energía y piel radiante.', icon: '💧' },
  { id: 'tip-2', title: 'Frutas del Día', text: 'Come al menos 3 porciones de fruta al día. ¡Aportan vitaminas y fibra natural!', icon: '🍎' },
  { id: 'tip-3', title: 'Muévete', text: 'Realiza 30 minutos de actividad física diaria para fortalecer tu corazón.', icon: '🏃' },
  { id: 'tip-4', title: 'Descanso', text: 'Duerme entre 7 y 8 horas diarias para que tu cuerpo y mente se recuperen.', icon: '😴' },
  { id: 'tip-5', title: 'Menos Azúcar', text: 'Reduce los azúcares refinados y prefiere el dulce natural de las frutas.', icon: '🍯' },
  { id: 'tip-6', title: 'Grasas Buenas', text: 'Incluye aguacate, nueces y aceite de oliva en tu dieta para un cerebro sano.', icon: '🥑' },
  { id: 'tip-7', title: 'Mastica Bien', text: 'Masticar despacio ayuda a tu digestión y te hace sentir saciado más pronto.', icon: '🥗' }
];

// Bubble cluster directly above the mascot
// Carefully positioned so they don't overlap (min distance ~85px) and fit right above.
const BUBBLE_POSITIONS = [
  { x: -15, y: -160 },  // Lowest, slightly left  
  { x: -95, y: -200 },  // Left, mid
  { x: 15,  y: -235 },  // Right, high
  { x: -145, y: -270 }, // Far left, very high
  { x: -55, y: -300 }   // Center, highest
];


// ── Main Mascot Component ─────────────────────────────────────────────────────
export default function Mascot({ page = 'default' }) {
  const { config } = useStoreConfig();

  const activePromos = useMemo(() => {
    const raw = config?.promos?.length
      ? config.promos.filter(p => p.active)
      : config?.promo?.active
        ? [config.promo]
        : [];

    return raw.map(p => ({
      ...p,
      image: p.image || p.imageUrl || p.thumbnail || null,
      title: p.title || 'Promoción especial',
    }));
  }, [config?.promos, config?.promo]);

  // Always-5 bubbles: promos first, then random tips to fill
  const bubbleItems = useMemo(() => {
    const TOTAL = 5;
    const promoItems = activePromos.map(p => ({ type: 'PROMO', data: p, id: p.id || p.title }));
    const slotsLeft = TOTAL - promoItems.length;

    const shuffledTips = [...HEALTHY_TIPS]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, slotsLeft));

    const tipItems = shuffledTips.map(t => ({ type: 'TIP', data: t, id: t.id }));
    return [...promoItems, ...tipItems];
  }, [activePromos]);

  const activeMessages = useMemo(() => {
    const base = PAGE_MESSAGES[page] || PAGE_MESSAGES.default;
    const messages = [...base];
    activePromos.forEach(promo => {
      if (promo.title) messages.push({ text: `¡No te pierdas: ${promo.title}! 🔥`, isPromo: true });
    });
    if (activePromos.length > 0) messages.push({ text: `¡Aprovecha nuestras promos especiales! 🥑`, isPromo: true });
    return messages;
  }, [activePromos, page]);

  // States
  const [msg, setMsg] = useState(activeMessages[0]);
  const [showBubble, setShowBubble] = useState(false);
  const [showPromoBubbles, setShowPromoBubbles] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const [showPromoGlow, setShowPromoGlow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Bubble system
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);
  const [mascotScreenPos, setMascotScreenPos] = useState({ x: 0, y: 0 });
  const bubbleTimeoutRef = useRef(null);

  // Refs
  const activeMessagesRef = useRef(activeMessages);
  const showBubbleRef = useRef(false);
  const msgRef = useRef(activeMessages[0]);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const totalDragDistance = useRef(0);
  const lastTapTime = useRef(0);
  const rotationTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Function Refs to break cyclic dependency
  const triggerMessageRef = useRef(null);
  const scheduleNextRotationRef = useRef(null);

  useEffect(() => {
    activeMessagesRef.current = activeMessages;
  }, [activeMessages]);



  const scheduleNextRotation = useCallback(() => {
    if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);
    rotationTimeoutRef.current = setTimeout(() => {
      if (isDraggingRef.current) { scheduleNextRotationRef.current?.(); return; }
      const msgs = activeMessagesRef.current;
      if (!msgs || msgs.length === 0) return;
      const currentText = msgRef.current?.text;
      let nextMsg = msgs[Math.floor(Math.random() * msgs.length)];
      if (nextMsg.text === currentText && msgs.length > 1) {
        nextMsg = msgs.find(m => m.text !== currentText) || nextMsg;
      }
      triggerMessageRef.current?.(nextMsg);
    }, 15000);
  }, []);

  const forceNextMessage = useCallback(() => {
    const msgs = activeMessagesRef.current;
    if (!msgs || msgs.length === 0) return;
    const currentText = msgRef.current?.text;
    let nextMsg = msgs[Math.floor(Math.random() * msgs.length)];
    if (nextMsg.text === currentText && msgs.length > 1) {
      nextMsg = msgs.find(m => m.text !== currentText) || nextMsg;
    }
    triggerMessageRef.current?.(nextMsg);
  }, []);

  const triggerMessage = useCallback((newMsg) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);
    const DISPLAY_DURATION = 4000;

    const performShow = () => {
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
      hideTimeoutRef.current = setTimeout(() => {
        setShowBubble(false);
        showBubbleRef.current = false;
        setIsSpeaking(false);
        scheduleNextRotationRef.current?.();
      }, DISPLAY_DURATION);
    };

    if (showBubbleRef.current) {
      if (msgRef.current?.text === newMsg.text) {
        hideTimeoutRef.current = setTimeout(() => {
          setShowBubble(false);
          showBubbleRef.current = false;
          setIsSpeaking(false);
          scheduleNextRotationRef.current?.();
        }, DISPLAY_DURATION);
        return;
      }
      setShowBubble(false);
      showBubbleRef.current = false;
      setIsSpeaking(false);
      setTimeout(performShow, 450);
    } else {
      performShow();
    }
  }, []);

  // Sync refs to break cycles
  useEffect(() => {
    triggerMessageRef.current = triggerMessage;
    scheduleNextRotationRef.current = scheduleNextRotation;
  }, [triggerMessage, scheduleNextRotation]);

  useEffect(() => {
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

  // ── Drag Handlers ────────────────────────────────────────────────────────

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

  // ── Bubble Logic ─────────────────────────────────────────────────────────

  const launchPromoBubbles = useCallback(() => {

    // Determine screen position of the mascot before creating bubbles
    const mascotEl = document.querySelector('.mascot-character');
    if (mascotEl) {
      const rect = mascotEl.getBoundingClientRect();
      setMascotScreenPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }

    playPromoSound();
    setShowPromoGlow(false);
    setTimeout(() => setShowPromoGlow(true), 20);
    setShowPromoBubbles(true);

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setShowPromoBubbles(false);
    }, 8000);
  }, []);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 500) return;
    lastTapTime.current = now;

    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 500);

    // 1. Clear bubbles if already up, or launch them
    if (showPromoBubbles) {
      setShowPromoBubbles(false);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    } else {
      launchPromoBubbles();
    }
  }, [showPromoBubbles, launchPromoBubbles]);

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

  const handleBubblePop = useCallback((item) => {
    setShowPromoBubbles(false);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    if (item.type === 'TIP') {
      setSelectedTip(item.data);
    } else {
      setSelectedPromo(item.data);
    }
  }, []);

  return (
    <>
      {showPromoGlow && <div className="promo-screen-glow" onAnimationEnd={() => setShowPromoGlow(false)} />}

      {/* 🫧 Promo Bubbles Stage */}
      {showPromoBubbles && (
        <div className="promo-bubbles-stage">
          {bubbleItems.map((item, i) => (
            <PromoBubble
              key={item.id}
              item={item}
              index={i}
              onPop={handleBubblePop}
              mascotScreenPos={mascotScreenPos}
            />
          ))}
        </div>
      )}

      {/* Promo Detail Modal */}
      {selectedPromo && (
        <PromoModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      )}

      {/* Tip Modal */}
      {selectedTip && (
        <TipModal tip={selectedTip} onClose={() => setSelectedTip(null)} />
      )}

      {/* Mascot Container */}
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


// ── Sub-components ─────────────────────────────────────────────────────────

function PromoBubble({ item, index, onPop, mascotScreenPos }) {
  const [isPopping, setIsPopping] = useState(false);

  const isTip = item.type === 'TIP';
  const data = item.data;
  const pos = BUBBLE_POSITIONS[index] || { x: 0, y: 0 };
  const thumbSrc = !isTip ? (data.imageUrl || data.thumbnail || data.image || null) : null;

  const handlePop = (e) => {
    e.stopPropagation();
    if (isPopping) return;
    setIsPopping(true);
    setTimeout(() => onPop(item), 300);
  };

  return (
    <div
      className={`promo-bubble ${isPopping ? 'popping' : ''} ${isTip ? 'bubble-tip' : 'bubble-promo'}`}
      style={{
        left: `${mascotScreenPos.x}px`,
        top: `${mascotScreenPos.y}px`,
        '--target-x': `${pos.x}px`,
        '--target-y': `${pos.y}px`,
        animationDelay: `${index * 0.08}s`
      }}
      onClick={handlePop}
    >
      <div className="promo-bubble-drifter">
        {isTip ? (
          <div className="promo-bubble-placeholder tip-bubble-bg">
            <span className="promo-bubble-tip-icon">{data.icon}</span>
            <span className="promo-bubble-label">{data.title.split(' ')[0]}</span>
          </div>
        ) : thumbSrc ? (
          <img src={thumbSrc} alt={data.title} className="promo-bubble-img" draggable="false" />
        ) : (
          <div className="promo-bubble-placeholder">
            <span className="promo-bubble-label">{data.title?.split(' ').slice(0, 2).join(' ')}</span>
          </div>
        )}
        <div className="promo-bubble-shine" />
        <div className="promo-bubble-shine-2" />
      </div>
    </div>
  );
}

function PromoModal({ promo, onClose }) {
  if (!promo) return null;
  const imgSrc = promo.imageUrl || promo.thumbnail || promo.image;
  return (
    <div className="promo-modal-overlay" onClick={onClose}>
      <div className="promo-modal-card" onClick={e => e.stopPropagation()}>
        <button className="promo-modal-close" onClick={onClose}>✕</button>
        {imgSrc && (
          <div className="promo-modal-img-wrap">
            <img src={imgSrc} alt={promo.title} className="promo-modal-img" />
          </div>
        )}
        <div className="promo-modal-body">
          <div className="promo-modal-badge">🔥 Promoción</div>
          <h3 className="promo-modal-title">{promo.title}</h3>
          {promo.description && <p className="promo-modal-desc">{promo.description}</p>}
          {promo.discount && (
            <div className="promo-modal-discount">{promo.discount}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TipModal({ tip, onClose }) {
  if (!tip) return null;
  return (
    <div className="promo-modal-overlay tip-modal-overlay" onClick={onClose}>
      <div className="promo-modal-card tip-modal-card" onClick={e => e.stopPropagation()}>
        <button className="promo-modal-close" onClick={onClose}>✕</button>
        <div className="tip-modal-icon-header">{tip.icon}</div>
        <div className="promo-modal-body tip-modal-body">
          <span className="promo-modal-badge tip-badge">💚 Consejo Sávit</span>
          <h2 className="promo-modal-title">{tip.title}</h2>
          <p className="promo-modal-desc">{tip.text}</p>
          <button className="tip-modal-btn" onClick={onClose}>¡Excelente! 🙌</button>
        </div>
      </div>
    </div>
  );
}

Mascot.propTypes = {
  page: PropTypes.string
};

PromoModal.propTypes = {
  promo: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    discount: PropTypes.string,
    imageUrl: PropTypes.string,
    thumbnail: PropTypes.string,
    image: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

TipModal.propTypes = {
  tip: PropTypes.shape({
    icon: PropTypes.string,
    title: PropTypes.string,
    text: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};
