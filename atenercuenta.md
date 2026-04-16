# Notas de Desarrollo y Diseño - Sávit

Este documento sirve como guía para mantener la consistencia visual y la calidad de la experiencia de usuario (UX) en esta y futuras aplicaciones.

## 🚫 Prohibido: Diálogos Nativos del Navegador

**EVITAR COMPLETAMENTE** el uso de las siguientes funciones nativas de JavaScript:
- `window.alert()`
- `window.confirm()`
- `window.prompt()`

### Razones:
1. **Estética:** Son diálogos grises y genéricos que rompen con la identidad visual de la aplicación.
2. **UX Interrumpida:** Bloquean el hilo principal del navegador y no permiten personalización de botones, iconos o estilos.
3. **No Responsivos:** En móviles, su apariencia varía entre navegadores y a menudo se ven pequeños o fuera de lugar.

## ✅ Recomendación: Modales Integrados (Custom Modals)

Para cualquier acción que requiera confirmación o notificación, utilizar la estructura de modales personalizados de la aplicación:

### Ejemplo de Estructura:
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

### Beneficios:
- **Consistencia:** Utiliza la misma paleta de colores, tipografía y bordes que el resto de la app.
- **Interactividad:** Permite añadir animaciones de entrada/salida y mayor control sobre los eventos.
- **Accesibilidad:** Mejor control sobre el foco y el comportamiento en pantallas táctiles.

---
---
*Mantengamos la app con un diseño premium y profesional.*

## 🔔 Sistema de Notificaciones: NotificationFAB (Side-Tab)

Para implementar un sistema de notificaciones no intrusivo pero accesible, el componente `NotificationFAB` utiliza un diseño de **pestaña lateral** (Side-Tab) que evita colisiones con botones de acción comunes (FABs) en la esquina inferior derecha.

### 📍 Posicionamiento Estratégico (CSS)
En lugar de la esquina inferior, el botón se ubica en el centro vertical derecho para mayor ergonomía en dispositivos móviles:
```css
.notification-fab-container {
  position: fixed;
  top: 55%; /* Ligeramente debajo del centro exacto */
  right: 12px;
  transform: translateY(-50%);
  z-index: 1000;
}

.fab-button {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-lg); /* Forma rectancular suave (tab) */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  /* Estilos adicionales de glassmorphism opcionales */
}
```

### ⚡ Optimización de Rendimiento y Datos
Para evitar la saturación de la base de datos (Firestore) y mejorar la carga inicial, se aplican dos reglas de negocio críticas:

1.  **Filtro Automático de 24 Horas**: La vista inicial mostrará **únicamente** las notificaciones recibidas en el último día.
    ```javascript
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const recentNotifs = notifications.filter(n => (now - new Date(n.timestamp)) < DAY_IN_MS);
    ```
2.  **Carga Manual de Historial (Ver Más)**: No se cargan notificaciones antiguas automáticamente. Solo se revelan mediante un botón de "Ver anteriores..." que activa un estado local (`showHistory`).

### 🎨 Elementos Visuales Recomendados
- **Divisor de Grupos:** Utilizar un separador con la etiqueta "Anteriores 📅" para diferenciar claramente el historial del contenido reciente.
- **Badge Animada:** Un pequeño círculo flotante con el conteo de no leídas para incentivar la interacción.
- **Pestaña lateral:** Evitar botones circulares perfectos en los bordes; usar formas que sugieran una "prolongación" del margen del dispositivo.

---

## 🧱 Estabilización de Layout Administrativo (Full-Width Stability)

Para evitar el "flicker" o "shrinking" (encogimiento visual) del panel administrativo durante la navegación o recarga, se han implementado tres pilares técnicos críticos:

### 1. Manipulación Sincrónica del DOM (`useLayoutEffect`)
En `App.jsx`, la clase global `is-admin-route` se aplica al `body` utilizando `useLayoutEffect` en lugar del `useEffect` estándar.
- **Por qué:** `useEffect` es asincrónico y ocurre *después* de que el navegador pinta la pantalla. Esto provocaba un parpadeo donde la app se veía "pequeña" por un instante antes de expandirse. `useLayoutEffect` se ejecuta antes del pintado, garantizando una transición visualmente invisible.

### 2. Detección de Ruta Inmediata en Loaders
El componente `FullPageLoader` detecta si debe ser pantalla completa usando `window.location.pathname` directamente en lugar de esperar a que los hooks del router se propaguen.
- **Por qué:** Durante la carga de módulos pesados (Lazy Loading), el estado interno del router puede tardar unos milisegundos en reflejar la nueva ruta. Al usar la API nativa del navegador, el loader sabe instantáneamente que debe ser `100%` ancho, eliminando los "marcos blancos" laterales.

### 3. Blindaje de CSS (Container Hardening)
Las reglas que fuerzan el ancho completo deben estar ancladas a la clase del `body` con alta especificidad:
```css
body.is-admin-route .app-container,
body.is-admin-route .app-loader-overlay {
  max-width: 100% !important;
  margin: 0 !important;
  width: 100% !important;
}
```
- **Por qué:** Esto asegura que el contenedor principal y el fondo de carga sean consistentes incluso si el componente interno aún no se ha montado, manteniendo una estética "Full-Page" continua.

---
*Garantizar la estabilidad visual es clave para la percepción de una aplicación Premium.*

---

## 🐿️ Mascota Dinámica (Savi Evolution)

La mascota **Savi** es un componente de marca integral con personalidad y contexto. Para mantener esta consistencia:

### 1. Interfaz Basada en Contexto (`page` prop)
El componente `Mascot` recibe el prop `page` para ajustar su biblioteca de frases al flujo del usuario:
- `home`: Bienvenida y motivación.
- `catalog`: Tips de búsqueda y sugerencias.
- `orders`: Acompañamiento durante el proceso de entrega.
- `favorites`: Refuerzo positivo sobre los gustos del cliente.

### 2. Comportamiento Autónomo e Interactividad
- **Auto-Rotación:** Savi habla por sí sola cada **15 a 20 segundos** (aleatorio) para sentirse viva.
- **Sincronización:** Tocar a Savi reinicia el temporizador de rotación para evitar que el mensaje cambie mientras se lee.
- **Draggable (Arrastrable):** Los usuarios pueden moverla si obstruye contenido. La lógica distingue inteligentemente entre un "toque" (hablar) y un "arrastre" (mover).
- **Bloqueo de Menús:** Se han bloqueado los menús contextuales del navegador (`onContextMenu`) y long-press para que Savi se sienta como un personaje de app y no una imagen web.

### 3. Implementación Visual y Marca
- **Asset Oficial:** Utilizar siempre `/mascot.png`.
- **Estética Warm Gold:** El resplandor (glow) y las sombras deben ser **naranja/dorado cálido**, alineados con su diseño de ardilla.
- **Escala:** Tamaño estándar de **100px** para visibilidad premium.
- **Feedback:** Animaciones de levitación (`floatAndBreathe`), meneo (`wiggle`) al tocar, y sonidos contextuales.

---
---
*Savi no es solo un adorno; es el guía comunicativo de la experiencia Sávit.*

## 📏 Corrección de Gaps en "Heros" Administrativos

Para lograr una interfaz premium donde las secciones principales (Heros) se fundan con el header sin huecos blancos, se ha refinado la jerarquía de paddings en el panel admin:

### 1. El Problema: El "Padding Fantasma"
Originalmente, `.admin-main-content` tenía un `padding-top` global para evitar que el contenido quedara oculto bajo el `Header` fijo. Sin embargo, en páginas con **Hero Sections** (como el Carrusel de Promos o el Header de Inventario), este padding creaba un espacio vacío entre el header verde y el contenido oscuro, rompiendo la continuidad visual.

### 2. La Solución: Inversión de Responsabilidad
Se ha cambiado la lógica de "empujar desde afuera" a "rellenar desde adentro":
- **Reset Global:** Se aplicó `padding-top: 0` a `.admin-main-content` en las rutas que usan Heros (`AdminProducts`, `AdminDashboard`).
- **Ajuste Interno:** El componente Hero ahora es responsable de su propio espaciado superior usando `padding-top: var(--header-height)`. Esto garantiza que el fondo del Hero (verde, negro o degradado) se extienda por debajo del header transparente, eliminando cualquier gap.

### 3. Estabilidad en Desktop (Sidebar Shift)
Para asegurar que el contenido no sea tapado por el `AdminSidebar` (240px) en pantallas grandes, se implementó un ajuste global en `index.css`:
```css
@media (min-width: 960px) {
  body.is-admin-route .admin-main-content {
    padding-left: 240px; /* Desplazamiento automático para el sidebar */
  }
}
```
Esto permite que el desarrollador se olvide de aplicar márgenes laterales manuales en cada página nueva, manteniendo la consistencia en toda la suite administrativa.

---
---
*Detalles como la continuidad cromática entre header y hero definen la calidad de un producto profesional.*

---

## 🌯 Productos Preparados y Adiciones (Products v2)

El sistema de productos ha evolucionado para permitir una personalización profunda mediante "Ingredientes" (Adiciones).

### 1. Lógica de Identificación en el Carrito (`uniqueId`)
Para permitir que un mismo producto (ej: Smoothie) esté en el carrito varias veces con **diferentes personalizaciones**, se utiliza un `uniqueId` generado al momento de añadir al carrito:
- **Fórmula:** `productId_hashDeAdiciones`
- **Por qué:** Si el usuario pide un Smoothie con "Queso" y otro Smoothie con "Avena", el sistema debe tratarlos como items separados en lugar de simplemente aumentar la cantidad.

### 2. Cálculo de Precio Dinámico
El precio mostrado al cliente es la suma del `basePrice` del producto más el `price` de cada ingrediente seleccionado.
```javascript
const totalPrice = basePrice + selectedAdditions.reduce((acc, add) => acc + add.price, 0);
```

### 3. Visibilidad de Personalizaciones
Es **CRÍTICO** que las adiciones sean visibles en todos los puntos del flujo para evitar errores humanos en la preparación:
- **CartDrawer:** Lista de extras bajo el nombre.
- **Checkout:** Resumen visual antes de confirmar.
- **WhatsApp:** Incluirlas con un signo `+` en el mensaje estructurado.
- **AdminOrders:** Aparecen resaltadas en el detalle del pedido para el equipo de cocina.

---

---

## 🗂️ Jerarquía Visual y Z-Index (Overlay Layering)

Para evitar el error de "pantalla negra" donde el fondo oscuro (`overlay`) cubre los botones de acción del mensaje o modal, se ha definido una escala estricta de `z-index`.

### 1. El Error: Bloqueo de Interacción (Blackout)
Cuando el `z-index` del `.overlay` es mayor que el del `.modal-dialog`, la capa oscura se posiciona **delante** del contenido. 
- **Síntoma:** El usuario ve el mensaje pero no puede hacer clic en nada, o la pantalla se oscurece completamente sin permitir interacción.

### 2. Escala Oficial de Z-Index Sávit
Para mantener la consistencia, utilizar siempre estos rangos:

| Elemento | Z-Index | Propósito |
| :--- | :--- | :--- |
| **Sticky Headers** | `100` | Barra de navegación superior. |
| **Bottom Nav** | `1000` | Menú inferior móvil (debe estar sobre el header). |
| **Notification FAB** | `1000` | Pestaña lateral de avisos. |
| **Overlay General**| `99998` | Fondo oscuro para oscurecer la app. |
| **Product Detail** | `99999` | Vista previa de producto (Swipe-down). |
| **Modal Dialog** | `100001` | **MÁXIMA PRIORIDAD**. Confirmaciones de borrado, alertas de error, pedidos. |

### 3. Regla de Oro
Cualquier elemento que requiera una **decisión crítica** del usuario (borrar, confirmar, pagar) debe estar en el nivel `100001` para asegurar que nada (ni siquiera otros modales o el overlay) lo obstruya.

> [!IMPORTANT]
> Nunca uses `will-change` o `backdrop-filter` en el `.overlay` raíz en Android, ya que puede causar que la sombra se quede "congelada" incluso después de cerrar el modal.

---
---
*La jerarquía correcta garantiza que el usuario siempre mantenga el control de la aplicación.*



