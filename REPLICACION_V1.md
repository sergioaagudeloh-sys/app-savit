# 🌿 𝕊𝕒𝕧𝕚𝕥 - Guía de Replicación (Versión 1.0)

Este documento contiene las instrucciones técnicas detalladas para reconstruir, replicar o reparar la **App Savit - Mercado Saludable** en su versión estable inicial. Esta versión funciona de forma autónoma (Modo Demo) usando `localStorage` para persistencia, permitiendo el uso completo de la app (catálogo, carrito, administración) sin necesidad de una base de datos Firebase activa.

---

## 🛠 1. Stack Tecnológico
*   **Core:** [React 19+](https://react.dev/)
*   **Build Tool:** [Vite 6+](https://vitejs.dev/)
*   **Routing:** [React Router 7](https://reactrouter.com/)
*   **Gráficos:** [Recharts](https://recharts.org/) (Para el Dashboard administrativo)
*   **Persistencia:** `localStorage` (Cache del navegador) + Firebase SDK (Preparado)
*   **PWA:** Service Workers nativos + Web App Manifest

## 📂 2. Estructura del Proyecto
```text
/
├── public/                 # Archivos estáticos
│   ├── assets/             # Imágenes y Splash Screens (welcome_hero.png)
│   ├── manifest.json       # Configuración PWA
│   └── sw.js               # Service Worker (Caché Offline)
├── src/
│   ├── components/         # Componentes reutilizables (Botones, Header, etc.)
│   ├── context/            # Estado global (Auth, Cart, Store)
│   ├── hooks/              # Lógica de datos (useProducts, useOrders)
│   ├── pages/              # Vistas completas (Welcome, Admin, Catalog)
│   ├── styles/             # Sistema de diseño (index.css principal)
│   └── utils/              # Funciones de ayuda (WhatsApp, Formateadores)
├── .env                    # Variables de entorno
├── index.html              # Punto de entrada HTML
└── vite.config.js          # Configuración de compilación
```

## 🚀 3. Instalación Local
1.  **Clonar/Descargar** el código en una carpeta limpia.
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Configurar Variables:** Crear un archivo `.env` en la raíz (ver sección 4).
4.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    *La app estará disponible en `http://localhost:3000`*

## 🔑 4. Variables de Entorno (`.env`)
Asegúrate de configurar estas variables. Si las de Firebase se dejan vacías o con valores de ejemplo, la app activará automáticamente el **Modo Demo**.

```env
# Configuración de WhatsApp
VITE_WHATSAPP_NUMBER=573216513171  # Número que recibirá los pedidos

# Configuración de Firebase (Opcional en V1)
VITE_FIREBASE_API_KEY=YOUR_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

## 📦 5. Gestión de Datos y Estado
### Autenticación (`AuthContext.jsx`)
*   Soporta `loginAsGuest()` para usuarios sin cuenta.
*   En modo Demo, el usuario se guarda localmente.

### Productos y Pedidos (`hooks/useProducts.js` y `useOrders.js`)
*   **Persistencia:** Si Firebase no detecta una API Key válida, usa `localStorage.getItem('savit_demo_products')`.
*   **Eventos:** Al modificar datos en modo demo, se dispara un `CustomEvent` (`savit_demo_products_changed`) para sincronizar todas las pestañas abiertas.

## 🎨 6. Sistema de Diseño (Design System)
Toda la estética reside en `src/styles/index.css`. Variables clave para réplica:
*   **Colores Primarios:** `#244c26` (Verde Bosque), `#84af24` (Verde Lima).
*   **Fondos:** `#f7fdf2` (Suave), `#ffffff` (Tarjetas).
*   **Tipografía:** Inter (Google Fonts).

### Estilos Premium
*   **Glassmorphism:** Usamos `backdrop-filter: blur(8px)` en overlays y headers.
*   **Sombras:** `0 16px 48px rgba(36, 76, 38, 0.20)` para dar profundidad.
*   **Efectos:** Todas las imágenes tienen `object-fit: cover` y transiciones suaves.

## 📱 7. Configuración PWA
Para que la app se instale en móviles como una app nativa:
1.  **Manifest:** `public/manifest.json` define el nombre, colores y el icono (`/logo-pwa.png`).
2.  **Service Worker:** `public/sw.js` gestiona la estrategia "Network-First" para asegurar que la app cargue incluso sin internet (cacheando `index.html` y activos estáticos).

## 💬 8. Integración con WhatsApp
La lógica de envío está en `src/utils/whatsapp.js`:
*   Usa el esquema `https://api.whatsapp.com/send/?phone=...&text=...` para máxima compatibilidad con escritorio y móvil.
*   Los mensajes usan emojis nativos construidos con `String.fromCodePoint` para evitar errores de codificación en diferentes sistemas operativos.

## ⚠️ 9. Resolución de Problemas (Troubleshooting)
1.  **Imágenes no cargan:** Verifica que estén en `public/assets/` y se llamen exactamente como en el código (sensible a mayúsculas/minúsculas).
2.  **Cambios no se ven:** Limpia la caché del navegador o desinstala y vuelve a instalar la PWA si el Service Worker ha cacheado una versión vieja (`CACHE_NAME` en `sw.js`).
3.  **Error en Build:** Asegúrate de que `recharts` esté instalado, ya que es necesario para los gráficos del administrador.

---
**Punto de Guardado:** Esta configuración representa la App Savit finalizada al 29/03/2026. Al replicar, sigue este orden: `npm install` -> `.env` -> `npm run dev`.
