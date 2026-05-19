// src/utils/formatters.js
// Formateo de precios en COP y fechas

export function formatCOP(amount) {
  if (!amount && amount !== 0) return '$0';
  return '$' + Math.round(amount).toLocaleString('es-CO');
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export function generateOrderId() {
  const prefix = 'SAV';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// ─── Constantes de Contabilidad ──────────────────────────────────────────────
/**
 * Único criterio de "ingreso efectivo" en toda la app.
 * Un pedido genera ingreso SOLO cuando fue entregado (status: 'delivered').
 * Modificar aquí propaga el cambio a Dashboard, IA y cualquier reporte futuro.
 */
export const EFFECTIVE_STATUSES = ['delivered'];

export const isEffectiveOrder = (order) =>
  EFFECTIVE_STATUSES.includes(order?.status);

// ─── Utilidades de Fecha ─────────────────────────────────────────────────────
/**
 * Retorna el inicio del día de hoy a medianoche (00:00:00.000).
 * Única fuente de verdad para comparaciones de "hoy" en toda la app.
 */
export const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Extrae la fecha de un pedido de Firestore o demo de forma segura.
 * @param {object} order - Pedido con createdAt (Firestore Timestamp) o createdAtMillis
 * @returns {Date}
 */
export const getOrderDate = (order) => {
  if (order?.createdAt?.toDate) return order.createdAt.toDate();
  if (order?.createdAtMillis) return new Date(order.createdAtMillis);
  return new Date(0);
};

/**
 * Calcula si un pedido pertenece al día de hoy.
 * @param {object} order
 * @returns {boolean}
 */
export const isOrderFromToday = (order) => {
  const d = getOrderDate(order);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === getTodayStart().getTime();
};

/**
 * Robust check if a subscription is paid for a given month and year.
 * Immune to differences in timezone, date types, zero-padding, or format mismatches.
 * @param {string|Date|object} lastPaidMonth - The value stored in lastPaidMonth field
 * @param {Date} referenceDate - The date to compare against (defaults to today)
 * @returns {boolean}
 */
export const checkIsPaidThisMonth = (lastPaidMonth, referenceDate = new Date()) => {
  if (!lastPaidMonth) return false;
  
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // 1-12
  
  // Case 1: String format "YYYY-MM" or "YYYY-M" or "YYYY-MM-DD"
  if (typeof lastPaidMonth === 'string') {
    const parts = lastPaidMonth.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      return year === refYear && month === refMonth;
    }
  }
  
  // Case 2: If it's stored as a Timestamp or has a toDate method (Firestore)
  if (lastPaidMonth && typeof lastPaidMonth.toDate === 'function') {
    const d = lastPaidMonth.toDate();
    return d.getFullYear() === refYear && (d.getMonth() + 1) === refMonth;
  }
  
  // Case 3: If it's a Date object
  if (lastPaidMonth instanceof Date) {
    return lastPaidMonth.getFullYear() === refYear && (lastPaidMonth.getMonth() + 1) === refMonth;
  }
  
  // Fallback to simple string check just in case
  const simpleKey = `${refYear}-${refMonth}`;
  const paddedKey = `${refYear}-${String(refMonth).padStart(2, '0')}`;
  return lastPaidMonth === simpleKey || lastPaidMonth === paddedKey;
};

