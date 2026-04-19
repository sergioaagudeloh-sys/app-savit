// src/utils/chatParser.js
// Parser centralizado para respuestas de Sávit IA.
// Responsabilidad única: extraer comandos e IDs, limpiar texto.
// Desacoplado del componente para facilitar testing y mantenimiento.

/**
 * Extrae todos los productos detectados en el texto de la IA.
 * Soporta: [ID:xxx], [TAG:ID:xxx], [COMANDO:ID:xxx] — case-insensitive
 * @param {string} text - Texto completo de la respuesta de la IA
 * @param {Array} products - Lista completa de productos de Firebase
 * @returns {Array} Lista de objetos de producto encontrados
 */
export function parseProductIds(text, products = []) {
  if (!text || !Array.isArray(products) || products.length === 0) return [];

  const ids = new Set();

  // Detecta [ID:xxx], [TAG:ID:xxx], [COMANDO:ID:xxx] etc.
  const regex = /\[\s*(?:[A-Z_]+:\s*)?ID:\s*([a-zA-Z0-9_\-]+)\s*\]/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    ids.add(m[1].trim().toLowerCase());
  }

  return [...ids]
    .map(id => products.find(p => String(p.id).toLowerCase() === id))
    .filter(Boolean);
}

/**
 * Extrae todos los botones de acción del texto de la IA.
 * Soporta: [ACTION:Texto|comando], [TAG:ACTION:Texto|comando]
 * @param {string} text
 * @returns {Array<{label: string, cmd: string}>}
 */
export function parseActions(text) {
  if (!text) return [];

  const regex = /\[\s*(?:[A-Z_]+:\s*)?ACTION:\s*(.*?)\s*\|\s*(.*?)\s*\]/gi;
  const actions = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const label = m[1].trim();
    const cmd   = m[2].trim();
    // Deduplicar: no añadir si ya existe uno idéntico
    if (!actions.some(a => a.label === label && a.cmd === cmd)) {
      actions.push({ label, cmd });
    }
  }
  return actions;
}

/**
 * Limpia el texto de la IA para mostrar al usuario.
 * Elimina únicamente comandos de interfaz y metadatos técnicos.
 * Preserva el texto natural del asistente.
 * @param {string} text
 * @returns {string}
 */
export function cleanAiText(text) {
  if (!text) return '';

  return text
    // Eliminar comandos de interfaz [ID:...] y [ACTION:...|...]
    .replace(/\[\s*(?:[A-Z_]+:\s*)?(?:ID|ACTION):\s*[^\]]*\]/gi, '')
    // Eliminar residuos técnicos TECH:
    .replace(/TECH:[A-Z0-9_:]+/g, '')
    // Eliminar @@ID: del catálogo interno
    .replace(/@@ID:[a-zA-Z0-9_\-]+/g, '')
    // Eliminar líneas de tabla del catálogo que se cuelen
    .replace(/-- .+\| @@ID:[^\n]+/g, '')
    // Colapsar líneas vacías dobles
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Verifica si el texto contiene una señal de info de pago.
 * @param {string} text
 * @returns {boolean}
 */
export function hasPaymentInfo(text) {
  return typeof text === 'string' && text.includes('TECH:SHOW_PAYMENT_INFO');
}
