// src/utils/haptics.js
// Wrapper seguro para la Vibration API.
// Solo se activa en dispositivos móviles que soportan la API.
// Nunca lanza errores en desktop o navegadores no compatibles.

/**
 * Vibración genérica con patrón personalizado.
 * @param {number|number[]} pattern - Duración en ms o array alternando vibración/pausa.
 */
export const vibrate = (pattern = [10]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Silenciar cualquier error (modo privado, iOS restrictivo, etc.)
  }
};

/** Pulso corto y suave — agregar al carrito, seleccionar opción */
export const vibrateTap = () => vibrate([12]);

/** Doble pulso — confirmación exitosa, pedido enviado */
export const vibrateSuccess = () => vibrate([15, 40, 20]);

/** Pulso de error — acción inválida */
export const vibrateError = () => vibrate([60, 30, 60]);

/** Pulso largo — alerta o acción destructiva */
export const vibrateWarning = () => vibrate([80]);
