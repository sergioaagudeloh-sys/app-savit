import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useStoreConfig, useOrders } from '../../hooks/useOrders';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete';
import { vibrateSuccess, vibrateTap } from '../../utils/haptics';
import { formatCOP } from '../../utils/formatters';
import EmptyState from '../common/EmptyState';
import './CartDrawer.css';

// Componente para cada item con soporte de gestos de deslizamiento
function CartItem({ item, onUpdateQty, onRemove }) {
  const itemRef = useRef(null);

  useSwipeToDelete(itemRef, () => {
    vibrateSuccess();
    onRemove(item.cartId, item.id);
  }, { threshold: 80 });

  return (
    <div className="cart-item" ref={itemRef}>
      <div className="cart-item-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <span>🌿</span>
        )}
      </div>
      <div className="cart-item-info">
        <div className="cart-item-name">{item.name}</div>
        {item.selectedAdditions?.length > 0 && (
          <div className="cart-item-extras" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px', lineHeight: '1.2' }}>
            + {item.selectedAdditions.map(a => a.name).join(', ')}
          </div>
        )}
        <div className="cart-item-price">{formatCOP(item.price)}</div>
      </div>
      <div className="cart-item-controls">
        <div className="qty-counter">
          <button className="qty-control-btn" onClick={() => onUpdateQty(item.cartId, item.quantity - 1, item.id)}>−</button>
          <span className="qty-counter-value">{item.quantity}</span>
          <button className="qty-control-btn" onClick={() => onUpdateQty(item.cartId, item.quantity + 1, item.id)}>+</button>
        </div>
        <div className="cart-item-subtotal">{formatCOP(item.price * item.quantity)}</div>
      </div>
    </div>
  );
}

// CartDrawer – montado por App.jsx sólo cuando isCartOpen es true
// Por eso NO necesita el guard `if (!isOpen) return null`
export default function CartDrawer({ onClose }) {
  const navigate = useNavigate();
  const { items, totalPrice, totalItems, updateQty, removeItem, clearCart } = useCart();
  const { config } = useStoreConfig();
  const { activeOrders } = useOrders();
  const drawerRef = useRef(null);

  // 🎯 Swipe-to-dismiss: deslizar hacia abajo cierra el carrito
  useSwipeToDismiss(drawerRef, onClose, { threshold: 80, direction: 'down' });

  const handleCatalogRedirect = () => {
    onClose();
    navigate('/catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay oscuro */}
      <div className="overlay" onClick={onClose} />

      {/* Panel deslizable */}
      <div className="drawer cart-drawer" ref={drawerRef}>
        <div className="drawer-handle" />

        <div className="cart-drawer-header">
          <h2 className="cart-drawer-title">Mi Carrito 🛒</h2>
          <div className="cart-header-actions">
            {items.length > 0 && (
              <button className="cart-clear-btn" onClick={() => { vibrateTap(); clearCart(); }}>Vaciar</button>
            )}
            <button className="cart-close-btn" onClick={() => { vibrateTap(); onClose(); }} aria-label="Cerrar carrito">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Pedidos en curso */}
        {activeOrders?.length > 0 && items.length > 0 && (
          <div className="cart-orders-progress">
            <div className="cart-orders-title">Pedidos en curso</div>
            <div className="cart-orders-list">
              {activeOrders.map(order => (
                <div
                  key={order.id}
                  className="cart-order-item"
                  onClick={() => { vibrateTap(); onClose(); navigate('/order-confirm', { state: { orderId: order.id } }); }}
                >
                  <div className="cart-order-info">
                    <span className="cart-order-id">Pedido #{order.id}</span>
                    <span className={`cart-order-status status-${order.status}`}>
                      {order.status === 'pending' ? 'Pendiente ⏳' : order.status === 'approved' ? 'Aprobado ✅' : 'Pagado 💎'}
                    </span>
                  </div>
                  <span className="cart-order-arrow">❯</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de items */}
        <div className="cart-items">
          {items.length === 0 ? (
            <EmptyState 
              icon="🛒"
              title="Carrito Vacío"
              message="Explora nuestros productos y llena tu vida de salud."
              action={
                <button className="btn btn-primary" onClick={handleCatalogRedirect}>
                  🌿 Ver Catálogo
                </button>
              }
            />
          ) : (
            items.map(item => (
              <CartItem
                key={item.cartId}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))
          )}
        </div>

        {/* Footer con total y acciones */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary">
              {config && !config.isOpen && (
                <div className="cart-status-notice mb-sm">
                  🌙 Pedido fuera de horario: será procesado al abrir.
                </div>
              )}
              <div className="cart-summary-row">
                <span className="text-muted">{totalItems} producto{totalItems !== 1 ? 's' : ''}</span>
                <span className="price price-lg">{formatCOP(totalPrice)}</span>
              </div>
            </div>

            <div className="cart-drawer-actions">
              <button className="btn btn-primary btn-checkout" onClick={() => { vibrateTap(); handleCheckout(); }}>
                Ir a Pedir 🛍️
              </button>
            </div>

            <button className="cart-drawer-continue" onClick={handleCatalogRedirect}>
              ← Continuar Comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
