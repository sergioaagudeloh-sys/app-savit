// src/components/admin/AdminAnalyst.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendMessageToAnalyst } from '../../services/adminAiService';
import { vibrateTap } from '../../utils/haptics';
import './AdminAnalyst.css';

const SUGGESTIONS = [
  '¿Cuál es el balance estratégico de este mes? 📊',
  'Analiza los productos con bajo inventario 📦',
  '¿Qué impacto tuvieron las ventas de hoy? 💰',
  'Dame una táctica para aumentar la rentabilidad 💡',
];

export default function AdminAnalyst({ orders, products, config, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('savit_admin_analyst_messages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewportHeight, setViewportHeight] = useState(window.visualViewport?.height || window.innerHeight);

  const historyRef = useRef([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar historial de la API al montar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('savit_admin_analyst_api');
      if (saved) historyRef.current = JSON.parse(saved);
    } catch (e) { console.warn('Error cargando historial analista:', e); }
  }, []);

  // Persistir mensajes y contexto de API en cada cambio
  useEffect(() => {
    try {
      sessionStorage.setItem('savit_admin_analyst_messages', JSON.stringify(messages));
      sessionStorage.setItem('savit_admin_analyst_api', JSON.stringify(historyRef.current));
    } catch (e) {
      console.warn('Error persistiendo analista:', e);
    }
  }, [messages]);

  // FIX BUG 12: lines calculado una sola vez fuera del map
  const formatMessage = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
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

  // Extrae botones [ACTION:Texto|Comando]
  const getDetectedActions = (text) => {
    if (!text) return [];
    const regex = /\[\s*ACTION:\s*(.*?)\s*\|\s*(.*?)\s*\]/g;
    const actions = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      actions.push({ label: match[1].trim(), cmd: match[2].trim() });
    }
    return actions;
  };

  const handleActionClick = (action) => {
    const { cmd } = action;

    // Mapa de rutas administrativas
    const adminNavMap = {
      'pedidos':       '/admin/orders',
      'inventario':    '/admin/products',
      'stock':         '/admin/products',
      'configuracion': '/admin/config',
      'ofertas':       '/admin/offers',
      'dashboard':     '/admin'
    };

    const targetRoute = adminNavMap[cmd.toLowerCase()] || (cmd.startsWith('/') ? cmd : null);

    if (targetRoute) {
      vibrateTap();
      onClose();
      navigate(targetRoute);
    } else {
      // Si no es ruta, se envía como mensaje de texto
      sendMessage(cmd);
    }
  };

  // 📱 Keyboard height sensor
  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => setViewportHeight(window.visualViewport.height);
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // FIX: Force scroll to bottom on mount (Elite persistence fix)
  useEffect(() => {
    if (messages.length > 0) {
      // Instant scroll
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      // Extra check for layout stability
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // FIX BUG 7: setTimeout con cleanup para evitar memory leak
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  // Scroll Lock
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    setInput('');
    setError('');

    // Add user message
    const userMsg = { role: 'user', text: userText, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);

    try {
      const historyForAPI = historyRef.current;
      // Pasa currentPage para que la IA sepa en qué sección está el admin
      const aiText = await sendMessageToAnalyst(userText, orders, products, config, historyForAPI, currentPage);

      // FIX BUG 4: role 'model' → 'ai' (consistente con el resto de la app)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: userText },
        { role: 'ai',   text: aiText },
      ];

      setMessages(prev => [...prev, { role: 'ai', text: aiText, id: Date.now() + 1 }]);
    } catch (err) {
      console.error('Admin Analyst Error:', err);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, orders, products, config, currentPage]);

  // FIX BUG 11: useCallback con dependencias correctas para evitar historial desactualizado
  const generateDailyInsight = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    const displayText = '✨ Dame el resumen y consejo del día.';
    setMessages(prev => [...prev, { role: 'user', text: displayText, id: Date.now() }]);

    try {
      const prompt = `Dame el resumen ejecutivo del día en Sávit. 
Revisa el rendimiento de hoy vs. el histórico, identifica oportunidades de mejora, 
y dame 1 acción concreta que puedo hacer ahora mismo para aumentar las ventas. 
Sé directo, estratégico y motivador.`;

      // Usa historyRef.current para tener siempre el historial más actualizado
      const aiText = await sendMessageToAnalyst(prompt, orders, products, config, historyRef.current, currentPage);

      // FIX BUG 4: role 'model' → 'ai'
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: displayText },
        { role: 'ai',   text: aiText },
      ];

      setMessages(prev => [...prev, { role: 'ai', text: aiText, id: Date.now() + 1 }]);
    } catch (err) {
      console.error('Error generando insight:', err);
      setError(`No pude generar el consejo. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, orders, products, config, currentPage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="admin-analyst-overlay" onClick={onClose}>
      <div 
        className="admin-analyst-panel" 
        onClick={e => e.stopPropagation()}
        style={{ 
          height: viewportHeight < window.innerHeight * 0.8 ? `${viewportHeight}px` : '85vh',
          maxHeight: '85vh',
          paddingBottom: viewportHeight < window.innerHeight * 0.8 ? '25px' : '0px',
          // FIX BUG 10: '24px 24px 0 0' mantiene esquinas superiores al abrir teclado
          borderRadius: viewportHeight < window.innerHeight * 0.8 ? '24px 24px 0 0' : '24px',
        }}
      >
        
        {/* ── Header ── */}
        <div className="analyst-header">
          <div className="analyst-aura" />
          <div className="analyst-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
              <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="analyst-info">
            <p className="analyst-name">Analista Estratégico</p>
            <p className="analyst-status">
              <span className="status-pulse" />
              Asistente IA Savit
            </p>
          </div>

          <button 
            className="analyst-tip-btn ripple" 
            onClick={() => { vibrateTap(); generateDailyInsight(); }} 
            title="Sávit Intelligence: Resumen del Día"
            disabled={isLoading}
          >
            ✨
          </button>

          <button className="analyst-close-btn" onClick={() => { vibrateTap(); onClose(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="analyst-messages">
          {isEmpty && (
            <div className="analyst-welcome">
              <span className="welcome-icon">💎📊</span>
              <h3>Inteligencia de Datos Sávit</h3>
              <p>Estoy listo con el análisis en tiempo real de tu negocio para ayudarte a tomar decisiones inteligentes. ¿Qué aspecto de Sávit te gustaría optimizar hoy?</p>
            </div>
          )}

          {messages.map(msg => {
            const cleanTextFragment = msg.text
              .replace(/\[\s*.*?\s*\]/gi, '')
              .trim();

            const actions = (typeof getDetectedActions === 'function') ? getDetectedActions(msg.text) : [];

            return (
              <div key={msg.id} className={`analyst-message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                 <div className="analyst-bubble-content">
                    {formatMessage(cleanTextFragment)}
                 </div>
                 
                 {msg.role === 'ai' && actions.length > 0 && (
                   <div className="analyst-action-buttons">
                     {actions.map((action, idx) => (
                       <button
                         key={idx}
                         className="analyst-action-btn ripple"
                         onClick={e => handleActionClick(action, e)}
                       >
                         {action.label}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            );
          })}

          {isLoading && (
            <div className="analyst-message ai">
              <div className="typing-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}

          {error && <p className="chat-error-msg" style={{ color: '#ef4444', padding: '10px' }}>⚠️ {error}</p>}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggestions ── */}
        {isEmpty && (
          <div className="analyst-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="analyst-chip" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div className="analyst-input-area">
          <div className="analyst-input-container">
            <textarea
              ref={inputRef}
              className="analyst-input-field"
              placeholder="¿En qué te puedo ayudar?"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              className="analyst-send-btn"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? '...' : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
