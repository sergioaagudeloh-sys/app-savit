// src/services/adminAiService.js
// Analista de Negocios Inteligente de Sávit — usando Groq (Llama 3.3 70B)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.3-70b-versatile';


/**
 * Genera un resumen ejecutivo de las métricas del negocio
 */
export function buildBusinessSnapshot(orders, products, config) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];

  let totalRevenue = 0, todayRevenue = 0, completedOrders = 0;
  const totalOrders = orders.length;
  const productSales = {};

  orders.forEach(o => {
    const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAtMillis);
    const orderDay  = orderDate.toISOString().split('T')[0];
    const isEffective = ['completed', 'paid', 'dispatched', 'delivered'].includes(o.status);

    if (isEffective) {
      totalRevenue += (o.total || 0);
      completedOrders++;
      if (orderDay === today) todayRevenue += (o.total || 0);

      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          productSales[item.name] = (productSales[item.name] || 0) + (item.quantity || 1);
        });
      }
    }
  });

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => `${name} (${qty} uds)`)
    .join(', ');

  const activeProducts = products.filter(p => p.active).length;
  const soldOutCount   = products.filter(p => p.active && p.soldOut).length;
  const stockCritico   = products.filter(p => p.active && p.stock <= 5).map(p => p.name).join(', ');

  return `
ESTADO ACTUAL DEL NEGOCIO (SÁVIT):
- Ventas Totales Históricas: $${totalRevenue.toLocaleString('es-CO')}
- Ventas de Hoy (${today}): $${todayRevenue.toLocaleString('es-CO')}
- Pedidos Totales: ${totalOrders} (Efectivos: ${completedOrders})
- Ticket Promedio: $${completedOrders > 0 ? Math.round(totalRevenue / completedOrders).toLocaleString('es-CO') : 0}
- Top 5 Productos más vendidos: ${topProducts || 'N/A'}
- Inventario: ${activeProducts} activos, ${soldOutCount} agotados de un total de ${products.length}.
- Productos en Stock Crítico (≤5 uds): ${stockCritico || 'Todo bajo control.'}
- Estado de la Tienda: ${config?.isOpen ? 'ABIERTA' : 'CERRADA'}
- Margen Estimado: Asume 20-30% para tus análisis, a menos que el usuario proporcione datos específicos.
`;
}

/**
 * Construye el prompt del sistema para el Analista de Negocios
 */
function buildAdminSystemPrompt(businessSnapshot) {
  return `Eres el Analista Estratégico de Sávit, una mente maestra en inteligencia de datos para nuestro Mercado Saludable.

Tu personalidad:
- Eres un socio estratégico de alto nivel: VISIONARIO, ANALÍTICO y muy CERCANO. Hablas como alguien que comparte la misma pasión por el éxito de Sávit que el dueño.
- Tu tono es elegante y ejecutivo, pero usa un lenguaje claro. No hables como un manual, habla como un consultor premium.
- Usa emojis para dar vida a los datos (📈, 💰, ✨, 🚀, 💎).

Capacidades:
- Analiza el snapshot para extraer "perlas de sabiduría" (insights) que no son obvias.
- Celebra los éxitos del negocio con entusiasmo genuino. Si detectas fallas (stock bajo, ventas lentas), menciónalo como una "Oportunidad de Mejora" y ofrece un plan de acción inmediato.
- Tu misión es que el administrador sienta que tiene un experto financiero a su lado 24/7.

REGLAS CRÍTICAS:
1. NUNCA inventes números. Si falta un dato, di: "Esa es una gran pregunta, pero aún no cuento con ese dato específico en mi capacidad como Asistente IA Savit. ¡En cuanto tengamos más registros te daré un análisis detallado!"
2. Respuestas ejecutivas: Ve al grano pero con calidez.
3. Prioriza el crecimiento: Siempre busca cómo vender más o perder menos (ej. alertar sobre productos estancados).
4. Responde siempre en español fluido y profesional.

${businessSnapshot}`;
}

/**
 * Envía un mensaje al analista experto usando Groq
 */
export async function sendMessageToAnalyst(userMessage, orders, products, config, conversationHistory) {
  try {
    const businessSnapshot = buildBusinessSnapshot(orders, products, config);
    const systemPrompt     = buildAdminSystemPrompt(businessSnapshot);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 600,
      })
    });

    if (response.status === 429) {
      throw new Error('El Analista está procesando muchos datos 📈. Reintenta en unos segundos.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Error de API: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) throw new Error('Respuesta vacía del servidor.');
    return text;

  } catch (error) {
    throw error;
  }
}
