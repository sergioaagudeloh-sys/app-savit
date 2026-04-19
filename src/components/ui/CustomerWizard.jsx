// src/components/ui/CustomerWizard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { db, isFirebaseConfigured } from '../../firebase';
import { doc } from 'firebase/firestore';
import { openWhatsAppToClient, buildWelcomeMessage } from '../../utils/whatsapp';
import { vibrateSuccess, vibrateTap } from '../../utils/haptics';
import './CustomerWizard.css';

// Pasos del wizard:
//  1 → Pedir número de WhatsApp
//  2 → (solo nuevos) Pedir nombre
//  3 → (solo nuevos) Crear PIN de seguridad
//  4 → Pantalla de bienvenida / éxito
//  'profile'     → Perfil de cliente existente
//  'create-pin'  → Crear PIN desde el perfil (sin PIN previo)

const PIN_LENGTH = 4;

/** Pequeño sub-componente de inputs de PIN */
function PinInputs({ pin, setPin, label, error }) {
  const refs = useRef([]);

  const handleChange = (i, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[i] = cleaned;
    setPin(next);
    if (cleaned && i < PIN_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="cw-field" style={{ alignItems: 'center' }}>
      <label className="cw-label" style={{ textAlign: 'center' }}>{label}</label>
      <div className="cw-pin-row">
        {pin.map((d, i) => (
          <input
            key={i}
            ref={el => refs.current[i] = el}
            className={`cw-pin-input ${d ? 'filled' : ''} ${error ? 'pin-err' : ''}`}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoComplete="new-password"
          />
        ))}
      </div>
      {error && <p className="cw-error">⚠ {error}</p>}
    </div>
  );
}

export default function CustomerWizard({ onClose }) {
  const navigate = useNavigate();
  const { isAdmin: isAuthAdmin } = useAuth();
  const { customer, checkCustomer, identifyCustomer, logoutCustomer, loading, hasPin, savePin, changePin } = useCustomer();
  const [step, setStep] = useState(customer ? 'profile' : 1);
  const [phone, setPhone] = useState(customer?.phone || '');
  const [name, setName] = useState(customer?.name || '');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [checking, setChecking] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  // PIN state
  const [pin, setPin]               = useState(Array(PIN_LENGTH).fill(''));
  const [pinConfirm, setPinConfirm] = useState(Array(PIN_LENGTH).fill(''));
  const [oldPin, setOldPin]         = useState(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError]     = useState('');
  const [savingPin, setSavingPin]   = useState(false);

  const isAdminAuth = localStorage.getItem('savit_admin_auth') === 'true';

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
      vibrateSuccess();
      changeStep(4, 1);
      setTimeout(onClose, 2200);
    } else {
      // Cliente nuevo → pedir nombre
      setIsReturning(false);
      changeStep(2, 1);
    }
  };

  // ── Paso 2: guardar nombre
  const handleNameSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Por favor ingresa tu nombre completo');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    await identifyCustomer({ name: trimmed, phone: digits });

    if (step === 'profile') {
      onClose();
    } else {
      // Ir a crear PIN (solo para nuevos clientes)
      changeStep(3, 1);
    }
  };

  // ── Paso 3: guardar PIN nuevo
  const handlePinSave = async () => {
    const pinStr = pin.join('');
    const confirmStr = pinConfirm.join('');

    if (pinStr.length < PIN_LENGTH) {
      setPinError('Ingresa los 4 dígitos de tu PIN');
      return;
    }
    if (pinStr !== confirmStr) {
      setPinError('Los PINs no coinciden. Inténtalo de nuevo.');
      setPin(Array(PIN_LENGTH).fill(''));
      setPinConfirm(Array(PIN_LENGTH).fill(''));
      return;
    }

    setSavingPin(true);
    const ok = await savePin(pinStr);
    setSavingPin(false);

    if (ok) {
      // Enviar mensaje de bienvenida a WhatsApp (cliente nuevo)
      const digits = phone.replace(/\D/g, '');
      try {
        const msg = buildWelcomeMessage(name.trim(), digits);
        openWhatsAppToClient(digits, msg);
      } catch (e) {
        console.warn('Could not send welcome WhatsApp:', e);
      }
      setStep(4);
      setTimeout(onClose, 2200);
    } else {
      setPinError('Error al guardar el PIN. Inténtalo de nuevo.');
    }
  };

  // ── Cambiar PIN desde el perfil (requiere PIN actual)
  const handleChangePin = async () => {
    const oldStr = oldPin.join('');
    const newStr = pin.join('');
    const confirmStr = pinConfirm.join('');

    if (oldStr.length < PIN_LENGTH || newStr.length < PIN_LENGTH) {
      setPinError('Ingresa todos los dígitos del PIN');
      return;
    }
    if (newStr !== confirmStr) {
      setPinError('Los nuevos PINs no coinciden');
      return;
    }

    setSavingPin(true);
    const res = await changePin(oldStr, newStr);
    setSavingPin(false);

    if (res.ok) {
      vibrateSuccess();
      setOldPin(Array(PIN_LENGTH).fill(''));
      setPin(Array(PIN_LENGTH).fill(''));
      setPinConfirm(Array(PIN_LENGTH).fill(''));
      setStep('profile');
    } else {
      setPinError(res.msg || 'Error al cambiar el PIN');
    }
  };

  // ── Crear PIN desde el perfil (sin PIN previo)
  const handleCreatePinFromProfile = async () => {
    const pinStr = pin.join('');
    const confirmStr = pinConfirm.join('');

    if (pinStr.length < PIN_LENGTH) {
      setPinError('Ingresa los 4 dígitos de tu PIN');
      return;
    }
    if (pinStr !== confirmStr) {
      setPinError('Los PINs no coinciden. Inténtalo de nuevo.');
      setPin(Array(PIN_LENGTH).fill(''));
      setPinConfirm(Array(PIN_LENGTH).fill(''));
      return;
    }

    setSavingPin(true);
    const ok = await savePin(pinStr);
    setSavingPin(false);

    if (ok) {
      setStep('profile');
    } else {
      setPinError('Error al guardar el PIN. Inténtalo de nuevo.');
    }
  };

  const handleLogout = () => {
    logoutCustomer();
    onClose();
    navigate('/');
  };

  const handleGuest = () => onClose();

  // ── Texto dinámico del header
  const headerTitle =
    step === 'profile'      ? 'Tu Perfil'
    : step === 'change-pin' ? 'Cambiar PIN 🔐'
    : step === 'create-pin' ? 'Crear PIN de Seguridad'
    : step === 3            ? 'Crea tu PIN 🔐'
    : step === 4
      ? (isReturning ? `¡Bienvenido de nuevo, ${name.split(' ')[0]}! 👋` : `¡Hola, ${name.split(' ')[0]}! 🎉`)
      : 'Identifícate en Sávit';

  const subtitles = {
    1:            'Tu número es tu llave de acceso',
    2:            'Cuéntanos cómo saludarte',
    3:            'Protege tu cuenta con un PIN de 4 dígitos',
    4:            isReturning ? 'Te reconocimos al instante 🌿' : '¡Tu perfil está listo! 🌿',
    profile:      'Gestiona tus datos de cliente',
    'create-pin': 'Solo tú podrás hacer pedidos',
    'change-pin': 'Actualiza tu código de seguridad',
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ── Animaciones Framer Motion (Variantes)
  // ──────────────────────────────────────────────────────────────────────────
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const cardVariants = {
    hidden: { y: "100%", opacity: 0.5 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 300,
        mass: 0.8
      }
    },
    exit: { 
      y: "100%", 
      opacity: 0.5,
      transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] }
    }
  };

  const stepVariants = {
    initial: (custom) => ({ 
      x: custom > 0 ? "50%" : "-50%", 
      opacity: 0, 
      filter: "blur(4px)" 
    }),
    animate: { 
      x: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { type: "spring", damping: 30, stiffness: 400 }
    },
    exit: (custom) => ({ 
      x: custom > 0 ? "-50%" : "50%", 
      opacity: 0, 
      filter: "blur(4px)",
      transition: { duration: 0.2 }
    })
  };

  // Para manejar la dirección del slide entre pasos
  const [direction, setDirection] = useState(1);
  const changeStep = (newStep, dir) => {
    setDirection(dir);
    setStep(newStep);
  };

  // ══════════════════════════════════════════
  // ── Vista de Perfil (Retorno Temprano)
  // ══════════════════════════════════════════
  if (step === 'profile') {
    return createPortal(
      <motion.div 
        className="cw-overlay" 
        onClick={onClose}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={overlayVariants}
      >
        <motion.div 
          className="cw-card" 
          onClick={e => e.stopPropagation()}
          variants={cardVariants}
        >
          <button className="cw-close-btn" onClick={() => { vibrateTap(); onClose(); }} aria-label="Cerrar modal">✕</button>

          <div className="cw-header">
            <div className="cw-logo">🌿</div>
            <h1 className="cw-header-title">{headerTitle}</h1>
            <p className="cw-header-sub">{subtitles[step]}</p>
          </div>

          <motion.div 
            className="cw-body"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Loyalty Points Badge */}
            {customer?.points !== undefined && (
              <div className="cw-points-badge">
                <span className="cw-points-icon">⭐</span>
                <div className="cw-points-info">
                  <span className="cw-points-val">{Math.floor(customer.points)}</span>
                  <span className="cw-points-label">Puntos Sávit</span>
                </div>
              </div>
            )}

            {/* PIN warning banner */}
            {hasPin ? (
              <div className="cw-pin-warning cw-pin-active" onClick={() => { setPinError(''); setStep('change-pin'); }}>
                <span className="cw-pin-warning-icon">🔐</span>
                <div>
                  <strong>PIN de Seguridad Activo</strong>
                  <p>Toca aquí si deseas cambiarlo.</p>
                </div>
                <span className="cw-pin-warning-arrow">›</span>
              </div>
            ) : (
              <div className="cw-pin-warning" onClick={() => { setPinError(''); setStep('create-pin'); }}>
                <span className="cw-pin-warning-icon">🔒</span>
                <div>
                  <strong>Crea tu PIN de Seguridad</strong>
                  <p>Necesario para realizar pedidos. Toca aquí para crearlo.</p>
                </div>
                <span className="cw-pin-warning-arrow">›</span>
              </div>
            )}

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
          </motion.div>

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
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  if (step === 'create-pin' || step === 'change-pin') {
    const isChange = step === 'change-pin';
    return createPortal(
      <motion.div 
        className="cw-overlay" 
        onClick={onClose}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={overlayVariants}
      >
        <motion.div 
          className="cw-card" 
          onClick={e => e.stopPropagation()}
          variants={cardVariants}
        >
          <button className="cw-close-btn" onClick={() => { vibrateTap(); onClose(); }} aria-label="Cerrar modal">✕</button>

          <div className="cw-header">
            <div className="cw-logo">🔐</div>
            <h1 className="cw-header-title">{headerTitle}</h1>
            <p className="cw-header-sub">{subtitles[step]}</p>
          </div>

          <motion.div 
            key={step}
            className="cw-body"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {isChange ? (
              <>
                <PinInputs pin={oldPin} setPin={setOldPin} label="Ingresa tu PIN ACTUAL" error={null} />
                <PinInputs pin={pin} setPin={setPin} label="Ingresa el NUEVO PIN" error={null} />
                <PinInputs pin={pinConfirm} setPin={setPinConfirm} label="Confirma el NUEVO PIN" error={pinError} />
              </>
            ) : (
              <>
                <PinInputs pin={pin} setPin={setPin} label="Crea tu PIN de 4 dígitos" error={null} />
                <PinInputs pin={pinConfirm} setPin={setPinConfirm} label="Confirma tu PIN" error={pinError} />
              </>
            )}
          </motion.div>

          <div className="cw-actions">
            <button className="cw-btn-primary" onClick={isChange ? handleChangePin : handleCreatePinFromProfile} disabled={savingPin}>
              {savingPin ? 'Guardando...' : (isChange ? 'Actualizar PIN 🔐' : 'Guardar PIN 🔐')}
            </button>
            <button className="cw-btn-back" onClick={() => { vibrateTap(); setStep('profile'); }}>← Volver</button>
          </div>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div 
      className="cw-overlay" 
      onClick={onClose}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
    >
      <motion.div 
        className="cw-card" 
        onClick={e => e.stopPropagation()}
        variants={cardVariants}
      >

        <button className="cw-close-btn" onClick={() => { vibrateTap(); onClose(); }} aria-label="Cerrar modal">✕</button>

        {/* ── Bloqueo Admin ── */}
        {isAuthAdmin ? (
          <>
            <div className="cw-header">
              <div className="cw-logo">🛡️</div>
              <h1 className="cw-header-title">Modo Vista Previa</h1>
              <p className="cw-header-sub">Estás navegando como administrador</p>
            </div>
            <motion.div 
              className="cw-body"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="cw-step-icon">⚠️</div>
              <h2 className="cw-step-title">Acción no permitida</h2>
              <p className="cw-step-desc">
                La identificación de clientes está desactivada en el modo de vista previa para administradores. Esto protege los datos de tus clientes reales.
              </p>
            </motion.div>
            <div className="cw-actions">
              <button className="cw-btn-primary" onClick={() => { vibrateTap(); onClose(); }}>
                Entendido
              </button>
              <button
                className="cw-btn-back"
                onClick={() => { vibrateTap(); onClose(); navigate('/admin'); }}
              >
                Ir al Panel Admin
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cw-header">
              <div className="cw-logo">🌿</div>
              <h1 className="cw-header-title">{headerTitle}</h1>
              <p className="cw-header-sub">{subtitles[step]}</p>
              {step < 4 && (
                <div className="cw-progress">
                  {[1, 2, 3].map(n => (
                    <motion.div
                      key={n}
                      layoutId={`dot-${n}`}
                      className={`cw-dot${n === step ? ' active' : n < step ? ' done' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="cw-body-container" style={{ position: 'relative', overflow: 'hidden' }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div 
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="cw-body"
                >
                  {/* ── Paso 1: Número ── */}
                  {step === 1 && (
                    <>
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

                      <div className="cw-actions" style={{ padding: 0 }}>
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
                          onClick={() => { onClose(); navigate('/'); }}
                        >
                          🏠 Volver al Inicio
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── Paso 2: Nombre ── */}
                  {step === 2 && (
                    <>
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

                      <div className="cw-actions" style={{ padding: 0 }}>
                        <button className="cw-btn-primary" onClick={handleNameSave} disabled={loading}>
                          {loading ? 'Guardando…' : 'Continuar →'}
                        </button>
                        <button className="cw-btn-back" onClick={() => changeStep(1, -1)}>← Volver</button>
                      </div>
                    </>
                  )}

                  {/* ── Paso 3: Crear PIN ── */}
                  {step === 3 && (
                    <>
                      <div className="cw-step-icon">🔐</div>
                      <h2 className="cw-step-title">Crea tu PIN</h2>
                      <p className="cw-step-desc">
                        Lo necesitarás para hacer pedidos. ¡Solo tú sabrás cuál es!
                      </p>

                      <PinInputs pin={pin} setPin={setPin} label="Elige un PIN de 4 dígitos" error={null} />
                      <PinInputs pin={pinConfirm} setPin={setPinConfirm} label="Confirma tu PIN" error={pinError} />

                      <div className="cw-actions" style={{ padding: 0 }}>
                        <button className="cw-btn-primary" onClick={handlePinSave} disabled={savingPin}>
                          {savingPin ? 'Guardando…' : '¡Listo! Crear PIN 🔐'}
                        </button>
                        <button className="cw-btn-back" onClick={() => { vibrateTap(); changeStep(2, -1); }}>← Volver</button>
                      </div>
                    </>
                  )}

                  {/* ── Paso 4: Éxito ── */}
                  {step === 4 && (
                    <>
                      <div className="cw-step-icon">{isReturning ? '🌿' : '🎉'}</div>
                      <h2 className="cw-step-title">Todo listo</h2>
                      <p className="cw-step-desc">Espéranos un momento...</p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}

      </motion.div>
    </motion.div>,
    document.body
  );
}
