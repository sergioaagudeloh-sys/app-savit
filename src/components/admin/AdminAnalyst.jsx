// src/components/admin/AdminAnalyst.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewportHeight, setViewportHeight] = useState(window.visualViewport?.height || window.innerHeight);
  const historyRef = useRef([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const formatMessage = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} style={{ fontWeight: '800', color: 'inherit' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  // 📱 Keyboard height sensor
  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => setViewportHeight(window.visualViewport.height);
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
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
      const aiText = await sendMessageToAnalyst(userText, orders, products, config, historyForAPI);

      // Update history
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: userText },
        { role: 'model', text: aiText },
      ];

      setMessages(prev => [...prev, { role: 'ai', text: aiText, id: Date.now() + 1 }]);
    } catch (err) {
      console.error('Admin Analyst Error:', err);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, orders, products, config]);

  const generateDailyInsight = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    
    // Add visual feedback of user request
    const userMsg = { role: 'user', text: "✨ Dame el resumen y consejo del día.", id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const prompt = `Actúa como Sávit AI, mi asistente de negocio.
Genera un consejo rápido del día (1 párrafo corto).
Resume cómo van las ventas hoy y sugiéreme una alerta o acción relacionada con productos poco vendidos u ofertas. Sé directo, motivador y usa emojis.`;
      
      const historyForAPI = historyRef.current;
      const aiText = await sendMessageToAnalyst(prompt, orders, products, config, historyForAPI);
      
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: "✨ Dame el resumen y consejo del día." },
        { role: 'model', text: aiText },
      ];

      setMessages(prev => [...prev, { role: 'ai', text: aiText, id: Date.now() + 1 }]);
    } catch (err) {
      console.error('Error generando insight:', err);
      setError(`No pude generar el consejo. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
          borderRadius: viewportHeight < window.innerHeight * 0.8 ? '0' : '24px'
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

          {messages.map(msg => (
            <div key={msg.id} className={`analyst-message ${msg.role === 'user' ? 'user' : 'ai'}`}>
               {formatMessage(msg.text)}
            </div>
          ))}

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
