// src/components/ui/MascotChat.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { sendMessageToAI } from '../../services/aiService';
import './MascotChat.css';

const STORAGE_KEY = 'savit_gemini_api_key';

const SUGGESTIONS = [
  '¿Qué productos tienes disponibles? 🛒',
  '¿Algo para mejorar la digestión? 🌿',
  '¿Cuál es el más económico? 💚',
  '¿Tienen snacks saludables? 🥜',
];

export default function MascotChat({ onClose }) {
  const { products } = useProducts();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewportHeight, setViewportHeight] = useState(window.visualViewport?.height || window.innerHeight);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);

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

  // 📱 Keyboard height sensor (VisualViewport)
  useEffect(() => {
    if (!window.visualViewport) return;
    
    const handleResize = () => {
      setViewportHeight(window.visualViewport.height);
    };
    
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

  // 🎯 Scroll Lock: Prevent background scroll when chat is open
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

    // Build history for API (exclude current message)
    const historyForAPI = historyRef.current;

    setIsLoading(true);

    try {
      const aiText = await sendMessageToAI(userText, products, historyForAPI);

      // Update history
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', text: userText },
        { role: 'ai', text: aiText },
      ];

      setMessages(prev => [...prev, { role: 'ai', text: aiText, id: Date.now() + 1 }]);
    } catch (err) {
      console.error('Sávit AI Error:', err);
      setError(`Hubo un problema al conectar con Sávit IA: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, products]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="mascot-chat-overlay" onClick={onClose}>
      <div 
        className="mascot-chat-panel" 
        onClick={e => e.stopPropagation()}
        style={{ 
          height: viewportHeight < window.innerHeight * 0.8 ? `${viewportHeight}px` : '85vh',
          maxHeight: '85vh',
          paddingBottom: viewportHeight < window.innerHeight * 0.8 ? '20px' : '0px',
          borderRadius: viewportHeight < window.innerHeight * 0.8 ? '32px 32px 0 0' : '32px'
        }}
      >

        {/* ── Header ── */}
        <div className="mascot-chat-header">
          <div className="chat-header-avatar">
            <img src="/mascot.png" alt="Sávit" />
          </div>
          <div className="chat-header-info">
            <p className="chat-header-name">Sávit IA</p>
            <p className="chat-header-status">
              <span className="chat-status-dot" />
              Asistente de Bienestar Premium
            </p>
          </div>
          <button className="chat-close-btn" onClick={onClose} aria-label="Cerrar chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="mascot-chat-messages">
          {isEmpty && (
            <div className="chat-welcome">
              <span className="chat-welcome-emoji">🐿️</span>
              <h3>¡Hola! Soy Sávit IA</h3>
              <p>Tu asistente experta en nutrición y bienestar. Pregúntame lo que necesites sobre nuestros productos y salud.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              {msg.role === 'ai' && (
                <div className="chat-msg-avatar">
                  <img src="/mascot.png" alt="Sávit" />
                </div>
              )}
              <div className="chat-msg-bubble">{formatMessage(msg.text)}</div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message ai">
              <div className="chat-msg-avatar">
                <img src="/mascot.png" alt="Sávit" />
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

        {/* ── Suggestion Chips (solo si no hay mensajes) ── */}
        {isEmpty && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="chat-chip" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div className="mascot-chat-input-area">
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              className="chat-input-field"
              placeholder="¿En qué te puedo ayudar?"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
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
