import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useOrders } from '../../hooks/useOrders';
import { sendMessageToAI } from '../../services/aiService';
// PROBLEMA D FIX: El admin ahora usa el Analista Estratégico completo
import { sendMessageToAnalyst, buildProactiveGreeting } from '../../services/adminAiService';
import { getProductInterests } from '../../utils/aiTriggers';
import { parseProductIds, parseActions, cleanAiText, hasPaymentInfo } from '../../utils/chatParser';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useAddToCartAnimation } from '../../hooks/useAddToCartAnimation';
import { vibrateSuccess } from '../../utils/haptics';
import { useStoreContext } from '../../context/StoreContext';
import ChatProductCard from './ChatProductCard';
import './MascotChat.css';

// Función que genera chips contextuales
const getDynamicSuggestions = (isAdmin, cartItems, orders) => {
  if (isAdmin) {
    return [
      '📊 ¿Cuáles son las ventas de hoy?',
      '📦 ¿Qué productos hay en stock crítico?',
      '🔔 ¿Cuántos pedidos pendientes hay?',
      '📈 Dame una proyección del mes',
    ];
  }

  const hasCart = cartItems && cartItems.length > 0;
  const hasOrders = orders && orders.length > 0;

  if (hasCart) {
    return [
      '📦 Recomienda un complemento para mi carrito',
      '💳 Mostrar opciones de pago',
      '🛒 Resumen de mi pedido',
    ];
  }

  if (hasOrders) {
    return [
      '🔄 Repetir mi pedido anterior',
      '🔍 ¿Dónde está mi orden actual?',
      '🔥 ¿Cuáles son los productos más vendidos?',
    ];
  }

  return [
    '🔥 ¿Cuáles son los productos más vendidos?',
    '🥗 ¿Algo para mejorar la digestión? 🌿',
    '💸 ¿Tienen productos en oferta?',
  ];
};

export default function MascotChat({ onClose }) {
  const { products }                                    = useProducts();
  const { orders }                                      = useOrders();
  const { config }                                      = useStoreContext();
  const location                                        = useLocation();
  const navigate                                        = useNavigate();
  const isAdmin                                         = location.pathname.startsWith('/admin');

  const STORAGE_KEY     = isAdmin ? 'savit_admin_chat_history'   : 'savit_client_chat_history';
  const API_HISTORY_KEY = isAdmin ? 'savit_admin_api_history'    : 'savit_client_api_history';

  const { addItem, items: cartItems, totalPrice, setCartOpen } = useCart();
  const { toggleFavorite }                              = useFavorites();
  const { triggerFlyAnimation }                         = useAddToCartAnimation();

  const [messages, setMessages] = useState([]);
  
  // Carga inicial silente: el historial viejo se queda oculto
  const [hiddenHistory, setHiddenHistory] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [input, setInput]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState('');
  const [streamingId, setStreamingId]       = useState(null);
  const [viewportHeight, setViewportHeight] = useState(window.visualViewport?.height || window.innerHeight);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef    = useRef(null);
  const inputRef          = useRef(null);
  const historyRef        = useRef([]);
  const proactiveShownRef = useRef(false); // Previene mostrar saludo admin más de una vez

  // Cargar historial API al montar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(API_HISTORY_KEY);
      historyRef.current = saved ? JSON.parse(saved) : [];
    } catch { historyRef.current = []; }
  }, [API_HISTORY_KEY]);

  // Persistir mensajes en sessionStorage
  useEffect(() => {
    try {
      // Guardamos la combinación del viejo oculto (si no se ha revelado) + los nuevos
      const combined = [...hiddenHistory, ...messages];
      if (combined.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      
      if (historyRef.current.length > 0) {
        sessionStorage.setItem(API_HISTORY_KEY, JSON.stringify(historyRef.current));
      }
    } catch { /* sessionStorage lleno: ignorar */ }
  }, [messages, hiddenHistory, STORAGE_KEY, API_HISTORY_KEY]);

  // Keyboard height sensor (mobile)
  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => setViewportHeight(window.visualViewport.height);
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll al fondo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Scroll instantáneo al montar (chat persistido)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus en el input al abrir
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  // MEJORA 4: Saludo proactivo del admin al abrir el chat por primera vez
  useEffect(() => {
    if (!isAdmin || proactiveShownRef.current) return;
    if (!products?.length) return; // Esperar a que carguen los productos
    // Si ya hay mensajes (chat persistido), no mostrar saludo
    const savedMessages = (() => {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })();
    if (savedMessages.length > 0) { proactiveShownRef.current = true; return; }

    proactiveShownRef.current = true;
    const greeting = buildProactiveGreeting(orders || [], products || []);
    if (greeting) {
      const greetingMsg = { role: 'ai', text: greeting, id: Date.now() };
      setMessages([greetingMsg]);
      historyRef.current = [{ role: 'ai', text: greeting }];
    }
  }, [isAdmin, products?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmClearChat = () => {
    setMessages([]);
    setHiddenHistory([]);
    historyRef.current = [];
    proactiveShownRef.current = false; // Permitir que vuelva a aparecer el saludo
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(API_HISTORY_KEY);
    setShowClearConfirm(false);
  };

  // ─── Helper: Mensaje de sistema post-adición al carrito (Regla 3-1-0) ─────────
  // cartSizeBefore = número de items ANTES de agregar el nuevo producto
  const buildCartSystemMessage = (productName, cartSizeBefore) => {
    const cartSummary = cartItems.length > 0
      ? `El carrito actual tiene: ${cartItems.map(i => `${i.name} (x${i.quantity})`).join(', ')}.`
      : '';

    if (cartSizeBefore === 0) {
      // Primer producto: venta cruzada activa
      return (
        `(SISTEMA: El cliente acaba de agregar "${productName}" como su PRIMER producto. ` +
        `Usa el MODO_CRUZADA de la Regla 9: confirma con entusiasmo, sugiere 1-2 complementos ` +
        `con [ID:xxx] y [ACTION:Agregar X|TECH:ADD_TO_CART:xxx], termina con ` +
        `[ACTION:Ver carrito 🛒|TECH:OPEN_CART] y [ACTION:Seguir explorando 🌿|/catalog].)`
      );
    }

    if (cartSizeBefore === 1) {
      // Segundo producto: confirmación silenciosa, sin presión
      return (
        `(SISTEMA: El cliente acaba de agregar "${productName}" — ya es su segundo producto. ` +
        `${cartSummary} Usa el MODO_SILENCIOSO de la Regla 9: UNA frase de confirmación corta ` +
        `y solo [ACTION:Ver carrito 🛒|TECH:OPEN_CART]. Sin sugerencias extra.)`
      );
    }

    // Tercer producto o más: modo cierre
    const totalItems = cartSizeBefore + 1;
    return (
      `(SISTEMA: El cliente acaba de agregar "${productName}" — lleva ${totalItems} productos en el carrito. ` +
      `${cartSummary} Usa el MODO_CIERRE de la Regla 9: celebra su selección mencionando ` +
      `cómo combinan los productos, genera confianza para finalizar y termina con ` +
      `[ACTION:Finalizar pedido ✅|TECH:GO_TO_CART] y [ACTION:Seguir agregando 🛒|/catalog].)`
    );
  };


  const formatMessage = (text) => {
    if (!text) return null;
    const clean = cleanAiText(text);
    if (!clean) return null;

    const lines = clean.split('\n');
    return lines.map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} style={{ fontWeight: '800', color: 'inherit' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        {i < lines.length - 1 && <br />}
      </span>
    ));
  };

  // PROBLEMA H FIX: Auto-resize del textarea
  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // ─── Envío de Mensaje con Streaming ───────────────────────────────────────────
  const sendMessage = useCallback(async (text, options = {}) => {
    const { hidden = false, displayOverride = null } = options;
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    if (!text) {
      setInput('');
      // Reset textarea height
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
    setError('');

    const userMsg = {
      role:    'user',
      text:    displayOverride || userText,
      id:      Date.now(),
      hidden,
    };

    setMessages(prev => [...prev, userMsg]);
    const historyForAPI = [...historyRef.current]; // Snapshot inmutable del historial
    setIsLoading(true);

    // Crear placeholder de streaming
    const aiMsgId = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'ai', text: '', id: aiMsgId, streaming: true }]);
    setStreamingId(aiMsgId);

    try {
      let aiText;

      if (isAdmin) {
        // PROBLEMA D FIX: Admin usa el Analista Estratégico completo con streaming
        const onChunkAdmin = (fullText) => {
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
          );
        };
        aiText = await sendMessageToAnalyst(
          userText,
          orders || [],
          products || [],
          config,
          historyForAPI,
          location.pathname,
          onChunkAdmin
        );
      } else {
        // Cliente: usa el Vendedor Élite con streaming
        const safeOrders = orders || [];
        const safeCart = cartItems || [];
        const userBehavior = {
          interests:    getProductInterests(),
          recentOrders: safeOrders.slice(0, 5),
          currentPage:  location.pathname,
          cart: {
            itemCount: safeCart.length,
            items:     safeCart.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
            total:     totalPrice || 0,
            isEmpty:   safeCart.length === 0,
          },
          activeOrder: safeOrders[0] ? {
            id:           safeOrders[0].id,
            status:       safeOrders[0].status,
            total:        safeOrders[0].total,
            itemsSummary: (safeOrders[0].items || []).map(i => i.name).join(', '),
          } : null,
          // MEJORA 1: Historial de productos comprados para upsell personalizado
          purchaseHistory: safeOrders
            .filter(o => ['delivered', 'completed', 'entregado'].includes((o.status || '').toLowerCase()))
            .slice(0, 5)
            .flatMap(o => (o.items || []).map(i => i.name))
            .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicar
            .slice(0, 10),
          storeConfig: {
            paymentAccount:     config.paymentAccount,
            paymentBank:        config.paymentBank,
            paymentAccountType: config.paymentAccountType,
            paymentQRCodeUrl:   config.paymentQRCodeUrl,
          },
        };

        const onChunk = (fullText) => {
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
          );
        };

        aiText = await sendMessageToAI(
          userText, products, historyForAPI, false, userBehavior, onChunk
        );
      }

      // Finalizar mensaje (quitar streaming: true)
      setMessages(prev =>
        prev.map(m => m.id === aiMsgId ? { ...m, text: aiText, streaming: false } : m)
      );

      // PROBLEMA A FIX: Limitar historial a 20 entradas (10 turnos completos)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: userText },
        { role: 'ai',   text: aiText },
      ].slice(-20);

    } catch (err) {
      console.error('Sávit AI Error:', err);
      setError(`Hubo un problema: ${err.message}`);
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }, [input, isLoading, products, isAdmin, orders, config, cartItems, totalPrice, location.pathname]);

  // ─── Manejo de Acciones ────────────────────────────────────────────────────────
  const handleActionClick = async (action, e) => {
    const { cmd } = action;

    if (cmd.startsWith('TECH:ADD_TO_CART:')) {
      const productId = cmd.replace('TECH:ADD_TO_CART:', '').trim();
      const product   = products.find(p => String(p.id).toLowerCase() === productId.toLowerCase());
      if (product) {
        const cartSizeBefore = cartItems.length; // Capturar ANTES de agregar
        addItem(product);
        vibrateSuccess();
        if (e?.currentTarget) triggerFlyAnimation(e.currentTarget, product.imageUrl || product.image);
        sendMessage(
          buildCartSystemMessage(product.name, cartSizeBefore),
          { hidden: true, displayOverride: `¡Listo! Agregué ${product.name} 🛒` }
        );
      }
      return;
    }

    if (cmd.startsWith('TECH:ADD_TO_FAVORITES:')) {
      const productId = cmd.replace('TECH:ADD_TO_FAVORITES:', '').trim();
      const product   = products.find(p => String(p.id).toLowerCase() === productId.toLowerCase());
      if (product) {
        toggleFavorite(product);
        vibrateSuccess();
        sendMessage(
          `(SISTEMA: El cliente guardó "${product.name}" en favoritos. Confirma.)`,
          { hidden: true, displayOverride: `Guardé ${product.name} en mis favoritos. ✨` }
        );
      }
      return;
    }

    if (cmd === 'TECH:GO_TO_CART')  { onClose(); navigate('/checkout'); return; }
    if (cmd === 'TECH:OPEN_CART')   { onClose(); setCartOpen(true);     return; }
    if (cmd === 'TECH:GO_TO_ORDERS'){ onClose(); navigate('/orders');   return; }

    // Navegación por alias: admin → rutas admin, cliente → rutas cliente
    const navMap = {
      'pedidos':         isAdmin ? '/admin/orders'    : '/orders',
      'inventario':      '/admin/products',
      'configuracion':   '/admin/settings',
      'ofertas':         '/admin/promos',
      'dashboard':       '/admin',
      '/mis-pedidos':    '/orders',
      '/pedidos':        '/orders',
      'go_to_orders':    '/orders',
      'view_orders':     '/orders',
      '/checkout':       '/checkout',
      '/cart':           '/checkout',
    };

    if (cmd.startsWith('/') || navMap[cmd]) {
      onClose();
      navigate(navMap[cmd] || cmd);
      return;
    }

    // Fallback: tratarlo como texto de mensaje
    sendMessage(cmd);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Tarjeta de Datos de Pago ──────────────────────────────────────────────────
  const PaymentDetails = ({ account, bank, type, qrUrl }) => {
    const handleDownloadQR = async () => {
      try {
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'QR_Pago_Savit.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        vibrateSuccess();
      } catch (err) {
        window.open(qrUrl, '_blank');
      }
    };

    return (
      <div className="chat-payment-card pulse-in">
        <div className="payment-card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Datos de Transferencia</span>
        </div>
        <div className="payment-card-body">
          <div className="payment-main-info">
            <div className="payment-field">
              <label>Banco:</label>
              <span>{bank || 'No especificado'}</span>
            </div>
            <div className="payment-field">
              <label>Tipo:</label>
              <span>{type || 'Ahorros'}</span>
            </div>
          </div>
          {account && (
            <div className="payment-field">
              <label>Número de Cuenta:</label>
              <div className="payment-value">
                <strong>{account}</strong>
                <button
                  className="copy-btn"
                  onClick={() => { navigator.clipboard.writeText(account); vibrateSuccess(); }}
                  title="Copiar número"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          {qrUrl && (
            <div className="payment-qr-wrapper">
              <img src={qrUrl} alt="QR de Pago" className="payment-qr-img" />
              <button 
                className="chat-action-btn" 
                onClick={handleDownloadQR}
                style={{ margin: '8px auto 0', width: '100%', justifyContent: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar QR a la galería
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isEmpty = messages.filter(m => !m.hidden).length === 0;

  return (
    <div className="mascot-chat-overlay" onClick={onClose}>
      <div
        className="mascot-chat-panel"
        onClick={e => e.stopPropagation()}
        style={{
          height:        viewportHeight < window.innerHeight * 0.8 ? `${viewportHeight}px` : '85vh',
          maxHeight:     '85vh',
          paddingBottom: viewportHeight < window.innerHeight * 0.8 ? '20px' : '0px',
          borderRadius:  viewportHeight < window.innerHeight * 0.8 ? '32px 32px 0 0' : '32px',
        }}
      >
        {/* ── Header ── */}
        <div className="mascot-chat-header">
          <div className="chat-header-avatar ai-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="chat-header-info">
            <p className="chat-header-name">{isAdmin ? 'Sávit Admin AI' : 'Sávit IA'}</p>
            <p className="chat-header-status">
              <span className="chat-status-dot" />
              {isAdmin ? 'Analista Estratégico 70B' : 'Asistente de Bienestar Premium'}
            </p>
          </div>
          <div className="chat-header-actions" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="chat-header-btn clear-btn"
              onClick={() => setShowClearConfirm(true)}
              title="Nueva conversación"
              aria-label="Vaciar chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </svg>
            </button>
            <button className="chat-close-btn" onClick={onClose} aria-label="Cerrar chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="mascot-chat-messages">
          {/* Botón para revelar el historial previo (Zero-Clutter) */}
          {hiddenHistory.length > 0 && (
            <div className="chat-history-loader" style={{ textAlign: 'center', marginBottom: '16px' }}>
              <button 
                className="chat-chip"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => {
                  setMessages(prev => [...hiddenHistory, ...prev]);
                  setHiddenHistory([]);
                }}
              >
                ⏳ Ver mensajes anteriores ({hiddenHistory.length})
              </button>
            </div>
          )}

          {isEmpty && (
            <div className="chat-welcome">
              <span className="chat-welcome-emoji">{isAdmin ? '📊' : '✨'}</span>
              <h3>{isAdmin ? 'Analista Estratégico Sávit' : '¡Hola! Soy Sávit IA'}</h3>
              <p>
                {isAdmin
                  ? 'Tu consultor ejecutivo de inteligencia de negocios. Analizo ventas, stock y proyecciones en tiempo real.'
                  : 'Tu asistente experto en nutrición y bienestar. Encuentra lo que buscas y cómpralo en segundos.'}
              </p>
            </div>
          )}

          {messages.map(msg => {
            if (msg.hidden) return null;

            // Detección ANTES de la limpieza
            const detectedProducts = msg.role === 'ai'
              ? parseProductIds(msg.text, products || [])
              : [];
            const actions     = parseActions(msg.text);
            const paymentInfo = hasPaymentInfo(msg.text);
            const cleanText   = cleanAiText(msg.text);

            // Ocultar solo si no hay nada que mostrar (excepción: streaming activo)
            if (!cleanText && actions.length === 0 && detectedProducts.length === 0 && !paymentInfo) {
              if (!msg.streaming) return null;
            }

            const isStreaming = msg.streaming || msg.id === streamingId;

            return (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="chat-msg-avatar ai-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                )}
                <div className="chat-msg-bubble-wrapper">
                  <div className={`chat-msg-bubble${isStreaming ? ' streaming' : ''}`}>
                    {cleanText
                      ? formatMessage(msg.text)
                      : isStreaming && (
                        <div className="typing-indicator-container">
                          <span>{isAdmin ? 'Analizando' : 'Sávit AI está escribiendo'}</span>
                          <div className="typing-indicator">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                        </div>
                      )
                    }

                    {/* Botones de acción */}
                    {msg.role === 'ai' && actions.length > 0 && (
                      <div className="chat-action-buttons">
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            className="chat-action-btn"
                            onClick={e => handleActionClick(action, e)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tarjeta de pago — BUG 5 FIX */}
                    {paymentInfo && (
                      <PaymentDetails
                        account={config.paymentAccount}
                        bank={config.paymentBank}
                        type={config.paymentAccountType}
                        qrUrl={config.paymentQRCodeUrl}
                      />
                    )}
                  </div>

                  {/* Miniaturas de productos */}
                  {detectedProducts.length > 0 && (
                    <div className="chat-product-suggestions">
                      {detectedProducts.map(p => (
                        <ChatProductCard
                          key={p.id}
                          product={p}
                          mode={msg.text.toLowerCase().includes('favorito') ? 'favorite' : 'cart'}
                          onAddToCart={() => {
                            const cartSizeBefore = cartItems.length; // Capturar ANTES de agregar
                            addItem(p);
                            vibrateSuccess();
                            sendMessage(
                              buildCartSystemMessage(p.name, cartSizeBefore),
                              { hidden: true, displayOverride: `¡Listo! Agregué ${p.name} 🛒` }
                            );
                          }}
                          onFavorite={() => {
                            toggleFavorite(p);
                            vibrateSuccess();
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicador de carga solo cuando NO hay streaming activo */}
          {isLoading && !streamingId && (
            <div className="chat-message ai">
              <div className="chat-msg-avatar ai-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          {error && <p className="chat-error-msg">⚠️ {error}</p>}
          <div ref={messagesEndRef} />
        </div>

        {/* PROBLEMA I FIX: Chips contextuales inteligentes */}
        {isEmpty && (
          <div className="chat-suggestions">
            {getDynamicSuggestions(isAdmin, cartItems, orders).map(s => (
              <button key={s} className="chat-chip" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div className="mascot-chat-input-area">
          <div className="chat-input-row">
            {/* PROBLEMA H FIX: Textarea con auto-resize */}
            <textarea
              ref={inputRef}
              className="chat-input-field"
              placeholder={isAdmin ? '¿Qué analizamos hoy?' : '¿En qué te puedo ayudar?'}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
              style={{ resize: 'none', overflowY: 'hidden' }}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              aria-label="Enviar mensaje"
            >
              {isLoading ? (
                <span className="btn-loading-icon">⏳</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Modal Confirmación de Limpieza ── */}
        {showClearConfirm && (
          <div className="chat-modal-overlay">
            <div className="chat-modal-content">
              <h4>¿Iniciar nueva conversación?</h4>
              <p>Se borrará el historial y la IA comenzará desde cero.</p>
              <div className="chat-modal-actions">
                <button className="chat-modal-btn cancel" onClick={() => setShowClearConfirm(false)}>
                  Cancelar
                </button>
                <button className="chat-modal-btn confirm" onClick={confirmClearChat}>
                  Sí, vaciar chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
