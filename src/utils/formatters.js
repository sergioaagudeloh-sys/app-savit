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
