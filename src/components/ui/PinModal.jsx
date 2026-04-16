// src/components/ui/PinModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCustomer } from '../../context/CustomerContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import './PinModal.css';

/**
 * PinModal — Reusable 4-digit PIN verification modal.
 *
 * Props:
 *  - title: string — context message shown above inputs
 *  - onVerified: () => void — called when PIN is correct
 *  - onCancel: () => void — called when user closes or cancels
 *  - onCreatePin: () => void — called when user clicks "Create PIN" (no PIN set)
 */
export default function PinModal({ title = 'Confirma tu identidad', onVerified, onCancel, onCreatePin }) {
  const { hasPin, verifyPin } = useCustomer();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);

  useBodyScrollLock(true);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError('');

    // Auto-advance to next input
    if (cleaned && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are filled
    if (cleaned && index === 3) {
      const fullPin = [...next.slice(0, 3), cleaned].join('');
      if (fullPin.length === 4) handleVerify(fullPin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (pinOverride) => {
    const pin = pinOverride || digits.join('');
    if (pin.length < 4) {
      setError('Ingresa los 4 dígitos de tu PIN');
      return;
    }
    setChecking(true);
    const ok = await verifyPin(pin);
    setChecking(false);

    if (ok) {
      onVerified();
    } else {
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setShake(true);
      setDigits(['', '', '', '']);
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 600);
    }
  };

  // If the customer has no PIN yet — show a special message
  if (!hasPin) {
    return createPortal(
      <div className="pin-modal-overlay" onClick={onCancel}>
        <div className="pin-modal-card pin-modal-card--no-pin animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="pin-modal-icon">🔒</div>
          <h3 className="pin-modal-title">PIN de Seguridad Requerido</h3>
          <p className="pin-modal-desc">
            Para proteger tu cuenta, necesitas crear un PIN de 4 dígitos antes de continuar.
          </p>
          <button className="pin-btn-primary" onClick={onCreatePin}>
            Crear mi PIN ahora
          </button>
          <button className="pin-btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="pin-modal-overlay" onClick={onCancel}>
      <div className={`pin-modal-card animate-slide-up ${shake ? 'pin-shake' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="pin-modal-close" onClick={onCancel} aria-label="Cerrar">✕</button>

        <div className="pin-modal-icon">🔐</div>
        <h3 className="pin-modal-title">{title}</h3>
        <p className="pin-modal-desc">Ingresa tu PIN de 4 dígitos para continuar</p>

        <div className="pin-inputs-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              className={`pin-input ${d ? 'pin-input--filled' : ''} ${error ? 'pin-input--error' : ''}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoComplete="off"
            />
          ))}
        </div>

        {error && <p className="pin-error-msg">⚠ {error}</p>}

        <button
          className="pin-btn-primary"
          onClick={() => handleVerify()}
          disabled={checking || digits.join('').length < 4}
        >
          {checking ? <span className="spinner" /> : 'Verificar'}
        </button>

        <button className="pin-btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>,
    document.body
  );
}
