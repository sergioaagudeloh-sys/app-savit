// src/components/ui/OfflineBanner.jsx
// Muestra un banner cuando el usuario pierde/recupera conexión.
// La notificación de actualización es manejada por ForceUpdateOverlay.

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [bannerState, setBannerState] = useState('hidden'); // 'hidden' | 'offline' | 'back-online'

  // ── Lógica del banner de conexión ──────────────────────────
  useEffect(() => {
    if (!isOnline) {
      // Sin conexión → mostrar inmediatamente
      setBannerState('offline');
    } else if (bannerState === 'offline') {
      // Acaba de recuperar conexión → mostrar "✅ De vuelta en línea" 3s y ocultar
      setBannerState('back-online');
      const timer = setTimeout(() => setBannerState('hidden'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVisible = bannerState !== 'hidden';

  // ── Icono dinámico según estado ────────────────────────────
  const icon  = bannerState === 'offline' ? '📵' : '✅';
  const title = bannerState === 'offline'
    ? 'Sin conexión a internet'
    : '¡Conexión restaurada!';
  const sub   = bannerState === 'offline'
    ? 'Mostrando datos guardados — el catálogo sigue disponible'
    : 'Tus datos se sincronizarán automáticamente';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`offline-banner ${bannerState} ${isVisible ? 'visible' : ''}`}
    >
      <span className="offline-banner-icon" aria-hidden="true">{icon}</span>
      <div className="offline-banner-text">
        <span className="offline-banner-title">{title}</span>
        <span className="offline-banner-sub">{sub}</span>
      </div>
    </div>
  );
}
