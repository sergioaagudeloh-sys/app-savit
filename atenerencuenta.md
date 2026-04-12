# 📋 COSAS A TENER EN CUENTA — Sávit PWA

## ⚠️ Nota sobre el inventario en Sávit
En Sávit, el inventario fue **desactivado deliberadamente** porque la propietaria maneja el stock desde un sistema POS externo. El catálogo funciona como un menú: los clientes piden libremente y el negocio gestiona la disponibilidad real de forma manual.

---

## 📦 Sistema de Inventario (Para Futuras Apps)

Si en otra aplicación necesitas un sistema de inventario completo, aquí está cómo fue implementado en Sávit antes de eliminarlo.

### 1. Estructura del Producto en Firestore
Cada documento en la colección `products` tenía el campo `stock`:

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

---

### 2. Hook: `useProducts.js` — Función `deductStock`

Esta función descontaba el stock automáticamente en Firebase cuando el admin confirmaba el pago de un pedido. Usaba `increment()` de Firestore para una operación atómica segura.

```js
// src/hooks/useProducts.js
import { increment } from 'firebase/firestore';

const deductStock = async (items) => {
  if (!items || !Array.isArray(items)) return;

  // Modo Demo (localStorage)
  if (!isFirebaseConfigured()) {
    const current = getDemoProducts();
    const updated = current.map(p => {
      const itemInOrder = items.find(i => i.id === p.id);
      if (itemInOrder) {
        return { ...p, stock: Math.max(0, p.stock - itemInOrder.quantity) };
      }
      return p;
    });
    saveDemoProducts(updated);
    return;
  }

  // Firebase Real
  const promises = items.map(item =>
    updateDoc(doc(db, 'products', item.id), {
      stock: increment(-item.quantity) // Operación atómica de Firestore
    })
  );
  await Promise.all(promises);
};

// Se exporta junto con los demás métodos:
return { products, loading, error, addProduct, updateProduct, toggleProduct, deleteProduct, deductStock };
```

**¿Cuándo se llama?** Al confirmar el pago en `AdminOrders.jsx`:
```js
// En AdminOrders.jsx, dentro de handleConfirmPayment():
await deductStock(selectedOrder.items);
```

---

### 3. `CartContext.jsx` — Límite de cantidad por stock

El reducer del carrito limitaba la cantidad máxima que el cliente podía agregar al tope del stock disponible:

```js
case 'ADD': {
  const existing = state.items.find(i => i.id === action.product.id);
  const stock = action.product.stock ?? 999; // 999 como fallback si no hay stock definido

  if (existing) {
    // No dejar pasar del stock disponible
    const newQty = Math.min(existing.quantity + (action.qty || 1), stock);
    return { ...state, items: state.items.map(i =>
      i.id === action.product.id ? { ...i, quantity: newQty } : i
    )};
  }
  const initialQty = Math.min(action.qty || 1, stock);
  return { ...state, items: [...state.items, { ...action.product, quantity: initialQty }] };
}

case 'UPDATE_QTY': {
  if (action.qty <= 0) {
    return { ...state, items: state.items.filter(i => i.id !== action.id) };
  }
  const item = state.items.find(i => i.id === action.id);
  const stock = action.stockLimit ?? item?.stock ?? 999;
  const finalQty = Math.min(action.qty, stock); // Nunca superar el stock

  return { ...state, items: state.items.map(i =>
    i.id === action.id ? { ...i, quantity: finalQty, stock } : i
  )};
}
```

Y la firma de `updateQty` pasaba el stockLimit:
```js
const updateQty = (id, qty, stockLimit) => dispatch({ type: 'UPDATE_QTY', id, qty, stockLimit });
```

---

### 4. `ProductCard.jsx` — UI del Stock

La tarjeta de producto mostraba badges visuales y bloqueaba el botón `+` cuando se llegaba al límite:

```jsx
const isLowStock = product.stock > 0 && product.stock <= 3;
const isOutOfStock = product.stock === 0 || !product.active;

// Badge "¡Últimas X!" sobreimpuesto en la imagen
{isLowStock && !isOutOfStock && (
  <div className="product-low-stock">¡Últimas {product.stock}!</div>
)}

// Overlay "Agotado" si stock === 0
{isOutOfStock && (
  <div className="product-out-of-stock-overlay">Agotado</div>
)}

// Botón + deshabilitado al llegar al tope de stock
<button
  className="qty-btn"
  onClick={(e) => handleQtyChange(e, +1)}
  disabled={qty >= product.stock}
>+</button>

// handleQtyChange enviaba el stock como límite
const handleQtyChange = (e, delta) => {
  const newQty = qty + delta;
  if (newQty <= 0) {
    updateQty(product.id, 0, product.stock);
  } else if (newQty <= product.stock) {
    updateQty(product.id, newQty, product.stock);
  }
  // Si newQty > product.stock, no hace nada → límite superado
};
```

Además la tarjeta era `out-of-stock` con clase CSS si no había stock:
```jsx
className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
```

---

### 5. `CartDrawer.jsx` — Aviso en el Carrito

Dentro del carrito se mostraba un aviso de "Límite alcanzado" en rojo debajo de los botones de cantidad:

```jsx
// CartDrawer.jsx
const productSource = products.find(p => p.id === item.id);
const currentStock = productSource ? productSource.stock : (item.stock ?? 0);
const isAtLimit = item.quantity >= currentStock;

// Botón + bloqueado
<button
  className="qty-btn"
  onClick={() => updateQty(item.id, item.quantity + 1, currentStock)}
  disabled={isAtLimit}
>+</button>

// Aviso visual
{isAtLimit && (
  <div className="cart-item-stock-warning">Límite alcanzado ({currentStock})</div>
)}
```

El CSS del aviso en `CartDrawer.css`:
```css
.cart-item-stock-warning {
  font-size: 10px;
  color: var(--color-danger);
  text-align: center;
  margin-top: 2px;
}
```

> **Nota:** El `CartDrawer` importaba `useProducts` para cruzar el stock actualizado del product real en Firestore contra el item del carrito. Así si el stock bajaba externamente, el carrito lo reflejaba.

---

### 6. `AdminProducts.jsx` — Gestión del Stock desde el Admin

El formulario de creación/edición de productos tenía el campo Stock:

```jsx
// Campo en el form
const [form, setForm] = useState({
  name: '', description: '', price: '', stock: '', category: '', imageUrl: '', active: true
});

// Validación al guardar
const stockVal = Number(form.stock);
if (isNaN(stockVal) || stockVal < 0) {
  showToast('El stock debe ser un número válido', 'error');
  return;
}

// En el objeto que va a Firestore
{ stock: stockVal, ...otrosCampos }

// En la lista de productos del admin se mostraba el stock con color si era bajo
<span className={`stock ${p.stock <= 3 ? 'low' : ''}`}>
  Stock: {p.stock}
</span>
```

CSS en `AdminProducts.css`:
```css
.product-admin-details .stock {
  color: var(--color-text-muted);
}
.product-admin-details .stock.low {
  color: var(--color-danger);
  font-weight: 700;
}
```

---

### 7. Flujo Completo de Inventario

```
ADMIN crea producto → stock: 50
    ↓
CLIENTE agrega al carrito → CartContext limita cantidad a máx 50
    ↓
ProductCard muestra "¡Últimas 3!" cuando stock <= 3
ProductCard muestra "Agotado" cuando stock === 0
    ↓
CLIENTE hace pedido → stock NO se descuenta aún (pedido pendiente)
    ↓
ADMIN aprueba pedido (cotiza domicilio) → stock NO se descuenta
    ↓
ADMIN confirma pago → deductStock() descuenta en Firestore
    → stock: increment(-quantity) por cada item del pedido
    ↓
ProductCard se actualiza en tiempo real (onSnapshot) → muestra nuevo stock
```

**Decisión de diseño:** El stock sólo se descuenta al **confirmar el pago**, no al crear el pedido. Así se evita bloquear stock por pedidos que luego se cancelan.

---

## 🗂️ Otros temas a recordar

_(Agregar más secciones aquí según surjan en futuros proyectos)_
