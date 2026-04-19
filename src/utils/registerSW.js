// src/utils/registerSW.js
// Registro del Service Worker con lógica de actualización y detección de soporte

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.info('[SW] Service Workers no soportados en este navegador');
    return;
  }

  // Solo en producción (evitar interferencias en desarrollo)
  if (import.meta.env.DEV) {
    console.info('[SW] Modo desarrollo: SW omitido');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.info('[SW] Registrado correctamente:', registration.scope);

      // Detectar actualizaciones disponibles
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // Nuevo SW instalado y esperando activación
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            console.info('[SW] Nueva versión disponible');

            // Emitir evento global para que el UI muestre aviso de actualización
            window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
              detail: { registration },
            }));
          }
        });
      });

      // Cuando el SW toma control (activado), recargar para usar nueva versión
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

    } catch (err) {
      console.error('[SW] Error al registrar:', err);
    }
  });
}

// Función para forzar la activación inmediata del nuevo SW (llamar desde el banner de update)
export function skipWaitingAndReload(registration) {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}
