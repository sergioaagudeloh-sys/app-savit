// src/components/ui/ForceUpdateOverlay.jsx
// Overlay bloqueante que aparece cuando hay una nueva versión del SW lista.
// El usuario NO puede descartarlo — debe actualizar para continuar.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { skipWaitingAndReload } from '../../utils/registerSW';
import './ForceUpdateOverlay.css';

// Icono de actualización animado (inline SVG — sin dependencias extra)
const UpdateArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#a3d964" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

export default function ForceUpdateOverlay() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Escuchar el evento emitido por registerSW.js cuando hay nuevo SW
    const handleUpdate = (event) => {
      setRegistration(event.detail.registration);
      // Pequeño delay para que la animación de entrada sea suave
      setTimeout(() => setVisible(true), 100);
    };

    window.addEventListener('swUpdateAvailable', handleUpdate);
    return () => window.removeEventListener('swUpdateAvailable', handleUpdate);
  }, []);

  const handleUpdate = useCallback(() => {
    if (updating) return;
    setUpdating(true);

    // Dar 400ms para que la animación "Actualizando..." se vea
    setTimeout(() => {
      skipWaitingAndReload(registration);
    }, 400);
  }, [updating, registration]);

  // Bloquear scroll del body mientras el overlay está visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="force-update-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Actualización requerida"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div 
            className="force-update-card"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Logo de la app */}
            <img
              src="/logo.png"
              alt="Sávit"
              className="force-update-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />

            {/* Icono animado */}
            <div className="force-update-icon-wrap">
              <UpdateArrowIcon />
            </div>

            <h1 className="force-update-title">
              Nueva versión disponible
            </h1>

            <p className="force-update-desc">
              Hay una&nbsp;<strong>actualización importante</strong>&nbsp;lista para Sávit.
              Actualiza para ver el catálogo más reciente y disfrutar de las últimas mejoras.
            </p>

            {/* Barra de progreso decorativa (indica que algo está esperando) */}
            {!updating && (
              <div className="force-update-progress-bar">
                <div className="force-update-progress-fill" />
              </div>
            )}

            <button
              className="force-update-btn"
              onClick={handleUpdate}
              disabled={updating}
              aria-label="Actualizar la aplicación ahora"
            >
              {updating ? (
                <>
                  <span className="update-spinner" aria-hidden="true" />
                  Actualizando...
                </>
              ) : (
                <>
                  🚀 Actualizar ahora
                </>
              )}
            </button>

            <p className="force-update-note">
              La app se recargará automáticamente · Tus datos no se perderán
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
