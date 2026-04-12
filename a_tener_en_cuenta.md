# Lecciones Aprendidas y Pautas de Desarrollo - Sávit App

Este archivo contiene un registro de errores críticos, sus causas raíz y soluciones para evitar recurrencia durante el desarrollo y mantenimiento del proyecto.

---

## 1. Validación de Configuración de Firebase (Causa Raíz de Bloqueos de Carga)

### 🚨 El Problema
La aplicación presentaba pantallas en blanco o "loops" infinitos de carga (spinners) al intentar ingresar al panel de administrador o cargar productos, incluso cuando se pretendía trabajar en modo demo local.

### 🔍 Causa Raíz
Una falla de lógica en la función `isFirebaseConfigured()` ubicada en `src/firebase.js`:
- El código verificaba si el `apiKey` era distinto de `'TU_API_KEY'`.
- Sin embargo, el archivo `.env` contenía el valor predeterminado de Vite: `'YOUR_API_KEY'`.
- Resultado: La función retornaba `true` erroneamente, haciendo que la app intentara conectarse a una base de datos inexistente de Firebase, quedando en un estado de espera perpetuo ("hung").

### ✅ Solución Implementada
Se robusteció la validación para ser agnóstica al idioma de los placeholders y verificar la longitud mínima de una clave real:

```javascript
export const isFirebaseConfigured = () => {
  const key = firebaseConfig.apiKey;
  if (!key) return false;
  // Rechaza cualquier valor de marcador de posición (Español o Inglés)
  const placeholders = ['TU_API_KEY', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (placeholders.includes(key)) return false;
  // Una clave real de Firebase suele tener más de 30 caracteres
  if (key.length < 10) return false; 
  return true;
};
```

### 💡 Pauta para el futuro
- **Nunca asumir que un valor no-nulo es válido.** Siempre validar contra los valores predeterminados de las plantillas o archivos de ejemplo.
- Si la app depende de una conexión externa que puede fallar o no estar configurada, el sistema de "Modo Demo" debe ser el último recurso seguro (fallback) y su detección debe ser infalible.

---

## 2. Gestión de Service Workers y Caché

### 🚨 El Problema
Correcciones en el código (como el fix de Firebase anterior) no se reflejaban en el navegador del usuario, persistiendo el error de carga.

### 🔍 Causa Raíz
El `sw.js` (Service Worker) tenía una estrategia de caché que no manejaba correctamente errores de red en rutas SPA, devolviendo `undefined` en lugar de una `Response` válida. Esto causaba un `TypeError` fatal en el navegador que bloqueaba la ejecución de React.

### ✅ Solución Implementada
- Se ajustó el `sw.js` para asegurar que el bloque `catch` del fetch siempre devuelva una respuesta (fallback a `index.html` o un `200` vacío).
- Se incrementó la versión del caché (`v1` -> `v2`) para forzar la actualización en los navegadores de los usuarios.

### 💡 Pauta para el futuro
- Al corregir errores críticos que afecten la carga de la página, **siempre incrementar la versión del Service Worker** y recordar al usuario realizar un "Hard Reload" (Ctrl+Shift+R).

---

## 3. Separación de Inicio y Catálogo (Cliente)

### 🚨 El Problema
Los botones de "Inicio" y "Catálogo" en la barra de navegación del cliente mostraban el mismo contenido (la lista de productos), lo que resultaba redundante y poco amigable para el usuario.

### ✅ Solución Implementada
- Se creó una nueva página dedicada para el inicio del cliente: `src/pages/ClientHome.jsx`.
- Esta nueva página ofrece una bienvenida personalizada, consejos de salud, categorías destacadas y un acceso visual al catálogo.
- El catálogo de productos se movió a la ruta `/catalog`, manteniendo el componente original `Home.jsx`.
- Se implementó lógica en `Home.jsx` para pre-seleccionar una categoría cuando el usuario viene navegando desde los accesos directos de `ClientHome`.

### 💡 Pauta para el futuro
- La página de **Inicio** debe ser siempre el punto de entrada de "marketing" y "educación" para el cliente logueado, mientras que el **Catálogo** es la herramienta directa de compra. Esto mejora significativamente el "look & feel" premium de la aplicación.

---

## 4. Selector de Iconos (Emojis) para Categorías

### 🚨 El Problema
Al crear nuevas categorías desde el panel administrativo, no había forma de asignarles el icono (emoji) que se muestra en la pantalla de "Inicio" del cliente, lo que dejaría las nuevas categorías con un icono genérico o vacío.

### ✅ Solución Implementada
- Se añadió un **Selector de Emojis** en el drawer de "Gestionar Categorías" dentro de `AdminProducts.jsx`.
- El administrador ahora puede elegir entre una lista de sugerencias saludables (🥗, 🥑, 💪, etc.) o escribir cualquier emoji manualmente.
- El hook `addCategory` ahora persiste el `icon` en la base de datos/Storage.
- La página de `ClientHome.jsx` se volvió totalmente dinámica: ahora lee las categorías reales configuradas por el administrador y muestra sus iconos personalizados.

### 💡 Pauta para el futuro
- Mantener la cohesión visual: los administradores deben ser alentados a elegir emojis que representen bien la categoría para mantener la estética premium de la pantalla principal del cliente.

---

## 5. Separación del Flujo de Perfil (Admin vs Cliente)

### 🚨 El Problema
Ambos roles compartían la misma ruta (`/profile`) y un componente intermedio confuso. El administrador tenía que hacer clic en "Ajustes de tienda" dentro de su perfil para acceder a las opciones reales, y el cliente debía abrir un modal desde "Configuración de perfil".

### ✅ Solución Implementada
- **Enrutamiento Inteligente:** La barra de navegación inferior (`BottomNav.jsx`) ahora mapea el botón "Perfil" dinámicamente:
  - Para Administradores: Apunta directamente a `/admin/config`, revelando los controles de la tienda (abrir/cerrar), gestión de URLs y cierre de sesión inmediato.
  - Para Clientes: Apunta a `/profile`, pero la vista ha sido "aplanada". Ya no muestra un submenú, sino directamente un formulario nativo para actualizar nombre, celular y edad, junto a las notificaciones y el historial.

### 💡 Pauta para el futuro
- **Menos clics = mejor UX:** Siempre que una pantalla contenga un solo objetivo principal (ej. el administrador configurando la tienda), bypass (evitar) pantallas intermedias innecesarias para dirigir al usuario a la acción directa.

---

---

## 6. Validaciones de Integridad y Duplicados

### 🚨 El Problema
Al crear productos o categorías con el mismo nombre, se generaban inconsistencias visuales y errores en la base de datos (Firebase y LocalStorage). Además, el administrador recibía mensajes de error genéricos que no explicaban el problema.

### ✅ Solución Implementada
- **Validación en el Hook:** Se añadió lógica en `useProducts.js` que verifica contra el estado actual (`products` y `categories`) antes de enviar a Firebase.
- **Feedback Visual:** Ahora el sistema lanza un error específico: *"Ya existe un producto/categoría con este nombre"*, el cual se muestra mediante un Toast en lugar de una alerta del navegador.

### 💡 Pauta para el futuro
- **Prevenir antes de enviar:** Siempre validar la duplicidad de nombres en el frontend para ahorrar operaciones de escritura en la base de datos y mejorar la experiencia de usuario.

---

## 7. Optimización de Rendimiento Percibido (Skeletons)

### 🚨 El Problema
Durante la carga inicial de datos desde Firebase, el usuario veía una pantalla vacía o un solo spinner central, lo que hacía que la app pareciera lenta o "colgada".

### ✅ Solución Implementada
- Se implementaron **Skeleton Loaders** (siluetas de carga) en todas las pantallas principales (`Home`, `ClientHome`, `Orders`, `AdminProducts`).
- Esto imita la estructura real del contenido esperado, reduciendo la ansiedad de espera y mejorando la percepción de velocidad.

### 💡 Pauta para el futuro
- **Nunca dejar una pantalla en blanco:** El cerebro humano percibe las interfaces como más rápidas si ve un adelanto de la estructura del contenido final.

---

## 8. Fluidez y Aceleración por Hardware (GPU)

### 🚨 El Problema
Las animaciones de los paneles (carrito, modales) se sentían tironeadas o con pocos FPS en dispositivos de 120Hz debido al uso de propiedades CSS costosas (como `translateY` solo o `background-position`).

### ✅ Solución Implementada
- **Parche de Fluidez:** Se migraron todas las animaciones críticas a `translate3d(x, y, z)`. Esto fuerza el uso de la **GPU** del smartphone en lugar de la CPU.
- **Transiciones Snappy:** Se optimizaron los tiempos a **250ms** con curvas de aceleración `Quart-Out` para una respuesta tipo app nativa.
- **will-change:** Se añadieron pistas al navegador para pre-renderizar capas que se mueven frecuentemente.

### 💡 Pauta para el futuro
- **Hardware Acceleration:** Para PWAs, siempre usa propiedades que no disparen el "Layout" o "Paint" del navegador (usar `transform` y `opacity` es lo ideal).

---

## 9. Backlog de Mejoras de Producción (Fases Futuras)

Para que el proyecto pase de "Prototipo Avanzado" a "Producto Comercial", estas son las tareas registradas a realizar:

### 🖼️ Gestión de Imágenes Nativa (Prioridad Media)
- **Objetivo:** Eliminar la dependencia de URLs externas para las fotos de productos.
- **Implementación:** Integrar **Firebase Storage**. El panel administrativo (`AdminProducts.jsx`) debe incluir un botón de carga/galería que suba el archivo `.jpg/png` a la nube y retorne la URL estable automáticamente.

### ⚡ Duplicador de Productos (Prioridad Baja)
- **Objetivo:** Agilizar la carga masiva de inventario similar.
- **Implementación:** Añadir un botón de "Clonar" en la lista de productos que abra el modal con los datos ya precargados del producto origen.

### 📉 Tablero de Estadísticas (Prioridad Baja)
- **Objetivo:** Dar valor de negocio al administrador.
- **Implementación:** Crear una sección de "Insights" con productos más vistos (uso de analítica) y resumen de ventas por categoría basándose en pedidos enviados a WhatsApp.

### 🛒 Persistencia de Carrito en la Nube (Prioridad Media)
- **Objetivo:** Evitar que el cliente pierda sus productos al cambiar de navegador/dispositivo.
- **Implementación:** Sincronizar el estado del `CartContext` con una colección `carts` en Firestore asociada al `uid` del usuario registrado.

