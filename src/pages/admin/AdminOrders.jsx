// src/pages/admin/AdminOrders.jsx
import { useMemo, useState } from 'react';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useOrders, useStoreConfig } from '../../hooks/useOrders';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/layout/Toast';
import SearchBar from '../../components/ui/SearchBar';
import { buildAdminToClientMessage, openWhatsAppToClient } from '../../utils/whatsapp';
import { formatCOP, formatDateShort } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

import './AdminOrders.css';
import EmptyState from '../../components/common/EmptyState';

const STATUS_LABELS = {
  pending: 'Pendientes (Cotizar)',
  approved: 'Aprobados (Esperando Pago)',
  completed: 'En Camino',
  delivered: 'Entregados',
};

export default function AdminOrders() {
  const { orders, loading, updateOrderStatus, updateOrderDelivery, deleteOrder } = useOrders();
  const { config } = useStoreConfig();
  const { toasts, showToast } = useToast();
  const { addNotification } = useNotifications();

  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deliveryInput, setDeliveryInput] = useState('');
  const [pages, setPages] = useState({
    pending: 0,
    approved: 0,
    completed: 0,
    delivered: 0
  });
  const ITEMS_PER_PAGE = 5;
  const [expandedSections, setExpandedSections] = useState({
    pending: true,
    approved: true,
    completed: true,
    delivered: false
  });

  useBodyScrollLock(!!selectedOrder || !!orderToCancel || showClearConfirm);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const columns = useMemo(() => {
    const sortByDate = (a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAtMillis || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAtMillis || 0);
      return dateB - dateA; // Descendente: más recientes primero
    };

    return {
      pending: orders.filter(o => o.status === 'pending').sort(sortByDate),
      approved: orders.filter(o => o.status === 'approved').sort(sortByDate),
      completed: orders.filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'dispatched').sort(sortByDate),
      delivered: orders.filter(o => o.status === 'delivered').sort(sortByDate),
    };
  }, [orders]);

  const dailyStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const deliveredToday = orders.filter(o => {
      const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAtMillis);
      const isToday = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime() === todayStart;
      return o.status === 'delivered' && isToday;
    });

    const pendingToday = orders.filter(o => {
      const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAtMillis);
      const isToday = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime() === todayStart;
      return o.status === 'pending' && isToday;
    });

    const activeToday = orders.filter(o => {
      const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAtMillis);
      const isToday = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime() === todayStart;
      return o.status !== 'cancelled' && isToday;
    });

    return { 
      deliveredToday: deliveredToday.length, 
      pendingToday: pendingToday.length,
      totalToday: activeToday.length
    };
  }, [orders]);

  const onDragStart = (e, orderId) => {
    e.dataTransfer.setData('orderId', orderId);
  };

  const onDrop = async (e, status) => {
    const orderId = e.dataTransfer.getData('orderId');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Si se arrastra a aprobado y es domicilio, forzar apertura de detalle para poner precio
    if (status === 'approved' && order?.deliveryMethod === 'domicilio' && !order.deliveryCost) {
      handleCardClick(order);
      showToast('Indica el costo de envío para aprobar este pedido', 'info');
      return;
    }

    try {
      await updateOrderStatus(orderId, status);
      showToast(`Pedido actualizado a ${STATUS_LABELS[status] || status}`, 'success');

      // Notificar al cliente según el nuevo estado
      if (status === 'approved') {
        addNotification({
          title: '¡Pedido Aprobado! 🛵',
          message: `Tu pedido #${order.orderId} ha sido aprobado. Costo de envío: ${formatCOP(order.deliveryCost || 0)}. Por favor, realiza el pago por WhatsApp.`,
          orderId: order.id,
          targetRole: 'client',
          userId: order.customerPhone
        });
      } else if (status === 'completed') {
        addNotification({
          title: 'Pago Confirmado ✅',
          message: `Tu pedido #${order.orderId} se encuentra en camino 🛵.`,
          orderId: order.id,
          targetRole: 'client',
          userId: order.customerPhone
        });
      } else if (status === 'delivered') {
        addNotification({
          title: 'Pedido Entregado 📦',
          message: `¡Tu pedido #${order.orderId} ha sido entregado! Gracias por elegir Savit.`,
          orderId: order.id,
          targetRole: 'client',
          userId: order.customerPhone
        });

      }
    } catch (err) {
      showToast('Error al actualizar el estado', 'error');
    }
  };

  const handleCardClick = (order) => {
    setSelectedOrder(order);
    setDeliveryInput(order.deliveryCost || '');
  };

  const handleApprove = async () => {
    try {
      if (selectedOrder.deliveryMethod === 'domicilio' && deliveryInput === '') {
        showToast('Ingresa el costo del domicilio', 'error');
        return;
      }
      
      const newCost = selectedOrder.deliveryMethod === 'domicilio' ? Number(deliveryInput) : 0;
      await updateOrderDelivery(selectedOrder.id, newCost);
      const updatedOrder = { ...selectedOrder, deliveryCost: newCost, status: 'approved' };
      
      showToast('Pedido cotizado y aprobado', 'success');
      
      addNotification({
        title: '¡Pedido Aprobado! 🛵',
        message: `Tu pedido #${selectedOrder.orderId} ha sido aprobado. Costo de envío: ${formatCOP(newCost)}. Por favor, realiza el pago por WhatsApp para procesar el envío.`,
        orderId: selectedOrder.id,
        targetRole: 'client',
        userId: selectedOrder.customerPhone
      });

      setSelectedOrder(null);

      // Abrir WhatsApp con la cuenta de cobro
      const msg = buildAdminToClientMessage(updatedOrder, config?.paymentAccount || '');
      openWhatsAppToClient(updatedOrder.customerPhone, msg);
    } catch (err) {
      showToast('Error al procesar', 'error');
    }
  };

  const handleConfirmPayment = async () => {
    try {
      await updateOrderStatus(selectedOrder.id, 'completed');
      
      showToast('Pago confirmado ✅', 'success');

      addNotification({
        title: 'Pago Confirmado ✅',
        message: `Tu pedido #${selectedOrder.orderId} se encuentra en camino 🛵.`,
        orderId: selectedOrder.id,
        targetRole: 'client',
        userId: selectedOrder.customerPhone
      });

      setSelectedOrder(null);
    } catch (err) {
      showToast('Error al confirmar', 'error');
    }
  };

  const handleMarkAsDelivered = async () => {
    try {
      await updateOrderStatus(selectedOrder.id, 'delivered');
      showToast('Pedido entregado y finalizado', 'success');

      addNotification({
        title: 'Pedido Entregado 📦',
        message: `¡Tu pedido #${selectedOrder.orderId} ha sido entregado! Gracias por elegir Savit.`,
        orderId: selectedOrder.id,
        targetRole: 'client',
        userId: selectedOrder.customerPhone
      });



      setSelectedOrder(null);
    } catch (err) {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleCancelOrder = async () => {
    try {
      if (!orderToCancel) return;
      await updateOrderStatus(orderToCancel.id, 'cancelled', { cancelledBy: 'admin' });
      showToast('Pedido cancelado', 'info');

      addNotification({
        title: 'Pedido Cancelado ✕',
        message: `Tu pedido #${orderToCancel.orderId} ha sido cancelado por el administrador.`,
        orderId: orderToCancel.id,
        targetRole: 'client',
        userId: orderToCancel.customerPhone
      });

      setOrderToCancel(null);
      setSelectedOrder(null);
    } catch (err) {
      showToast('Error al cancelar', 'error');
    }
  };

  const handleDeleteCancelled = () => {
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    if (cancelledOrders.length === 0) {
      showToast('No hay pedidos cancelados para limpiar', 'info');
      return;
    }
    setShowClearConfirm(true);
  };

  const confirmDeleteCancelled = async () => {
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    try {
      await Promise.all(cancelledOrders.map(o => deleteOrder(o.id)));
      showToast('Pedidos cancelados eliminados definitivamente', 'success');
    } catch (err) {
      showToast('Error al eliminar pedidos', 'error');
    } finally {
      setShowClearConfirm(false);
    }
  };

  if (loading) return (
    <div className="app-container admin-orders admin-page">
      <Header />
      <AdminSidebar />
      <div className="flex-center w-full" style={{ height: '80vh' }}>
        <span className="spinner spinner-dark" />
      </div>
    </div>
  );

  return (
    <div className="app-container admin-orders admin-page">
      <Header />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Monitor de Pedidos</span>
                <h1 className="inv-hero-title">Gestión de Ventas</h1>
              </div>
            </div>

            <div className="inv-stats orders-hero-stats">
              <div className="inv-stat highlight">
                <span className="inv-stat-value">{dailyStats.pendingToday}</span>
                <span className="inv-stat-label">Pendientes</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{dailyStats.totalToday}</span>
                <span className="inv-stat-label">Total Hoy</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{dailyStats.deliveredToday}</span>
                <span className="inv-stat-label">Entregados</span>
              </div>
            </div>
          </div>
        </div>


        <div className="admin-page-content">
          {/* Unified Tooling: Centered Actions */}
          <div className="inv-toolbar-base centered-toolbar">
            <button 
              className="inv-action-btn danger animate-pulse" 
              onClick={handleDeleteCancelled}
              title="Vaciar pedidos cancelados"
            >
              <span className="inv-action-icon">🗑️</span>
              <span className="inv-action-text">Vaciar pedidos cancelados</span>
            </button>
          </div>

          <div className="orders-board-vertical">
            {Object.keys(STATUS_LABELS).map(status => {
              const allItems = columns[status];
              const totalItems = allItems.length;
              const currentPage = pages[status] || 0;
              const paginatedItems = allItems.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
              
              return (
                <div 
                  key={status} 
                  className={`order-group ${expandedSections[status] ? 'expanded' : 'collapsed'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, status)}
                >
                  <div className={`order-group-header status-${status}`} onClick={() => toggleSection(status)}>
                    <div className="flex items-center gap-sm">
                      <span className="expand-icon">{expandedSections[status] ? '▾' : '▸'}</span>
                      {STATUS_LABELS[status]}
                      <span className="kanban-count">{totalItems}</span>
                    </div>
                  </div>
                
                {expandedSections[status] && (
                  <div className="order-group-body">
                    {paginatedItems.map(order => (
                      <div 
                        key={order.id} 
                        className="admin-compact-card"
                        draggable
                        onDragStart={(e) => onDragStart(e, order.id)}
                        onClick={() => handleCardClick(order)}
                      >
                        <div className="compact-card-top">
                          <span className="compact-id">#{(order.orderId || '000000').slice(-6)}</span>
                          <span className="compact-date">{formatDateShort(order.createdAt)}</span>
                        </div>
                        <div className="compact-card-bottom">
                          <span className="compact-customer">{order.customerName || 'Cliente Anónimo'}</span>
                          <div className="flex items-center gap-xs">
                            <span className="compact-delivery-icon">
                              {order.deliveryMethod === 'domicilio' ? '🛵' : '🏪'}
                            </span>
                            <span className="compact-total">{formatCOP(order.total || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {paginatedItems.length === 0 && (
                      <EmptyState 
                        icon="📭"
                        title="Sin pedidos"
                        message={`No hay pedidos en estado ${STATUS_LABELS[status].toLowerCase()}.`}
                      />
                    )}

                    {totalItems > ITEMS_PER_PAGE && (
                      <div className="pagination-controls" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="pagination-btn" 
                          disabled={currentPage === 0}
                          onClick={() => setPages(prev => ({ ...prev, [status]: Math.max(0, prev[status] - 1) }))}
                        >
                          ‹ Ant.
                        </button>
                        <span className="pagination-info">
                          Pág. {currentPage + 1} de {Math.ceil(totalItems / ITEMS_PER_PAGE)}
                        </span>
                        <button 
                          className="pagination-btn" 
                          disabled={(currentPage + 1) * ITEMS_PER_PAGE >= totalItems}
                          onClick={() => setPages(prev => ({ ...prev, [status]: prev[status] + 1 }))}
                        >
                          Sig. ›
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
        <p className="orders-drag-hint">
          💡 Clic para detalle / Arrastra para cambiar de estado
        </p>

        {selectedOrder && (
          <>
            <div className="overlay" onClick={() => setSelectedOrder(null)} />
            <div className="modal-responsive">
              <div className="modal-responsive-header">
                <div className="ao-order-meta" style={{ flex: 1, margin: 0, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="ao-order-id" style={{ margin: 0 }}>#{(selectedOrder.orderId || '').slice(-8)}</span>
                    <span className="ao-order-date" style={{ margin: 0 }}>{formatDateShort(selectedOrder.createdAt)}</span>
                  </div>
                  <span className={`status-pill status-${selectedOrder.status}`}>
                    {selectedOrder.status === 'pending'   && '📋 Pendiente'}
                    {selectedOrder.status === 'approved'  && '✅ Aprobado'}
                    {selectedOrder.status === 'completed' && '🛵 En Camino'}
                    {selectedOrder.status === 'dispatched'&& '🛵 Enviado'}
                    {selectedOrder.status === 'delivered' && '🏁 Entregado'}
                    {selectedOrder.status === 'cancelled' && '✕ Cancelado'}
                    {selectedOrder.status === 'paid'      && '💰 Pagado'}
                  </span>
                </div>
                <button className="modal-responsive-close" onClick={() => setSelectedOrder(null)} aria-label="Cerrar">✕</button>
              </div>

              <div className="modal-responsive-body">
                {/* Primary CTA */}
                {selectedOrder.status === 'pending' && (
                  <button className="btn btn-primary w-full ao-cta-btn" onClick={handleApprove} style={{ marginTop: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Aprobar y Enviar Cobro
                  </button>
                )}
                {selectedOrder.status === 'approved' && (
                  <button className="btn w-full ao-cta-btn ao-cta-success" onClick={handleConfirmPayment} style={{ marginTop: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Confirmar Pago Recibido
                  </button>
                )}
                {(selectedOrder.status === 'completed' || selectedOrder.status === 'paid' || selectedOrder.status === 'dispatched') && (
                  <button className="btn btn-primary w-full ao-cta-btn" onClick={handleMarkAsDelivered} style={{ marginTop: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Marcar como Entregado
                  </button>
                )}

                {/* Secondary actions */}
                <div className="ao-secondary-actions" style={{ marginBottom: 'var(--space-xl)' }}>
                  {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                    <button className="ao-btn-outline ao-btn-danger" onClick={() => setOrderToCancel(selectedOrder)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      Cancelar pedido
                    </button>
                  )}
                  <button className="ao-btn-outline" onClick={() => setSelectedOrder(null)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Cerrar
                  </button>
                </div>

                {/* Customer info card */}
                <div className="ao-info-card">
                  <div className="ao-info-row">
                    <span className="ao-info-icon">👤</span>
                    <div>
                      <div className="ao-info-label">Cliente</div>
                      <div className="ao-info-value">{selectedOrder.customerName || 'Anónimo'}</div>
                    </div>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-icon">📱</span>
                    <div>
                      <div className="ao-info-label">WhatsApp</div>
                      <div className="ao-info-value">
                        <a href={`https://wa.me/57${selectedOrder.customerPhone}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
                          {selectedOrder.customerPhone}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="ao-info-row ao-info-row--no-border">
                    <span className="ao-info-icon">
                      {selectedOrder.deliveryMethod === 'domicilio' ? '🛵' : '🏪'}
                    </span>
                    <div>
                      <div className="ao-info-label">{selectedOrder.deliveryMethod === 'domicilio' ? 'Domicilio a' : 'Recogida en tienda'}</div>
                      {selectedOrder.address && (
                        <div className="ao-info-value">{selectedOrder.address}</div>
                      )}
                    </div>
                  </div>
                  {selectedOrder.notes && (
                    <div className="ao-notes-badge">
                      <span>📝</span> {selectedOrder.notes}
                    </div>
                  )}
                </div>

                {/* Products card */}
                <div className="ao-section-label">Productos del pedido</div>
                <div className="ao-items-card">
                  {Array.isArray(selectedOrder.items) ? selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="ao-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 0' }}>
                      <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                        <div className="ao-item-qty" style={{ width: '28px', flexShrink: 0, fontWeight: 600, color: 'var(--color-text-muted)' }}>{item.quantity || 1}×</div>
                        <div className="ao-item-name" style={{ flex: 1, fontWeight: 500 }}>{item.name || 'Sin nombre'}</div>
                        <div className="ao-item-price" style={{ fontWeight: 600 }}>{formatCOP((item.price || 0) * (item.quantity || 1))}</div>
                      </div>
                      {item.selectedAdditions?.length > 0 && (
                        <div className="ao-item-extras" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', paddingLeft: '28px', lineHeight: '1.2' }}>
                          + {item.selectedAdditions.map(a => a.name).join(', ')}
                        </div>
                      )}
                    </div>
                  )) : <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Sin items válidos</p>}
                </div>

                {/* Delivery cost input (only for pending domicilio) */}
                {selectedOrder.status === 'pending' && selectedOrder.deliveryMethod === 'domicilio' && (
                  <div className="ao-delivery-input-wrapper">
                    <label className="ao-delivery-label">
                      <span>🛵</span> Costo de domicilio (COP)
                    </label>
                    <div className="ao-delivery-input-row">
                      <span className="ao-currency-symbol">$</span>
                      <input
                        type="number"
                        className="input-field ao-cost-input"
                        placeholder="Ej: 10000"
                        value={deliveryInput}
                        onChange={e => setDeliveryInput(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Order total summary */}
                <div className="ao-total-card">
                  <div className="ao-total-row">
                    <span>Subtotal productos</span>
                    <span>{formatCOP(selectedOrder.total)}</span>
                  </div>
                  {selectedOrder.deliveryMethod === 'domicilio' && (
                    <div className="ao-total-row">
                      <span>Costo domicilio</span>
                      <span>
                        {selectedOrder.status === 'pending' && deliveryInput
                          ? formatCOP(Number(deliveryInput))
                          : formatCOP(selectedOrder.deliveryCost || 0)}
                      </span>
                    </div>
                  )}
                  <div className="ao-total-row ao-total-row--final">
                    <span>Total del cliente</span>
                    <span>{formatCOP(selectedOrder.total + (Number(deliveryInput) || selectedOrder.deliveryCost || 0))}</span>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}

        {/* Modal: Confirmación Cancelación */}
        {orderToCancel && (
          <>
            <div className="overlay" onClick={() => setOrderToCancel(null)} />
            <div className="modal-responsive" style={{ maxWidth: '450px' }}>
              <div className="modal-responsive-header">
                <h2 className="modal-responsive-title">⚠️ ¿Cancelar Pedido?</h2>
                <button className="modal-responsive-close" onClick={() => setOrderToCancel(null)}>✕</button>
              </div>
              <div className="modal-responsive-body">
                <p className="modal-desc" style={{ marginBottom: '24px', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  Esta acción no se puede deshacer. El cliente recibirá un aviso de que su pedido #{orderToCancel.orderId} fue cancelado.
                </p>
                <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-soft flex-1" onClick={() => setOrderToCancel(null)}>
                    No, mantener
                  </button>
                  <button className="btn btn-primary bg-danger flex-1" onClick={handleCancelOrder}>
                    Sí, cancelar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal: Confirmación Limpiar Cancelados */}
        {showClearConfirm && (
          <>
            <div className="overlay" onClick={() => setShowClearConfirm(false)} />
            <div className="modal-responsive" style={{ maxWidth: '450px' }}>
              <div className="modal-responsive-header">
                <h2 className="modal-responsive-title">🗑️ ¿Limpiar Cancelados?</h2>
                <button className="modal-responsive-close" onClick={() => setShowClearConfirm(false)}>✕</button>
              </div>
              <div className="modal-responsive-body">
                <p className="modal-desc" style={{ marginBottom: '24px', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  Se eliminarán permanentemente {orders.filter(o => o.status === 'cancelled').length} pedidos cancelados de la base de datos. Esta acción no se puede deshacer.
                </p>
                <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-soft flex-1" onClick={() => setShowClearConfirm(false)}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary bg-danger flex-1" onClick={confirmDeleteCancelled}>
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
      
      {/* Ocultar navegación si el drawer está abierto para evitar solapamientos en iOS */}
      {!selectedOrder && null}
      
      <Toast toasts={toasts} />
    </div>
  );
}
