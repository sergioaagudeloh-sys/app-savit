// src/services/aiService.js
// Sávit IA — Vendedor Estrella Élite
// Opción C: Modelo 70B, streaming, prompt estructurado sin contradicciones.

const GROQ_API_URL      = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY      = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL_CLIENT = 'llama-3.3-70b-versatile'; // 70B para clientes: máxima precisión
const GROQ_MODEL_ADMIN  = 'llama-3.1-8b-instant';    // 8B para admin: rápido y económico

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

// ─── Streaming desde Groq ─────────────────────────────────────────────────────
/**
 * Consume un stream SSE de Groq y llama a onChunk con el texto acumulado.
 * @param {Response} response - Respuesta fetch con stream: true
 * @param {Function} onChunk - Callback (fullTextSoFar: string) => void
 * @returns {Promise<string>} Texto completo final
 */
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
    buffer = lines.pop(); // mantener línea incompleta en buffer

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
      } catch { /* Ignorar líneas malformadas del stream */ }
    }
  }
  return fullText;
}

// ─── Detector de Etapa de Compra ─────────────────────────────────────────────
function detectClientStage(userBehavior) {
  if (!userBehavior) return 'EXPLORING';
  const { cart, currentPage } = userBehavior;
  if (currentPage?.includes('checkout')) return 'CHECKOUT';
  if (cart?.itemCount > 0)               return 'CART_ACTIVE';
  return 'EXPLORING';
}

// ─── Contexto Privado del Cliente ────────────────────────────────────────────
function buildClientContext(userBehavior) {
  if (!userBehavior) return '';

  const { cart, storeConfig } = userBehavior;
  const stage = detectClientStage(userBehavior);

  let ctx = '\n// CONTEXTO PRIVADO — NO revelar al cliente //';
  ctx += `\nETAPA: ${stage}`;

  if (cart?.itemCount > 0) {
    ctx += `\nCARRITO: ${cart.itemCount} ítem(s) | Total: $${(cart.total || 0).toLocaleString('es-CO')} COP`;
    if (cart.items?.length > 0) {
      ctx += `\nPRODUCTOS EN CARRITO: ${cart.items.map(i => `${i.name} x${i.qty}`).join(', ')}`;
    }
  } else {
    ctx += '\nCARRITO: Vacío';
  }

  if (storeConfig?.paymentBank) {
    ctx += `\nPAGO: ${storeConfig.paymentBank} — Solo efectivo o transferencia, NO tarjetas.`;
  }

  ctx += '\nPEDIDOS: No tienes acceso. Si preguntan, redirígelos a /orders.';
  return ctx;
}

// ─── Instrucciones por Etapa ─────────────────────────────────────────────────
function buildStageInstructions(userBehavior) {
  const stage = detectClientStage(userBehavior);

  const map = {
    EXPLORING: (
      `MODO — EXPLORACIÓN:\n` +
      `- Descubre qué necesita con UNA pregunta cálida.\n` +
      `- Sugiere 1 producto concreto con foto y botón.\n` +
      `- Incluye MÁXIMO UNA VEZ al final: [ACTION:Ver productos 🛒|/]`
    ),
    CART_ACTIVE: (
      `MODO — CARRITO ACTIVO:\n` +
      `- El cliente ya eligió. Refuerza su decisión con UN complemento inteligente.\n` +
      `- Si rechaza, llévalo directo al pago. No insistas.\n` +
      `- Incluye al final: [ACTION:Finalizar pedido 🚀|TECH:GO_TO_CART]`
    ),
    CHECKOUT: (
      `MODO — CHECKOUT:\n` +
      `- No distraigas con más productos. Transmite confianza.\n` +
      `- Explica que "Confirmar" envía el pedido por WhatsApp.\n` +
      `- Botón: [ACTION:Confirmar Pedido 🚀|TECH:GO_TO_CART]`
    ),
  };

  return map[stage] || map.EXPLORING;
}

// ─── Formato del Catálogo (SIN contradicción) ─────────────────────────────────
/**
 * CLAVE: el ID ya aparece en formato [ID:xxx] — el mismo que se debe usar al recomendar.
 * La IA no necesita "inventar" el formato, solo copiarlo. Sin prohibiciones contradictorias.
 */
function formatProduct(p) {
  const price    = Number(p.price) || 0;
  const priceStr = price > 0 ? `$${price.toLocaleString('es-CO')} COP` : 'Consultar';
  const promo    = p.isPromo && p.promoPrice
    ? ` | ⚡ OFERTA: $${Number(p.promoPrice).toLocaleString('es-CO')} COP`
    : '';
  const cat      = p.category ? ` | ${p.category}` : '';
  // El ID ya está en formato [ID:xxx] — la IA solo lo copia para recomendar
  return `• ${p.name} — ${priceStr}${promo}${cat} [ID:${p.id}]`;
}

// ─── Prompt Principal del Sistema ────────────────────────────────────────────
function buildSystemPrompt(products, isAdmin = false, userBehavior = null) {
  const available = products.filter(p => p.active && !p.soldOut);
  const soldOut   = products.filter(p => p.active && p.soldOut);

  const catalogText  = available.length > 0
    ? available.map(formatProduct).join('\n')
    : 'Sin productos disponibles en este momento.';

  const soldOutText  = soldOut.length > 0
    ? soldOut.map(p => p.name).join(', ')
    : 'Ninguno';

  if (isAdmin) {
    return (
      `Eres el Analista Ejecutivo de Sávit. Hablas CON EL ADMINISTRADOR.\n` +
      `Responde con métricas, sugerencias de stock y proyecciones. Tono: Corporativo.\n\n` +
      `CATÁLOGO ACTUAL:\n${catalogText}`
    );
  }

  const clientContext     = buildClientContext(userBehavior);
  const stageInstructions = buildStageInstructions(userBehavior);

  return (
    `# ROL\n` +
    `Eres Sávit IA, el Vendedor Estrella Élite de Sávit Mercado Saludable.\n` +
    `Personalidad: cálida, astuta, experta en nutrición. Asesor humano real, NO un bot.\n\n` +

    `# REGLAS ABSOLUTAS (nunca violar)\n` +
    `1. SALUD: Nunca prometas curar enfermedades. Usa: "apoya", "es ideal para", "puede ayudar a".\n` +
    `2. EMOJIS: Máximo 2 por mensaje.\n` +
    `3. CIERRE: Termina SIEMPRE con UNA sola pregunta corta.\n` +
    `4. PRECIOS: Usa signo $, separador de miles con punto, sufijo COP. Ej: $18.500 COP.\n` +
    `5. AGOTADOS: Si piden algo agotado, da la noticia con elegancia y ofrece un reemplazo inmediato.\n` +
    `6. PEDIDOS: Nunca describas el estado de un pedido. Redirige siempre así: [ACTION:Ver mis pedidos 📦|/orders]\n` +
    `7. LENGUAJE NATURAL: Nunca menciones datos técnicos crudos en tu texto (categorías en código, IDs, etc.).\n` +
    `8. PAGO: Si el cliente pregunta cómo pagar, transferencia, número de cuenta, banco o QR, incluye al final de tu mensaje exactamente: TECH:SHOW_PAYMENT_INFO\n` +
    `9. VENTA CRUZADA — REGLA DEL VENDEDOR INTELIGENTE:\n` +
    `   El sistema te informará en qué MODO debes responder cuando el cliente agrega un producto:\n` +
    `\n` +
    `   MODO_CRUZADA (primer producto): Venta cruzada activa.\n` +
    `     - Confirma con entusiasmo en 1 frase.\n` +
    `     - Sugiere 1-2 productos COMPLEMENTARIOS con [ID:xxx] y [ACTION:Agregar X|TECH:ADD_TO_CART:xxx].\n` +
    `     - Termina con: [ACTION:Ver carrito 🛒|TECH:OPEN_CART] [ACTION:Seguir explorando 🌿|/]\n` +
    `\n` +
    `   MODO_SILENCIOSO (segundo producto): No insistas. El cliente ya está comprando.\n` +
    `     - Confirma brevemente con 1 sola frase amigable (máx 10 palabras).\n` +
    `     - Solo muestra: [ACTION:Ver carrito 🛒|TECH:OPEN_CART]\n` +
    `     - NO sugieras más productos. NO hagas preguntas. Déjalo explorar con calma.\n` +
    `\n` +
    `   MODO_CIERRE (tercer producto o más): Ayúdalo a finalizar con confianza.\n` +
    `     - Una frase que celebre su selección: "¡Llevas una selección increíble!"\n` +
    `     - Una frase que genere confianza para cerrar: menciona el total aproximado o lo bien que combinan los productos.\n` +
    `     - Termina con: [ACTION:Finalizar pedido ✅|TECH:GO_TO_CART] [ACTION:Seguir agregando 🛒|TECH:OPEN_CART]\n\n` +

    `# CÓMO RECOMENDAR PRODUCTOS\n` +
    `Cuando recomiendas UN producto activamente, coloca AL FINAL de tu mensaje:\n` +
    `  - Su foto:   copia el [ID:xxx] exactamente como aparece en el catálogo\n` +
    `  - Su botón:  [ACTION:Agregar 🛒|TECH:ADD_TO_CART:xxx]\n\n` +
    `REGLA CRÍTICA: Solo incluye el [ID:] del producto que estás recomendando AHORA.\n` +
    `NO incluyas IDs de productos que ya están en el carrito o que mencionas solo de comparación.\n\n` +

    `EJEMPLO CORRECTO:\n` +
    `Pregunta: "¿Qué me recomiendas para el desayuno?"\n` +
    `Respuesta: "La Mantequilla Ghee es perfecta, cargada de vitaminas liposolubles. ¿La pruebas? [ID:ghee_001] [ACTION:Agregar Ghee 🧈|TECH:ADD_TO_CART:ghee_001]"\n\n` +

    `BOTONES ADICIONALES DISPONIBLES:\n` +
    `  [ACTION:Texto|TECH:OPEN_CART]        → abrir carrito\n` +
    `  [ACTION:Texto|TECH:GO_TO_CART]       → ir a finalizar pedido\n` +
    `  [ACTION:Texto|/ruta]                 → navegación (ej: /orders, /)\n\n` +

    `${stageInstructions}\n` +
    `${clientContext}\n\n` +

    `# CATÁLOGO VIGENTE\n` +
    `(Copia el [ID:xxx] tal cual está aquí cuando lo uses en tu recomendación)\n` +
    `${catalogText}\n\n` +

    `# AGOTADOS: ${soldOutText}\n` +
    `Si preguntan por estos, da la mala noticia y sugiere un reemplazo del catálogo disponible.`
  );
}

// ─── RAG Local: Filtrado por Relevancia ─────────────────────────────────────
function getRelevantProducts(allProducts, userMessage, userBehavior) {
  if (!Array.isArray(allProducts)) return [];
  const active = allProducts.filter(p => p.active && !p.soldOut);
  // Si hay 20 o menos, no necesita filtrar
  if (active.length <= 20) return active;

  const query     = (userMessage || '').toLowerCase();
  const interests = (userBehavior?.interests || []).map(id => String(id).toLowerCase());

  const scored = active.map(p => {
    let score    = 0;
    const name   = p.name.toLowerCase();
    const desc   = (p.description || '').toLowerCase();
    const cat    = (p.category || '').toLowerCase();

    if (query.includes(name))                 score += 10;
    if (query.includes(cat) && cat.length > 2) score += 5;

    query.split(' ').filter(w => w.length > 3).forEach(word => {
      if (name.includes(word)) score += 3;
      if (desc.includes(word)) score += 1;
    });

    // Sinapsis semántica ampliada con modismos colombianos y términos de salud
    const semantics = {
      // Sabores y antojos
      'dulce':      ['panela', 'mantequilla', 'arequipe', 'miel', 'chocolate', 'mermelada'],
      'salado':     ['snack', 'maní', 'nueces', 'semillas', 'granola'],
      'antojo':     ['snack', 'galleta', 'chocolate', 'maní', 'granola'],
      // Objetivos de salud colombianos
      'bajar':      ['fibra', 'verdura', 'avena', 'chia', 'bajo en calorías', 'light', 'proteína'],
      'adelgazar':  ['fibra', 'linaza', 'avena', 'proteína', 'bajo en calorías'],
      'engordar':   ['mantequilla', 'crema', 'calorías', 'proteína', 'volumen'],
      'colesterol': ['avena', 'omega', 'linaza', 'aceite de oliva', 'nueces'],
      // Necesidades
      'ansiedad':   ['snack', 'galleta', 'granola', 'frutos secos', 'maní', 'chocolate'],
      'estreñimiento': ['fibra', 'avena', 'chia', 'linaza', 'probiótico'],
      'digestión':  ['fibra', 'probiótico', 'avena', 'jengibre', 'chia'],
      'energía':    ['proteína', 'granola', 'nueces', 'quinoa', 'panela', 'miel'],
      'inflamación':['jengibre', 'cúrcuma', 'omega', 'linaza'],
      // Momentos del día
      'desayuno':   ['granola', 'arepa', 'panela', 'mermelada', 'avena', 'fruta'],
      'merienda':   ['snack', 'nueces', 'maní', 'galleta', 'fruta'],
      'lonchera':   ['snack', 'granola', 'nueces', 'galleta', 'fruta seca'],
      // Dietas
      'saludable':  ['orgánico', 'natural', 'sin conservantes', 'integral', 'chia', 'quinoa'],
      'keto':       ['mantequilla', 'aceite de coco', 'proteína', 'nueces', 'aguacate'],
      'vegano':     ['vegetal', 'proteína vegetal', 'nueces', 'semillas', 'linaza'],
      // Gimnasio / deporte
      'gimnasio':   ['proteína', 'crema de maní', 'mantequilla', 'energía', 'quinoa'],
      'músculo':    ['proteína', 'mantequilla', 'crema de maní', 'quinoa'],
      // Colombianismos
      'rico':       ['arequipe', 'panela', 'chocolate', 'mermelada'],
      'nutritivo':  ['quinoa', 'chia', 'avena', 'linaza', 'semillas'],
    };
    Object.entries(semantics).forEach(([key, terms]) => {
      if (query.includes(key)) {
        terms.forEach(term => {
          if (name.includes(term) || desc.includes(term)) score += 4;
        });
      }
    });

    if (p.isPromo) score += 2;
    if (interests.includes(String(p.id).toLowerCase())) score += 5;

    return { ...p, score };
  })
  .filter(p => p.score > 0)
  .sort((a, b) => b.score - a.score);

  // Top 10 productos relevantes (antes era 5, ahora más generoso)
  const limit = userBehavior?.cart?.itemCount > 0 ? 6 : 10;
  return scored.slice(0, limit);
}

// ─── Función Principal de Envío (con Streaming) ───────────────────────────────
/**
 * Envía un mensaje a Sávit IA con soporte de streaming.
 * @param {string} userMessage
 * @param {Array} products - Lista de productos de Firebase
 * @param {Array} conversationHistory
 * @param {boolean} isAdmin
 * @param {Object} userBehavior
 * @param {Function|null} onChunk - Si se provee, activa streaming. Callback: (fullTextSoFar) => void
 * @returns {Promise<string>} Texto completo de la respuesta
 */
export async function sendMessageToAI(
  userMessage,
  products,
  conversationHistory,
  isAdmin    = false,
  userBehavior = null,
  onChunk    = null
) {
  try {
    const relevantProducts = isAdmin
      ? (products || [])
      : getRelevantProducts(products || [], userMessage, userBehavior);

    const systemPrompt = buildSystemPrompt(relevantProducts, isAdmin, userBehavior);
    const model        = isAdmin ? GROQ_MODEL_ADMIN : GROQ_MODEL_CLIENT;
    const shouldStream = typeof onChunk === 'function' && !isAdmin;

    const messages = [
      { role: 'system', content: String(systemPrompt || 'Eres un asistente amable.') },
      ...(conversationHistory || []).slice(-8).map(msg => ({
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
        model,
        messages,
        temperature: isAdmin ? 0.3 : 0.65,
        max_tokens:  isAdmin ? 400  : 500,
        stream:      shouldStream,
      }),
    };

    if (shouldStream) {
      // Streaming: no usar fetchWithRetry (no compatible con streams)
      const response = await fetch(GROQ_API_URL, requestOptions);
      if (response.status === 429) {
        throw new Error('Sávit está muy ocupada ahora 🌿. Espera unos segundos e intenta de nuevo.');
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error de API: ${response.status}`);
      }
      return await consumeStream(response, onChunk);
    }

    // Sin streaming (admin o fallback)
    const response = await fetchWithRetry(GROQ_API_URL, requestOptions);

    if (response.status === 429) {
      throw new Error('Sávit está muy ocupada ahora 🌿. Espera unos segundos e intenta de nuevo.');
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
    console.error('[Sávit AI Error]:', error);
    throw error;
  }
}
