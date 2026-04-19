// src/pages/Orders.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCOP, formatDateShort } from '../utils/formatters';
import { OrderSkeleton } from '../components/ui/Skeleton';
import OrderTimeline from '../components/ui/OrderTimeline';
import { openWhatsApp } from '../utils/whatsapp';
import SEO from '../components/common/SEO';
import './Orders.css';

const STATUS_INFO = {
  pending: { label: 'Recibido (Cotizando Envío)', color: 'warning' },
  approved: { label: 'Aprobado (Esperando Pago)', color: 'info' },
  completed: { label: '💰 Pago Confirmado — ¡En camino! 🛵', color: 'success' },
  delivered: { label: '¡Pedido Entregado! 🏁', color: 'success' },
  cancelled: { label: 'Pedido Cancelado', color: 'danger' },
};

export default function Orders() {
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus, deleteOrder } = useOrders();
  const { setCartOpen } = useCart();
  const { addNotification } = useNotifications();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  const handleClearHistory = async () => {
    const ordersToProcess = myOrders.filter(o => o.status === 'cancelled' || o.status === 'delivered');
        
    try {
      // En lugar de borrar, los ocultamos para el cliente pero los dejamos para el admin
      await Promise.all(ordersToProcess.map(order => 
        updateOrderStatus(order.id, order.status, { hiddenForCustomer: true })
      ));
    } catch (error) {
      console.error('Error al limpiar historial:', error);
    }
    
    setShowClearConfirm(false);
  };
 
  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      await updateOrderStatus(orderToCancel.id, 'cancelled', { cancelledBy: 'customer' });
      addNotification({
        title: 'Pedido Cancelado por Cliente ✕',
        message: `El cliente ${orderToCancel.customerName} ha cancelado su pedido #${orderToCancel.orderId}.`,
        orderId: orderToCancel.id,
        targetRole: 'admin'
      });
      setOrderToCancel(null);
    } catch (e) {
      console.error(e);
    }
  };

  const myOrders = useMemo(() => {
    return orders.filter(o => !o.hiddenForCustomer);
  }, [orders]);

  return (
    <div className="app-container orders-page">
      <SEO 
        title="Mis Pedidos - Sávit"
        description="Revisa el estado de tus compras saludables y haz seguimiento a tus pedidos de Sávit en tiempo real."
      />
      <main className="page-content">
        <div className="orders-hero">
           <div className="orders-hero-content">
             <span className="orders-hero-label">Historial de compras</span>
             <h1 className="orders-hero-title">Mis Pedidos</h1>
             {myOrders.length > 0 && (
               <button 
                 className="btn-clear-history-hero" 
                 onClick={() => setShowClearConfirm(true)}
               >
                 🗑️ Vaciar historial
               </button>
             )}
           </div>
        </div>
        
        {loading ? (
          <div className="orders-list">
             {[...Array(3)].map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        ) : myOrders.length === 0 ? (
          <div className="orders-empty-state">
            <div className="orders-empty-icon">📦</div>
            <h3 className="orders-empty-title">Aún no tienes pedidos</h3>
            <p className="orders-empty-subtitle">
              Explora nuestro catálogo y haz tu primer pedido saludable.
            </p>
            <button
              className="btn btn-primary orders-empty-btn"
              onClick={() => navigate('/catalog')}
            >
              🛒 Nuevo Pedido
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {/* Título movido al hero */}

            {myOrders.map(order => {
              const info = STATUS_INFO[order.status] || { label: order.status, color: 'muted' };
              const finalTotal = order.total + (order.deliveryCost || 0);
              const isDeliveryActive = order.status === 'completed' || order.status === 'dispatched';

              return (
                <div key={order.id} className="order-card" style={{ paddingBottom: isDeliveryActive ? 'var(--space-xl)' : 'var(--space-md)' }}>
                  <div className="order-header">
                    <div>
                      <span className="order-id">{order.orderId}</span>
                      <div className="order-date">{formatDateShort(order.createdAt)}</div>
                    </div>
                    <div className={`badge badge-${info.color}`}>
                      {info.label}
                    </div>
                  </div>

                  {/* Timeline premium */}
                  <OrderTimeline status={order.status} />

                  {order.status === 'cancelled' && (
                    <div className="order-cancel-alert">
                      {order.cancelledBy === 'customer' ? (
                        <>🚫 <strong>Has cancelado este pedido.</strong> Esperamos verte pronto de nuevo. 🌿</>
                      ) : (
                        <div className="order-cancel-admin-container">
                          <div className="cancel-text">
                            🚫 <strong>Pedido cancelado por el administrador.</strong> Comunícate con nosotros por WhatsApp si tienes dudas.
                          </div>
                          <button 
                            className="btn btn-whatsapp btn-sm btn-cancel-whatsapp"
                            onClick={() => openWhatsApp(`Hola! Tengo una duda sobre mi pedido cancelado #${order.orderId}`)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                            </svg>
                            Hablar con Soporte
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'approved' && order.deliveryMethod === 'domicilio' && (
                    <div className="order-quote-alert">
                      ¡Tu envío ha sido cotizado por <strong>{formatCOP(order.deliveryCost || 0)}</strong>! Revisa tu WhatsApp para pagar.
                    </div>
                  )}

                  <div className="order-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="order-item-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 0' }}>
                        <div className="order-item-line">
                          <span className="order-item-qty">{item.quantity}x</span>
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-price">{formatCOP(item.price * item.quantity)}</span>
                        </div>
                        {item.selectedAdditions?.length > 0 && (
                          <div className="order-item-extras" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', paddingLeft: '28px', lineHeight: '1.2' }}>
                            + {item.selectedAdditions.map(a => a.name).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="order-summary-box">
                    <div className="order-subtotal-line">
                      <span>Subtotal</span>
                      <span>{formatCOP(order.total)}</span>
                    </div>
                    <div className="order-subtotal-line">
                      <span>{order.deliveryMethod === 'domicilio' ? 'Costo Domicilio' : 'Recogida'}</span>
                      <span>
                        {order.status === 'pending' && order.deliveryMethod === 'domicilio' 
                          ? 'Cotizando...' 
                          : order.deliveryMethod === 'domicilio' 
                            ? formatCOP(order.deliveryCost || 0) 
                            : 'Gratis'
                      }
                      </span>
                    </div>
                    <div className="order-total-line">
                      <span>Total</span>
                      <span>{order.status === 'pending' && order.deliveryMethod === 'domicilio' ? 'Por definir' : formatCOP(finalTotal)}</span>
                    </div>
                  </div>

                  {isDeliveryActive && (
                    <div className="motorcycle-track">
                      <div className="delivery-rider">📦</div>
                    </div>
                  )}

                  {order.status === 'pending' && (
                    <button 
                      className="btn btn-ghost w-full btn-sm" 
                      style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', marginTop: '12px', fontSize: '0.8rem' }}
                      onClick={() => setOrderToCancel(order)}
                    >
                      ✕ Cancelar mi pedido
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>
      {/* Modal: Confirmación Vaciar Historial */}
      {showClearConfirm && (
        <>
          <div className="overlay" onClick={() => setShowClearConfirm(false)} />
          <div className="modal-dialog">
            <div className="modal-content-wrapper">
              <div className="modal-content">
                <div className="modal-icon danger">🗑️</div>
                <h3 className="modal-title">¿Vaciar historial?</h3>
                <p className="modal-desc">
                  Se eliminarán permanentemente los pedidos cancelados y entregados de la base de datos.
                </p>
                <div className="modal-actions">
                  <button className="btn btn-ghost flex-1" onClick={() => setShowClearConfirm(false)}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary bg-danger flex-1" onClick={handleClearHistory}>
                    Sí, vaciar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: Confirmación Cancelación de Cliente */}
      {orderToCancel && (
        <>
          <div className="overlay" onClick={() => setOrderToCancel(null)} />
          <div className="modal-dialog">
            <div className="modal-content-wrapper">
              <div className="modal-content">
                <div className="modal-icon warning">⚠️</div>
                <h3 className="modal-title">¿Cancelar pedido?</h3>
                <p className="modal-desc">
                  ¿Estás seguro de que quieres cancelar el pedido #{orderToCancel.orderId}? Esta acción no se puede deshacer.
                </p>
                <div className="modal-actions">
                  <button className="btn btn-ghost flex-1" onClick={() => setOrderToCancel(null)}>
                    No, mantener
                  </button>
                  <button className="btn btn-primary bg-danger flex-1" onClick={handleCancelOrder}>
                    Sí, cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}


      {!showClearConfirm && !orderToCancel && null}
    </div>
  );
}
