# 📚 COSAS A TENER EN CUENTA — Sávit PWA
> Documento maestro de lecciones aprendidas, decisiones de diseño y referencias técnicas para este y futuros proyectos.
> Última consolidación: Mayo 2026.

---

## 📑 Índice de Contenidos

1. [Firebase y Backend](#1-firebase-y-backend)
2. [UX, Animaciones y Diseño Visual](#2-ux-animaciones-y-diseño-visual)
3. [Arquitectura de la Aplicación](#3-arquitectura-de-la-aplicación)
4. [Componentes y Patrones Reutilizables](#4-componentes-y-patrones-reutilizables)
5. [Funcionalidades Completas para Reutilizar](#5-funcionalidades-completas-para-reutilizar)
6. [Backlog de Mejoras Futuras](#6-backlog-de-mejoras-futuras)

---

## 1. Firebase y Backend

### 🔥 Validación Robusta de Configuración de Firebase
**Problema:** La app presentaba pantallas en blanco o "loops" infinitos de carga porque `isFirebaseConfigured()` retornaba `true` erróneamente cuando el `.env` tenía el placeholder de Vite (`'YOUR_API_KEY'`).

**Solución:**
```javascript
export const isFirebaseConfigured = () => {
  const key = firebaseConfig.apiKey;
  if (!key) return false;
  // Rechaza cualquier placeholder (Español o Inglés)
  const placeholders = ['TU_API_KEY', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (placeholders.includes(key)) return false;
  // Una clave real de Firebase suele tener más de 30 caracteres
  if (key.length < 10) return false;
  return true;
};
```
**Regla:** Nunca asumir que un valor no-nulo es válido. Siempre validar contra los valores predeterminados de los archivos de ejemplo, independientemente del idioma del placeholder.

---

### ⚙️ Gestión de Service Workers y Caché
**Problema:** Correcciones en el código no se reflejaban en el navegador del usuario porque el `sw.js` devolvía `undefined` en el bloque `catch`, causando un `TypeError` fatal.

**Solución:**
- El bloque `catch` del fetch en el Service Worker **siempre debe devolver una respuesta válida** (fallback a `index.html` o un `Response` vacío con status `200`).
- Incrementar la versión del caché (`v1` → `v2`, etc.) al corregir errores críticos de carga, para forzar la actualización en los clientes.

**Regla:** Al corregir errores que afecten la carga de la página, siempre incrementar la versión del Service Worker e indicarle al usuario que haga un "Hard Reload" (`Ctrl+Shift+R`).

---

## 2. UX, Animaciones y Diseño Visual

### 🚫 Prohibido: Diálogos Nativos del Navegador
**NUNCA usar:**
- `window.alert()`
- `window.confirm()`
- `window.prompt()`

**Razones:** Son grises y genéricos (rompen la identidad visual), bloquean el hilo principal, y su apariencia varía entre navegadores móviles.

**Solución — Modal Personalizado:**
```jsx
{showModal && (
  <>
    <div className="overlay" onClick={() => setShowModal(false)} />
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-icon warning">⚠️</div>
        <h3 className="modal-title">¿Estás seguro?</h3>
        <p className="modal-desc">Esta acción no se puede deshacer.</p>
        <div className="modal-actions">
          <button className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>
            Cancelar
          </button>
          <button className="btn btn-primary bg-danger flex-1" onClick={handleConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </>
)}
```

---

### 💀 Skeleton Loaders (Rendimiento Percibido)
**Problema:** Durante la carga de Firebase, el usuario veía pantallas vacías, lo que hacía la app parecer lenta.

**Solución:** Implementar **Skeleton Loaders** en todas las pantallas principales (`Home`, `ClientHome`, `Orders`, `AdminProducts`).

**Regla:** Nunca dejar una pantalla en blanco. El cerebro percibe las interfaces como más rápidas si ve un adelanto de la estructura del contenido.

---

### 🚀 Fluidez y Aceleración por Hardware (GPU)
**Problema:** Animaciones de paneles tironeadas en dispositivos de 120Hz por usar propiedades CSS costosas.

**Solución:**
- Migrar todas las animaciones críticas a `translate3d(x, y, z)` para forzar el uso de la **GPU**.
- Optimizar tiempos a **250ms** con curvas `Quart-Out` para respuesta tipo app nativa.
- Usar `will-change` para pre-renderizar capas que se mueven frecuentemente.

**Regla:** Para PWAs, usar siempre `transform` y `opacity`. Son las únicas propiedades que no disparan "Layout" o "Paint" en el navegador.

---

### 📐 Jerarquía de Z-Index (Escala Oficial Sávit)
**Problema:** El overlay oscuro cubría los botones de los modales, bloqueando la interacción del usuario.

| Elemento | Z-Index | Propósito |
| :--- | :--- | :--- |
| **Sticky Headers** | `100` | Barra de navegación superior |
| **Bottom Nav** | `1000` | Menú inferior móvil |
| **Notification FAB** | `1000` | Pestaña lateral de avisos |
| **Overlay General** | `99998` | Fondo oscuro para la app |
| **Product Detail** | `99999` | Vista previa de producto (Swipe-down) |
| **Modal Dialog** | `100001` | **MÁXIMA PRIORIDAD** — Confirmaciones, alertas críticas |

> [!IMPORTANT]
> Nunca uses `will-change` o `backdrop-filter` en el `.overlay` raíz en Android, ya que puede causar que la sombra se quede "congelada" después de cerrar el modal.

---

### 🏛️ Corrección de Gaps en "Heros" Administrativos
**Problema:** El `padding-top` global de `.admin-main-content` creaba un espacio vacío entre el header y los Heroes visuales, rompiendo la continuidad cromática.

**Solución — Inversión de Responsabilidad:**
- **Reset Global:** `padding-top: 0` a `.admin-main-content` en rutas con Heros.
- **Ajuste Interno:** El Hero es responsable de su propio espaciado: `padding-top: var(--header-height)`. Así el fondo del Hero se extiende por debajo del header transparente.

**Regla Desktop (Sidebar Shift):**
```css
@media (min-width: 960px) {
  body.is-admin-route .admin-main-content {
    padding-left: 240px; /* Desplazamiento automático por el sidebar */
  }
}
```

---

### 🖥️ Estabilización de Layout Administrativo (Anti-Flicker)
Para evitar el "shrinking" (encogimiento visual) del panel al navegar o recargar:

**1. `useLayoutEffect` en lugar de `useEffect`** para clases del body:
```javascript
// En App.jsx
useLayoutEffect(() => {
  if (location.pathname.startsWith('/admin')) {
    document.body.classList.add('is-admin-route');
  } else {
    document.body.classList.remove('is-admin-route');
  }
}, [location.pathname]);
```
`useEffect` es asíncrono y ocurre *después* del pintado. `useLayoutEffect` se ejecuta antes, eliminando el parpadeo.

**2. Blindaje CSS con alta especificidad:**
```css
body.is-admin-route .app-container,
body.is-admin-route .app-loader-overlay {
  max-width: 100% !important;
  margin: 0 !important;
  width: 100% !important;
}
```

**3. Detección de ruta inmediata en Loaders:** Usar `window.location.pathname` directamente en los loaders de `Suspense`, sin esperar a los hooks del router.

---

## 3. Arquitectura de la Aplicación

### 🏠 Separación de Inicio y Catálogo (ClientHome vs Home)
**Decisión Arquitectural:**
- **`/home` → `ClientHome.jsx`**: Página de "marketing" y "educación". Muestra bienvenida personalizada, consejos de salud, categorías destacadas con iconos. Es el punto de entrada emocional.
- **`/catalog` → `Home.jsx`**: Herramienta directa de compra. Lista completa de productos con búsqueda y filtros.

**Regla:** La página de **Inicio** debe ser siempre el punto de entrada de marketing, mientras que el **Catálogo** es la herramienta de compra. Esto mejora significativamente el feel premium de la app.

---

### 👤 Separación del Flujo de Perfil (Admin vs Cliente)
**Problema:** Ambos roles compartían `/profile` con un componente intermedio confuso.

**Solución — Enrutamiento Inteligente en `BottomNav.jsx`:**
- **Admin** → `'/admin/config'` directamente (controles de tienda, URLs, cierre de sesión).
- **Cliente** → `'/profile'` con formulario directo (nombre, celular, edad).

**Regla:** Menos clics = mejor UX. Cuando una pantalla tiene un solo objetivo, evitar pantallas intermedias innecesarias.

---

### 🏷️ Selector de Emojis para Categorías
**Solución Implementada en `AdminProducts.jsx`:**
- Selector de emojis con lista de sugerencias saludables (🥗, 🥑, 💪, etc.) o escritura manual.
- El hook `addCategory` persiste el campo `icon` en Firebase.
- `ClientHome.jsx` es dinámica: lee las categorías y muestra sus iconos.

**Regla:** Mantener coherencia visual — los administradores deben ser alentados a elegir emojis representativos para mantener la estética premium de la pantalla principal.

---

### ✅ Validación de Integridad y Prevención de Duplicados
**Solución:** Validar la duplicidad de nombres en el **frontend** (`useProducts.js`) antes de escribir en Firebase.

- Feedback con Toast específico: *"Ya existe un producto/categoría con este nombre"*.

**Regla:** Prevenir antes de enviar. Siempre validar duplicados en el frontend para ahorrar operaciones de escritura en la BD y mejorar la experiencia de usuario.

---

## 4. Componentes y Patrones Reutilizables

### 🔔 Sistema de Notificaciones: NotificationFAB (Side-Tab)
**Posicionamiento Estratégico (CSS):**
```css
.notification-fab-container {
  position: fixed;
  top: 55%; /* Ligeramente debajo del centro */
  right: 12px;
  transform: translateY(-50%);
  z-index: 1000;
}

.fab-button {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-lg); /* Forma rectangular suave (tab) */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
```

**Reglas de Negocio para Rendimiento:**
1. **Filtro de 24 Horas:** Solo mostrar notificaciones recientes en la vista inicial:
```javascript
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const recentNotifs = notifications.filter(n => (now - new Date(n.timestamp)) < DAY_IN_MS);
```
2. **Carga Manual de Historial:** No cargar notificaciones antiguas automáticamente. Solo mediante botón "Ver anteriores...".

---

### 🐿️ Mascota Dinámica (Sávit Mascot)
**Comportamiento:**
- Recibe prop `page` para ajustar su biblioteca de frases al contexto (`home`, `catalog`, `orders`, `favorites`, `checkout`, `confirm`).
- **Auto-Rotación:** Habla por sí sola cada ~15 segundos.
- **Draggable:** Distingue entre "toque" (hablar) y "arrastre" (mover posición).
- **Bloqueo de Menús Contextuales:** `onContextMenu` bloqueado para sentirse como personaje de app nativa.

**Especificaciones de Marca:**
- Asset oficial: `/mascot.png`
- Resplandor y sombras: **naranja/dorado cálido** (alineado con la ardilla).
- Tamaño estándar: **100px**.
- Animaciones: levitación (`floatAndBreathe`), meneo (`wiggle`), con sonidos contextuales.

**Nota:** La ardilla es un elemento de **branding y marketing** (promociones, consejos saludables, burbujas de texto). No debe usarse como interfaz de chat de IA.

---

### 🛍️ Productos Preparados y Adiciones (Products v2)
**Lógica de Identificación en el Carrito (`uniqueId`):**
- Un mismo producto puede estar múltiples veces en el carrito con diferentes personalizaciones.
- **Fórmula del uniqueId:** `productId_hashDeAdiciones`
- Esto permite que un "Smoothie con Queso" y un "Smoothie con Avena" sean items separados.

**Cálculo de Precio Dinámico:**
```javascript
const totalPrice = basePrice + selectedAdditions.reduce((acc, add) => acc + add.price, 0);
```

**Visibilidad de Personalizaciones (CRÍTICO):**
Las adiciones deben ser visibles en **todos** los puntos del flujo:
- `CartDrawer` → Lista de extras bajo el nombre
- `Checkout` → Resumen visual antes de confirmar
- `WhatsApp` → Con signo `+` en el mensaje estructurado
- `AdminOrders` → Resaltadas en el detalle del pedido (para el equipo de cocina)

---

## 5. Funcionalidades Completas para Reutilizar

### 📦 Sistema de Inventario (Desactivado en Sávit — Referencia Futura)

> **Nota Sávit:** El inventario fue desactivado deliberadamente porque la propietaria gestiona el stock desde un POS externo. El catálogo funciona como un menú.

Si en otra aplicación necesitas inventario completo, aquí está el patrón probado:

**Estructura del Producto en Firestore:**
```json
{
  "name": "Nombre del Producto",
  "price": 15000,
  "stock": 25,
  "category": "Frutas",
  "active": true,
  "imageUrl": "https://...",
  "createdAt": "...",
  "description": "..."
}
```

**`useProducts.js` — Función `deductStock` (Operación Atómica):**
```javascript
import { increment } from 'firebase/firestore';

const deductStock = async (items) => {
  if (!isFirebaseConfigured()) {
    // Modo Demo: actualizar localStorage
    const current = getDemoProducts();
    const updated = current.map(p => {
      const itemInOrder = items.find(i => i.id === p.id);
      return itemInOrder ? { ...p, stock: Math.max(0, p.stock - itemInOrder.quantity) } : p;
    });
    saveDemoProducts(updated);
    return;
  }
  // Firebase Real: operación atómica con increment()
  const promises = items.map(item =>
    updateDoc(doc(db, 'products', item.id), {
      stock: increment(-item.quantity)
    })
  );
  await Promise.all(promises);
};
```
> Se llama al **confirmar el pago** (no al crear el pedido). Así se evita bloquear stock por pedidos cancelados.

**`CartContext.jsx` — Límite por Stock:**
```javascript
case 'ADD': {
  const existing = state.items.find(i => i.id === action.product.id);
  const stock = action.product.stock ?? 999; // 999 como fallback
  if (existing) {
    const newQty = Math.min(existing.quantity + (action.qty || 1), stock);
    return { ...state, items: state.items.map(i =>
      i.id === action.product.id ? { ...i, quantity: newQty } : i
    )};
  }
  const initialQty = Math.min(action.qty || 1, stock);
  return { ...state, items: [...state.items, { ...action.product, quantity: initialQty }] };
}
```

**`ProductCard.jsx` — UI del Stock:**
```jsx
const isLowStock = product.stock > 0 && product.stock <= 3;
const isOutOfStock = product.stock === 0 || !product.active;

// Badge "¡Últimas X!" sobre la imagen
{isLowStock && !isOutOfStock && (
  <div className="product-low-stock">¡Últimas {product.stock}!</div>
)}

// Overlay "Agotado"
{isOutOfStock && (
  <div className="product-out-of-stock-overlay">Agotado</div>
)}
```

**Flujo Completo:**
```
ADMIN crea producto → stock: 50
    ↓
CLIENTE agrega al carrito → CartContext limita a máx 50
    ↓
ProductCard muestra "¡Últimas 3!" cuando stock <= 3
ProductCard muestra "Agotado" cuando stock === 0
    ↓
CLIENTE hace pedido → stock NO se descuenta aún
    ↓
ADMIN aprueba → stock NO se descuenta
    ↓
ADMIN confirma pago → deductStock() → stock: increment(-quantity)
    ↓
ProductCard se actualiza en tiempo real (onSnapshot)
```

---

## 6. Backlog de Mejoras Futuras

### 🖼️ Gestión de Imágenes Nativa con Firebase Storage *(Prioridad Media)*
**Objetivo:** Eliminar la dependencia de URLs externas para fotos de productos.
**Implementación:** Integrar Firebase Storage en `AdminProducts.jsx` con botón de carga que suba el archivo y retorne la URL estable automáticamente.

---

### ⚡ Duplicador de Productos *(Prioridad Baja)*
**Objetivo:** Agilizar la carga masiva de inventario similar.
**Implementación:** Botón "Clonar" en la lista de productos que abra el modal con los datos del producto origen precargados.

---

### 📉 Tablero de Estadísticas / Insights *(Prioridad Baja)*
**Objetivo:** Dar valor de negocio al administrador.
**Implementación:** Sección de "Insights" con productos más pedidos y resumen de ventas por categoría, basado en los pedidos enviados a WhatsApp.

---

### 🛒 Persistencia del Carrito en la Nube *(Prioridad Media)*
**Objetivo:** Evitar que el cliente pierda su carrito al cambiar de dispositivo o navegador.
**Implementación:** Sincronizar el estado de `CartContext` con una colección `carts` en Firestore, asociada al `uid` del usuario autenticado.

---

*Última actualización: Mayo 2026 — Consolidación de a_tener_en_cuenta.md, atenercuenta.md y atenerencuenta.md*
