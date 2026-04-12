// src/components/ui/CustomerWizard.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../../context/CustomerContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { db, isFirebaseConfigured } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import './CustomerWizard.css';

// Pasos del wizard:
//  1 → Pedir número de WhatsApp
//  2 → (solo nuevos) Pedir nombre
//  3 → Pantalla de bienvenida / éxito

export default function CustomerWizard({ onClose }) {
  const navigate = useNavigate();
  const { customer, checkCustomer, identifyCustomer, logoutCustomer, loading } = useCustomer();
  const [step, setStep] = useState(customer ? 'profile' : 1);
  const [phone, setPhone] = useState(customer?.phone || '');
  const [name, setName] = useState(customer?.name || '');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [checking, setChecking] = useState(false);
  const [isReturning, setIsReturning] = useState(false); // true si el número ya existe con otro nombre

  const isAdminAuth = localStorage.getItem('savit_admin_auth') === 'true';
  const [savitPoints, setSavitPoints] = useState(0);

  // Live points for profile view
  useEffect(() => {
    const phone = customer?.phone;
    if (!phone || step !== 'profile') return;
    if (!isFirebaseConfigured()) return;
    const ref = doc(db, 'customers', phone);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setSavitPoints(snap.data().savitPoints || 0);
    });
    return () => unsub();
  }, [customer?.phone, step]);

  // Lock body scroll when wizard is open
  useBodyScrollLock(true);

  // ── Paso 1: validar número y buscar en Firestore
  const handlePhoneNext = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 12) {
      setPhoneError('Número inválido. Ingresa entre 7 y 12 dígitos');
      return;
    }

    setChecking(true);
    const existing = await checkCustomer(digits);
    setChecking(false);

    if (existing?.name) {
      // Cliente recurrente → identificarlo directamente y mostrar bienvenida
      setName(existing.name);
      setIsReturning(true);
      await identifyCustomer({ name: existing.name, phone: digits });
      setStep(3);
      setTimeout(onClose, 2200);
    } else {
      // Cliente nuevo → pedir nombre
      setIsReturning(false);
      setStep(2);
    }
  };

  // ── Paso 2: guardar cliente nuevo / actualizar perfil
  const handleNameSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Por favor ingresa tu nombre completo');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    await identifyCustomer({ name: trimmed, phone: digits });
    
    if (step === 'profile') {
      onClose(); // Cerrar directo si es perfil
    } else {
      setStep(3);
      setTimeout(onClose, 2200);
    }
  };

  const handleLogout = () => {
    logoutCustomer();
    onClose();
    navigate('/');
  };

  // ── Continuar como invitado
  const handleGuest = () => onClose();

  // ── Texto dinámico del header
  const headerTitle = step === 'profile' ? 'Tu Perfil'
    : step === 3
    ? (isReturning ? `¡Bienvenido de nuevo, ${name.split(' ')[0]}! 👋` : `¡Hola, ${name.split(' ')[0]}! 🎉`)
    : 'Identifícate en Sávit';

  const subtitles = {
    1: 'Tu número es tu llave de acceso',
    2: 'Cuéntanos cómo saludarte',
    3: isReturning ? 'Te reconocimos al instante 🌿' : '¡Tu perfil está listo! 🌿',
    profile: 'Gestiona tus datos de cliente',
  };

  const dots = [1, 2];

  // ── Vista de Perfil (Retorno Temprano)
  if (step === 'profile') {
    return createPortal(
      <div className="cw-overlay" onClick={onClose}>
        <div className="cw-card" onClick={e => e.stopPropagation()}>
          <button className="cw-close-btn" onClick={onClose} aria-label="Cerrar modal">✕</button>
          
          <div className="cw-header">
            <div className="cw-logo">🌿</div>
            <h1 className="cw-header-title">{headerTitle}</h1>
            <p className="cw-header-sub">{subtitles[step]}</p>
          </div>

          <div className="cw-body cw-step">
            {/* Points badge */}
            <div className="cw-points-badge" onClick={() => { onClose(); navigate('/rewards'); }}>
              <span className="cw-points-icon">⭐</span>
              <div>
                <span className="cw-points-value">{savitPoints.toLocaleString()} Sávit Puntos</span>
                <span className="cw-points-sub">Ver catálogo de premios →</span>
              </div>
            </div>

            <div className="cw-step-icon" style={{ marginTop: '8px' }}>👤</div>
            <div className="cw-field">
              <label className="cw-label">Tu nombre</label>
              <input
                className={`cw-input${nameError ? ' error' : ''}`}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setNameError(''); }}
              />
              {nameError && <p className="cw-error">⚠ {nameError}</p>}
            </div>
            <div className="cw-field">
              <label className="cw-label">WhatsApp (No editable)</label>
              <div className="cw-phone-row disabled">
                <div className="cw-prefix">🇨🇴 +57</div>
                <input className="cw-input" type="tel" value={phone} disabled />
              </div>
            </div>
          </div>

          <div className="cw-actions">
            <button className="cw-btn-primary" onClick={handleNameSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            
            {isAdminAuth && (
              <button 
                className="cw-btn-outline" 
                style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)', marginTop: 'var(--space-sm)' }}
                onClick={() => { onClose(); navigate('/admin'); }}
              >
                🛡️ Panel Administrativo
              </button>
            )}

            <button className="cw-btn-ghost cw-btn-danger" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Vistas del Wizard (Identificación)
  return createPortal(
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-card" onClick={e => e.stopPropagation()}>
        
        <button className="cw-close-btn" onClick={onClose} aria-label="Cerrar modal">✕</button>

        <div className="cw-header">
          <div className="cw-logo">🌿</div>
          <h1 className="cw-header-title">{headerTitle}</h1>
          <p className="cw-header-sub">{subtitles[step]}</p>
          {step < 3 && (
            <div className="cw-progress">
              {dots.map(n => (
                <div
                  key={n}
                  className={`cw-dot${n === step ? ' active' : n < step ? ' done' : ''}`}
                />
              ))}
            </div>
          )}
        </div>

        {step === 1 && (
          <div className="cw-body cw-step">
            <div className="cw-step-icon">📱</div>
            <h2 className="cw-step-title">¿Cuál es tu WhatsApp?</h2>
            <p className="cw-step-desc">Si ya compraste antes, te reconoceremos al instante</p>
            <div className="cw-field">
              <label className="cw-label">Número de WhatsApp</label>
              <div className="cw-phone-row">
                <div className="cw-prefix">🇨🇴 +57</div>
                <input
                  id="cw-phone"
                  className={`cw-input${phoneError ? ' error' : ''}`}
                  type="tel"
                  placeholder="300 123 4567"
                  value={phone}
                  autoFocus
                  autoComplete="tel"
                  inputMode="numeric"
                  onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneNext()}
                />
              </div>
              {phoneError && <p className="cw-error">⚠ {phoneError}</p>}
            </div>
            
            <div className="cw-actions">
              <button
                className="cw-btn-primary"
                onClick={handlePhoneNext}
                disabled={checking || loading}
              >
                {checking ? 'Buscando…' : 'Continuar →'}
              </button>
              <div className="cw-divider"><span>o</span></div>
              <button className="cw-btn-ghost" onClick={handleGuest}>
                Continuar como invitado
              </button>
              <button 
                className="cw-btn-home" 
                onClick={() => {
                  onClose();
                  navigate('/');
                }} 
              >
                🏠 Volver al Inicio
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="cw-body cw-step">
            <div className="cw-step-icon">👋</div>
            <h2 className="cw-step-title">¿Cómo te llamas?</h2>
            <p className="cw-step-desc">Así te saludaremos cada vez que entres a Sávit</p>
            <div className="cw-field">
              <label className="cw-label">Tu nombre</label>
              <input
                id="cw-name"
                className={`cw-input${nameError ? ' error' : ''}`}
                type="text"
                placeholder="Ej: María García"
                value={name}
                autoFocus
                autoComplete="given-name"
                onChange={e => { setName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              />
              {nameError && <p className="cw-error">⚠ {nameError}</p>}
            </div>

            <div className="cw-actions">
              <button className="cw-btn-primary" onClick={handleNameSave} disabled={loading}>
                {loading ? 'Guardando…' : 'Comenzar →'}
              </button>
              <button className="cw-btn-back" onClick={() => setStep(1)}>← Volver</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="cw-body cw-step">
             <div className="cw-step-icon">{isReturning ? '🌿' : '🎉'}</div>
             <h2 className="cw-step-title">Todo listo</h2>
             <p className="cw-step-desc">Espéranos un momento...</p>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
