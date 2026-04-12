/**
 * Ejecuta una función dentro de una transición de vista si el navegador la soporta.
 * @param {Function} updateFn - La función que actualiza el estado del DOM.
 */
export const startTransition = (updateFn) => {
  if (!document.startViewTransition) {
    updateFn();
    return;
  }

  document.startViewTransition(() => {
    updateFn();
  });
};
