import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useStoreConfig } from '../../hooks/useOrders';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete';
import { vibrateSuccess } from '../../utils/haptics';
import { formatCOP } from '../../utils/formatters';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import './CartDrawer.css';

// Componente para cada item con soporte de gestos
function CartItem({ item, onUpdateQty, onRemove }) {
  const itemRef = useRef(null);
  
  useSwipeToDelete(itemRef, () => {
    vibrateSuccess(); // Feedback háptico al "lanzar" el item
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

export default function CartDrawer({ onClose }) {
  const { items, totalPrice, totalItems, updateQty, removeItem, clearCart } = useCart();
  const { config } = useStoreConfig();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // 🎯 Swipe-to-dismiss: deslizar hacia abajo cierra el carrito
  useSwipeToDismiss(drawerRef, onClose, { threshold: 80, direction: 'down' });

  // Lock body scroll when drawer is mounted
  useBodyScrollLock(true);

  const goCheckout = () => {
    vibrateSuccess(); // 🎯 Haptic feedback al ir a pedir
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer cart-drawer" ref={drawerRef}>
        <div className="drawer-handle" />

        <div className="cart-drawer-header">
          <h2 className="cart-drawer-title">🛒 Mi Carrito</h2>
          <div className="cart-header-actions">
            {items.length > 0 && (
              <button className="cart-clear-btn" onClick={clearCart}>Vaciar</button>
            )}
            <button className="btn-icon" onClick={onClose} aria-label="Cerrar carrito">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {items.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <div className="empty-state-title">Carrito vacío</div>
            <p className="empty-state-desc">Agrega productos desde el catálogo</p>
            <button className="btn btn-primary mt-md" onClick={() => { onClose(); navigate('/catalog'); }}>
              🌿 Ver Catálogo
            </button>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="cart-items">
              {items.map((item, idx) => (
                <CartItem 
                  key={item.cartId || `${item.id}-${idx}`} 
                  item={item} 
                  onUpdateQty={updateQty} 
                  onRemove={removeItem} 
                />
              ))}
            </div>

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
              <button className="btn btn-whatsapp btn-lg" onClick={goCheckout}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
                Ir a Pedir — {formatCOP(totalPrice)}
              </button>
            </div>
          </>
        )}

      </div>
    </>
  );
}
