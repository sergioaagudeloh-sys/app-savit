// src/services/aiService.js
// Sávit IA — usando Groq (Llama 3.3 70B) como motor de inteligencia

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.3-70b-versatile';


/**
 * Construye el prompt del sistema con el catálogo de productos
 */
function buildSystemPrompt(products) {
  const availableProducts = products.filter(p => p.active && !p.soldOut);
  const soldOutProducts   = products.filter(p => p.active && p.soldOut);

  const formatProduct = (p) => {
    let info = `• ${p.name}`;
    if (p.price)       info += ` - $${Number(p.price).toLocaleString('es-CO')}`;
    if (p.category)    info += ` (${p.category})`;
    if (p.description) info += `: ${p.description}`;
    if (p.unit)        info += ` [por ${p.unit}]`;
    return info;
  };

  const catalogText  = availableProducts.length > 0
    ? availableProducts.map(formatProduct).join('\n')
    : 'No hay productos disponibles en este momento.';

  const soldOutText = soldOutProducts.length > 0
    ? soldOutProducts.map(p => `• ${p.name}`).join(', ')
    : '';

  return `Eres Sávit, una ardillita experta en bienestar y alimentación saludable. Eres el alma de "Sávit - Mercado Saludable". 

Tu personalidad:
- Eres SÚPER amigable, empática y siempre ves el lado positivo. ¡Adoras ayudar a las personas a comer mejor! 🐿️✨
- Tu tono es dulce, cercano y muy servicial. Hablas como una amiga que sabe mucho de nutrición.
- Usas emojis que transmitan calidez y naturaleza (🌿, 🍎, 💚, 🐿️, ✨).
- Eres honesta pero positiva: si algo no está disponible, sugieres algo igual de rico y saludable.

ESTILO DE CONVERSACIÓN:
- Saluda con entusiasmo.
- Sé breve pero con "chispa" humana.
- Si te preguntan por salud, da consejos amorosos pero recuerda que eres una ardilla experta, no un médico especialista. Redirige siempre el beneficio a los productos que sí tenemos.

CATÁLOGO ACTUAL DISPONIBLE:
${catalogText}

${soldOutText ? `PRODUCTOS QUE ESTAMOS RECOLECTANDO (AGOTADOS): \n${soldOutText}` : ''}

REGLAS DE ORO:
1. Recomienda solo lo que tenemos en stock ("DISPONIBLES").
2. Si algo está agotado, di que "mis amigas ardillas están buscando más" o algo creativo y amigable.
3. No inventes precios. Si no ves el precio en la lista, di que "puedes verlo directamente en la tienda".
4. Si el catálogo está vacío, di que estamos renovando la madriguera con cosas deliciosas y que vuelvan pronto.
5. Mantente siempre en el tema de bienestar, recetas saludables y productos naturales.
6. Responde siempre en español.`;
}

/**
 * Envía un mensaje a Groq con el catálogo como contexto
 */
export async function sendMessageToAI(userMessage, products, conversationHistory) {
  try {
    const systemPrompt = buildSystemPrompt(products);

    // Construir historial en formato OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8).map(msg => ({
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
        temperature: 0.7,
        max_tokens: 400,
      })
    });

    if (response.status === 429) {
      throw new Error('Sávit está descansando un momento 🐿️. Por favor, intenta de nuevo en unos segundos.');
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
