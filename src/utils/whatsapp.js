// src/utils/whatsapp.js
// Generador del mensaje estructurado para WhatsApp
import { formatCOP } from './formatters';

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '573216513171';

// Usamos String.fromCodePoint para asegurar que los emojis se construyen nativamente en el navegador.
// Evita problemas de transpilación o codificación de archivos en Windows.
const EMOJI = {
  cart: String.fromCodePoint(0x1F6D2),
  box: String.fromCodePoint(0x1F4E6),
  money: String.fromCodePoint(0x1F4B0),
  truck: String.fromCodePoint(0x1F69A),
  pin: String.fromCodePoint(0x1F4CD),
  store: String.fromCodePoint(0x1F3EA),
  user: String.fromCodePoint(0x1F464),
  phone: String.fromCodePoint(0x1F4F1)
};

export function buildWhatsAppMessage({ items, total, deliveryMethod, address, customerName, customerPhone, orderId }) {
  const headerLine   = `${EMOJI.cart} *PEDIDO #${orderId} - SAVIT*`;
  const divider      = '-----------------------';

  const itemLines = items.map(item => {
    let line = `  • ${item.name} x${item.quantity}  ->  ${formatCOP(item.price * item.quantity)}`;
    if (item.selectedAdditions?.length > 0) {
      line += `\n      + ${item.selectedAdditions.map(a => a.name).join(', ')}`;
    }
    return line;
  }).join('\n');

  const deliveryLine = deliveryMethod === 'domicilio'
    ? `${EMOJI.truck} *Entrega:* Domicilio\n${EMOJI.pin} *Dirección:* ${address}`
    : `${EMOJI.store} *Entrega:* Recogida en tienda`;

  const message = [
    headerLine,
    divider,
    `${EMOJI.box} *PRODUCTOS:*`,
    itemLines,
    divider,
    `${EMOJI.money} *TOTAL: ${formatCOP(total)}*`,
    deliveryLine,
    divider,
    `${EMOJI.user} *Cliente:* ${customerName}`,
    `${EMOJI.phone} *Teléfono:* ${customerPhone}`,
    divider,
    '_Pedido generado desde Savit App_'
  ].join('\n');

  return message;
}

export function openWhatsApp(message, targetNumber) {
  const encoded = encodeURIComponent(message);
  const phone = targetNumber || WA_NUMBER;
  // Intentamos un esquema robusto que WhatsApp Web acepta siempre:
  const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encoded}&type=phone_number&app_absent=0`;
  window.open(url, '_blank');
}

export function buildAdminToClientMessage(order) {
  const { items, total, deliveryCost, customerName, orderId, deliveryMethod } = order;
  const headerLine = `👋 ¡Hola ${customerName}! Tu pedido en *Savit* ha sido recibido y revisado.`;
  
  const itemLines = items.map(item => {
    let line = `  • ${item.name} x${item.quantity}  ->  ${formatCOP(item.price * item.quantity)}`;
    if (item.selectedAdditions?.length > 0) {
      line += `\n      + ${item.selectedAdditions.map(a => a.name).join(', ')}`;
    }
    return line;
  }).join('\n');

  const finalTotal = total + (deliveryCost || 0);
  const deliveryText = deliveryMethod === 'domicilio' 
    ? `🛵 *Domicilio Cotizado:* ${formatCOP(deliveryCost || 0)}` 
    : `🏪 *Recogida en tienda:* Gratis`;

  const message = [
    headerLine,
    `-----------------------`,
    `📦 *RESUMEN DE PEDIDO #${orderId}*`,
    itemLines,
    `-----------------------`,
    `🛒 *Subtotal:* ${formatCOP(total)}`,
    deliveryText,
    `💰 *TOTAL A PAGAR:* ${formatCOP(finalTotal)}`,
    `-----------------------`,
    `💳 *INSTRUCCIONES DE PAGO*`,
    `Por favor, realiza la transferencia del valor total y envíame la foto del comprobante como respuesta a este chat.`,
    ``,
    `👉 *Nequi / Bancolombia:* [Ingresa aquí tu número]`,
    ``,
    `Apenas confirmemos la foto, empacaremos todo y actualizaremos el estado de tu pedido a Pagado. ¡Gracias por elegir bienestar! 🌿`
  ].join('\n');

  return message;
}

export function openWhatsAppToClient(customerPhone, message) {
  let phone = customerPhone.toString().replace(/\D/g,'');
  if (phone.length === 10 && !phone.startsWith('57')) phone = '57' + phone; 
  
  const encoded = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send/?phone=${phone}&text=${encoded}&type=phone_number&app_absent=0`;
  window.open(url, '_blank');
}
