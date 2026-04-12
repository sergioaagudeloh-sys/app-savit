# 🌿 Sávit - Mercado Saludable: UI Generation Blueprint

Este documento contiene las especificaciones visuales y funcionales para reconstruir la interfaz completa de Sávit. **IMPORTANTE:** Omitir cualquier flujo de login o registro. El acceso debe ser directo a la Home.

## 🎨 1. Sistema de Diseño (Design System)

### Colores
- **Primario:** `#244c26` (Verde Bosque) -> `background-color` de botones principales y cabeceras.
- **Acento:** `#84af24` (Verde Lima) -> Badges de oferta, iconos de acción y botones de WhatsApp.
- **Fondo General:** `#f7fdf2` (Verde Ultra-soft) -> Fondo de la página.
- **Tarjetas/Contenedores:** `#ffffff` (Blanco Puro).
- **Texto Principal:** `#1a2e1b` (Verde Carbón).
- **Texto Secundario:** `#4a5e4c` (Verde Musgo).
- **Texto Muted:** `#7d915c` (Tono Mate).

### Tipografía y Espaciado
- **Fuente:** 'Inter', sans-serif (priorizar pesos 400, 600, 700, 800).
- **Redondeo (Border Radius):**
  - Botones y Badges: `100px` (Pill style).
  - Tarjetas y Modales: `20px`.
  - Inputs: `12px`.
- **Sombras (Box Shadow):** `0 16px 48px rgba(36, 76, 38, 0.12)` para dar efecto de elevar los componentes sobre el fondo soft.

---

## 📱 2. Estructura de Layout (App Frame)
- **Mobile First:** El contenido debe estar encapsulado en un contenedor de máximo `430px` centrado horizontalmente en pantallas de escritorio.
- **Navegación Inferior (Bottom Nav):** Fija, con 4 iconos (Home, Catálogo, Perfil, Admin).
- **Header:** Fijo, con el logo de Sávit a la izquierda y el icono del Carrito con badge de conteo a la derecha.

---

## 🖼️ 3. Interfaces Requeridas (Frontend / Client)

### [PÁGINA 1: Client Home]
- **Sección Hero:** Banner promocional con bordes redondeados y imagen de "Mercado Saludable".
- **Categorías:** Fila horizontal scrolleable con iconos y nombres (ej: Frutos Secos, Semillas, Suplementos).
- **Sección de Ofertas:** Cuadrícula de 2 columnas con tarjetas de producto que muestran precio tachado.
- **Buscador:** Barra de búsqueda animada bajo el header.

### [PÁGINA 2: Catálogo Completo]
- Listado vertical infinito de productos con scroll suave.
- Filtros rápidos por categoría en la parte superior.
- **Product Card:** Imagen (top), Título (negrita), Precio (verde primario), Botón `+` flotante circular en la esquina inferior derecha de la tarjeta.

### [PÁGINA 3: Carrito & Checkout]
- **Drawer Lateral:** Al hacer clic en el carrito, se desliza un panel que ocupa el 90% de la pantalla desde la derecha o abajo.
- **Lista de Compra:** Items con foto, nombre, cantidad (control `+` / `-`) y subtotal.
- **Formulario de Entrega:** Inputs para Nombre, Dirección y Teléfono.
- **Botón Final:** "Finalizar Pedido vía WhatsApp" (Color: `#25d366`).

---

## ⚙️ 4. Interfaces Requeridas (Administración)

### [PÁGINA 4: Admin Dashboard]
- **Stats Cards:** 4 rectángulos elevados con: Total Ventas, Pedidos Hoy, Clientes, Ticket Promedio.
- **Gráfica:** Gráfico de líneas o áreas suave (Recharts style) mostrando tendencia semanal.
- **Switch de Tienda:** "Estado de la Tienda" (Abierto/Cerrada) con indicación visual tipo semáforo.

### [PÁGINA 5: Gestión de Inventario]
- Lista de productos con miniaturas y precios.
- Botón flotante "Añadir Producto" (Verde Lima).
- **Formulario de Edición:** Campos para Nombre, Precio Original, Precio Oferta, Stock y Subir Imagen.

### [PÁGINA 6: Seguimiento de Pedidos]
- Lista de tarjetas de pedido con estados de color (Pendiente: Naranja, Despachado: Azul, Entregado: Verde).
- Cada tarjeta muestra: ID, Nombre Cliente, Total y Selector de Estado.

---

## ✨ 5. Micro-interacciones y Efectos
- **Glassmorphism:** Header y Bottom Nav con fondo traslúcido y `backdrop-filter: blur(10px)`.
- **Skeleton Loading:** Siluetas animadas durante la carga inicial del catálogo.
- **Feedback Visual:** Animación de "salto" en el icono del carrito al agregar productos.
- **Transiciones:** Transiciones de página tipo "Fade" o "Slide" suaves de 250ms.
