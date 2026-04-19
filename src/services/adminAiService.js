// src/services/adminAiService.js
// Analista Estratégico de Negocios — Sávit IA
// Sprint 2: Modelo 70B, streaming, proyecciones, alertas proactivas, saludo de bienvenida.

import { isEffectiveOrder, getOrderDate, formatCOP } from '../utils/formatters';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
// PROBLEMA B FIX: Subir admin a 70B para análisis numérico preciso
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─── Retry con Backoff Exponencial ───────────────────────────────────────────
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastResponse;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;
    lastResponse = response;
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return lastResponse;
}

// ─── Streaming SSE (mismo patrón que aiService.js) ────────────────────────────
// MEJORA 3 FIX: Admin ahora también tiene streaming
async function consumeStream(response, onChunk) {
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = '';
  let buffer    = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return fullText;

      try {
        const parsed = JSON.parse(data);
        const token  = parsed.choices?.[0]?.delta?.content || '';
        if (token) {
          fullText += token;
          onChunk(fullText);
        }
      } catch { /* Ignorar líneas malformadas */ }
    }
  }
  return fullText;
}

// ─── Detector de Intención ────────────────────────────────────────────────────
function detectContextNeeds(message) {
  const msg = (message || '').toLowerCase();
  return {
    needsOrders:       /pedido|orden|pendiente|cliente|entrega|cancel|compra|histori/.test(msg),
    needsStock:        /stock|inventario|producto|agotado|quedan|unidades|existencia/.test(msg),
    needsRevenue:      /venta|ingreso|ganancia|dinero|plata|balance|factur|ticket|cuanto|revenue/.test(msg),
    needsTopProducts:  /popular|top|más vendido|tendencia|estrella|demand/.test(msg),
    needsConfig:       /tienda|config|abierto|cerrado|pago|banco|horario|domicilio/.test(msg),
    needsProjections:  /proyecci|estimaci|cuánto vender|proyecto|mes que viene|próximo mes/.test(msg),
  };
}

// ─── Módulo BASE (~150 tokens, siempre incluido) ──────────────────────────────
function buildBaseSnapshot(orders, products, config) {
  const today = new Date().toISOString().split('T')[0];

  let todayRevenue = 0, completedOrders = 0, totalRevenue = 0;
  const totalOrders = orders.length;

  orders.forEach(o => {
    const orderDate = getOrderDate(o).toISOString().split('T')[0];
    if (isEffectiveOrder(o)) {
      const revenue = o.totalWithDelivery || o.total || 0;
      totalRevenue += revenue;
      completedOrders++;
      if (orderDate === today) todayRevenue += revenue;
    }
  });

  const pendingCount   = orders.filter(o => o.status === 'pending').length;
  const activeProducts = products.filter(p => p.active).length;
  const soldOutCount   = products.filter(p => p.active && p.soldOut).length;

  return (
    `=== SÁVIT — RESUMEN EJECUTIVO (${today}) ===\n` +
    `- Tienda: ${config?.isOpen ? '🟢 ABIERTA' : '🔴 CERRADA'}\n` +
    `- Ventas hoy: ${formatCOP(todayRevenue)} | Total histórico: ${formatCOP(totalRevenue)}\n` +
    `- Pedidos: ${totalOrders} total (${completedOrders} entregados | ${pendingCount} pendientes)\n` +
    `- Inventario: ${activeProducts} activos, ${soldOutCount} agotados`
  );
}

// ─── Módulo INGRESOS ──────────────────────────────────────────────────────────
function buildRevenueSection(orders) {
  const completed = orders.filter(isEffectiveOrder);
  const totalRev  = completed.reduce((s, o) => s + (o.totalWithDelivery || o.total || 0), 0);
  const avgTicket = completed.length > 0 ? Math.round(totalRev / completed.length) : 0;
  const weekAgo   = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekRev   = completed
    .filter(o => getOrderDate(o).getTime() > weekAgo)
    .reduce((s, o) => s + (o.totalWithDelivery || o.total || 0), 0);

  return (
    `\n\n--- DETALLE FINANCIERO ---\n` +
    `- Ticket promedio: ${formatCOP(avgTicket)}\n` +
    `- Ventas últimos 7 días: ${formatCOP(weekRev)}\n` +
    `- Pedidos entregados totales: ${completed.length}`
  );
}

// ─── Módulo PEDIDOS ───────────────────────────────────────────────────────────
function buildOrdersSection(orders) {
  const pending = orders.filter(o => o.status === 'pending').slice(0, 5);
  const recent  = orders.filter(o => isEffectiveOrder(o)).slice(0, 3);

  let section = '\n\n--- PEDIDOS ---';

  if (pending.length > 0) {
    section += '\nPendientes de atención:';
    pending.forEach(o => {
      const items = (o.items || []).map(i => i.name).join(', ') || 'N/A';
      section += `\n  • ${o.customerName || 'Cliente'} — ${formatCOP(o.total || 0)} — ${items}`;
    });
  } else {
    section += '\nSin pedidos pendientes ✅';
  }

  if (recent.length > 0) {
    section += '\nÚltimas entregas:';
    recent.forEach(o => {
      section += `\n  • ${o.customerName || 'Cliente'} — ${formatCOP(o.total || 0)}`;
    });
  }

  return section;
}

// ─── Módulo STOCK ─────────────────────────────────────────────────────────────
function buildStockSection(products) {
  const critical = products.filter(p => p.active && !p.soldOut && p.stock != null && p.stock <= 5 && p.stock > 0);
  const soldOut  = products.filter(p => p.active && p.soldOut);
  const healthy  = products.filter(p => p.active && !p.soldOut).length;

  let section = `\n\n--- INVENTARIO ---\n- Disponibles: ${healthy} | Agotados: ${soldOut.length}`;

  if (critical.length > 0) {
    section += `\n- ⚠️ Stock crítico (≤5 uds): ${critical.map(p => `${p.name} (${p.stock} uds)`).join(', ')}`;
  }
  if (soldOut.length > 0) {
    section += `\n- 🚫 Agotados: ${soldOut.map(p => p.name).join(', ')}`;
  }

  return section;
}

// ─── Módulo TOP PRODUCTOS ─────────────────────────────────────────────────────
function buildTopProductsSection(orders) {
  const sales = {};
  orders.filter(isEffectiveOrder).forEach(o => {
    (o.items || []).forEach(item => {
      sales[item.name] = (sales[item.name] || 0) + (item.quantity || 1);
    });
  });

  const top = Object.entries(sales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, qty], i) => `  ${i + 1}. ${name} (${qty} uds)`)
    .join('\n');

  return top ? `\n\n--- TOP PRODUCTOS ---\n${top}` : '';
}

// ─── Módulo CONFIGURACIÓN ─────────────────────────────────────────────────────
function buildConfigSection(config) {
  return (
    `\n\n--- CONFIGURACIÓN DE TIENDA ---\n` +
    `- Estado: ${config?.isOpen ? 'Abierta' : 'Cerrada'}\n` +
    `- Banco: ${config?.paymentBank || 'N/D'} (${config?.paymentAccountType || 'Ahorros'}) #${config?.paymentAccount || 'N/D'}\n` +
    `- Domicilios: ${config?.deliveryEnabled ? `Sí — Costo: ${formatCOP(config?.deliveryCost || 0)}` : 'No'}`
  );
}

// ─── Módulo PROYECCIONES ─────────────────────────────────────────────────────
function buildProjectionsSection(orders) {
  const completed = orders.filter(isEffectiveOrder);
  if (completed.length < 2) return '';

  const now        = Date.now();
  const weekAgo    = now - 7 * 24 * 60 * 60 * 1000;
  const weekOrders = completed.filter(o => getOrderDate(o).getTime() > weekAgo);
  const weekRev    = weekOrders.reduce((s, o) => s + (o.totalWithDelivery || o.total || 0), 0);
  const dailyAvg   = weekRev / 7;
  const projected  = Math.round(dailyAvg * 30);

  return (
    `\n\n--- PROYECCIONES ---\n` +
    `- Promedio diario (7d): ${formatCOP(Math.round(dailyAvg))}\n` +
    `- Proyección mensual estimada: ${formatCOP(projected)}\n` +
    `- Pedidos esta semana: ${weekOrders.length}`
  );
}

// ─── Alertas Proactivas ───────────────────────────────────────────────────────
function buildProactiveAlerts(orders, products) {
  const alerts = [];

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  if (pendingCount > 0) {
    alerts.push(`🔔 ${pendingCount} pedido(s) pendiente(s) requieren atención.`);
  }

  const critical = products.filter(p => p.active && !p.soldOut && p.stock != null && p.stock <= 3 && p.stock > 0);
  if (critical.length > 0) {
    alerts.push(`⚠️ Stock crítico (≤3 uds): ${critical.map(p => p.name).join(', ')}.`);
  }

  const soldOut = products.filter(p => p.active && p.soldOut);
  if (soldOut.length > 0) {
    alerts.push(`🚫 ${soldOut.length} producto(s) agotado(s): ${soldOut.map(p => p.name).join(', ')}.`);
  }

  return alerts.length > 0
    ? `\n\n--- ALERTAS ACTIVAS ---\n${alerts.join('\n')}`
    : '';
}

// ─── Builder Principal del Snapshot ──────────────────────────────────────────
export function buildBusinessSnapshot(orders, products, config, userMessage = '') {
  const needs = detectContextNeeds(userMessage);

  let snapshot = buildBaseSnapshot(orders, products, config);
  snapshot += buildProactiveAlerts(orders, products);

  if (needs.needsRevenue)     snapshot += buildRevenueSection(orders);
  if (needs.needsOrders)      snapshot += buildOrdersSection(orders);
  if (needs.needsStock)       snapshot += buildStockSection(products);
  if (needs.needsTopProducts) snapshot += buildTopProductsSection(orders);
  if (needs.needsConfig)      snapshot += buildConfigSection(config);
  if (needs.needsProjections) snapshot += buildProjectionsSection(orders);

  return snapshot;
}

// ─── MEJORA 4: Saludo Proactivo de Bienvenida ─────────────────────────────────
/**
 * Genera un resumen ejecutivo instantáneo (sin llamada a la API)
 * para mostrar al admin al abrir el chat por primera vez.
 */
export function buildProactiveGreeting(orders, products) {
  try {
    const hour      = new Date().getHours();
    const saludo    = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

    const today     = new Date().toISOString().split('T')[0];
    const completed = orders.filter(isEffectiveOrder);
    const pending   = orders.filter(o => o.status === 'pending');

    const todayRev  = completed
      .filter(o => getOrderDate(o).toISOString().split('T')[0] === today)
      .reduce((s, o) => s + (o.totalWithDelivery || o.total || 0), 0);

    const critical  = products.filter(p => p.active && !p.soldOut && p.stock != null && p.stock <= 3 && p.stock > 0);
    const soldOut   = products.filter(p => p.active && p.soldOut);
    const available = products.filter(p => p.active && !p.soldOut).length;

    const lines = [`${saludo} 💎 Aquí tu resumen ejecutivo:\n`];

    lines.push(`💰 **Ventas hoy:** ${formatCOP(todayRev)}`);

    if (pending.length > 0) {
      lines.push(`🔔 **${pending.length}** pedido(s) pendiente(s) esperando atención`);
    } else {
      lines.push(`✅ Sin pedidos pendientes — ¡todo al día!`);
    }

    if (critical.length > 0) {
      lines.push(`⚠️ Stock crítico: ${critical.map(p => `**${p.name}** (${p.stock} uds)`).join(', ')}`);
    }

    if (soldOut.length > 0) {
      lines.push(`🚫 **${soldOut.length}** producto(s) agotado(s)`);
    }

    lines.push(`\n📦 **${available}** productos disponibles en catálogo`);
    lines.push(`\n¿Empezamos por los ${pending.length > 0 ? 'pedidos pendientes' : 'análisis de ventas'}?`);

    return lines.join('\n');
  } catch {
    return '💎 Hola, soy tu Analista Estratégico. ¿Qué analizamos hoy?';
  }
}

// ─── Prompt del Sistema Admin ─────────────────────────────────────────────────
function buildAdminSystemPrompt(businessSnapshot, currentPage = '') {
  const pageCtx = currentPage
    ? `\nCONTEXTO_SESIÓN: El administrador está en la pantalla "${currentPage}".`
    : '';

  return (
    `Eres el Analista Estratégico de Sávit, un consultor premium de inteligencia de negocios.\n\n` +
    `PERSONALIDAD:\n` +
    `- Ejecutivo, cercano y visionario. Socio de alto nivel, no un bot.\n` +
    `- Usas emojis estratégicamente: 📈 💰 ✨ 🚀 💎\n` +
    `- Celebras éxitos genuinamente. Los problemas son "Oportunidades de Mejora" con plan de acción.\n\n` +
    `REGLAS:\n` +
    `1. NUNCA inventes números. Sin el dato, admítelo con elegancia.\n` +
    `2. Respuestas ejecutivas: directo al punto. Máximo 3 párrafos.\n` +
    `3. Siempre termina con una acción concreta y motivadora.\n` +
    `4. Español fluido y profesional siempre.\n\n` +
    `COMANDOS DE INTERFAZ (opcional, al final del mensaje):\n` +
    `Puedes sugerir botones de navegación usando: [ACTION:Texto|comando]\n` +
    `Comandos disponibles: "pedidos", "inventario", "configuracion", "ofertas", "dashboard".\n` +
    `Ejemplo: "Te sugiero revisar el stock ahora. [ACTION:Ver Inventario 📦|inventario]"\n\n` +
    pageCtx + '\n\n' +
    businessSnapshot
  );
}

// ─── Función Principal de Envío (con Streaming) ───────────────────────────────
/**
 * Envía un mensaje al analista estratégico usando Groq.
 * @param {string} userMessage
 * @param {Array}  orders
 * @param {Array}  products
 * @param {Object} config
 * @param {Array}  conversationHistory
 * @param {string} currentPage
 * @param {Function|null} onChunk - Si se provee, activa streaming
 * @returns {Promise<string>}
 */
export async function sendMessageToAnalyst(
  userMessage,
  orders,
  products,
  config,
  conversationHistory,
  currentPage = '',
  onChunk = null
) {
  try {
    const businessSnapshot = buildBusinessSnapshot(orders || [], products || [], config, userMessage);
    const systemPrompt     = buildAdminSystemPrompt(businessSnapshot, currentPage);
    const shouldStream     = typeof onChunk === 'function';

    const messages = [
      { role: 'system', content: String(systemPrompt || '') },
      ...(conversationHistory || []).slice(-6).map(msg => ({
        role:    msg.role === 'user' ? 'user' : 'assistant',
        content: String(msg.text || ''),
      })),
      { role: 'user', content: String(userMessage || '') },
    ];

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages,
        temperature: 0.3,
        max_tokens:  600,
        stream:      shouldStream,
      }),
    };

    if (shouldStream) {
      const response = await fetch(GROQ_API_URL, requestOptions);
      if (response.status === 429) {
        throw new Error('El Analista está procesando muchos datos 📈. Reintenta en unos segundos.');
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error de API: ${response.status}`);
      }
      return await consumeStream(response, onChunk);
    }

    // Sin streaming: fallback normal
    const response = await fetchWithRetry(GROQ_API_URL, requestOptions);

    if (response.status === 429) {
      throw new Error('El Analista está procesando muchos datos 📈. Reintenta en unos segundos.');
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Error de API: ${response.status}`);
    }

    const data = await response.json();
    const text  = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Respuesta vacía del servidor.');
    return String(text).trim();

  } catch (error) {
    console.error('[AdminAnalyst AI Error]:', error);
    throw error;
  }
}
