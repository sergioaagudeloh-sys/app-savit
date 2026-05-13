// src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import StoreStatusBanner from '../components/ui/StoreStatusBanner';
import { useStoreConfig, useOrders } from '../hooks/useOrders';
import { useNotifications } from '../context/NotificationContext';
import { buildWhatsAppMessage, openWhatsApp } from '../utils/whatsapp';
import { formatCOP, generateOrderId } from '../utils/formatters';
import SwipeButton from '../components/ui/SwipeButton';
import PinModal from '../components/ui/PinModal';
import { useAuth } from '../context/AuthContext';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { config } = useStoreConfig();
  const { customer, isIdentified, hasPin } = useCustomer();
  const { addNotification, showToast } = useNotifications();
  const { isAdmin } = useAuth();

  const [deliveryMethod, setDeliveryMethod] = useState('domicilio');
  const [form, setForm] = useState({
    name: customer?.name || '',
    whatsapp: customer?.phone || '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  // PIN security
  const [showPin, setShowPin] = useState(false);
  const [showCreatePin, setShowCreatePin] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Sync form with identified customer data if it changes
    if (isIdentified && customer) {
      setForm(prev => ({
        ...prev,
        name: customer.name || '',
        whatsapp: customer.phone || '',
      }));
    }
  }, [customer, isIdentified]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Ingresa tu nombre para el pedido';
    if (!form.whatsapp.trim()) errs.whatsapp = 'Ingresa tu número de WhatsApp';
    if (deliveryMethod === 'domicilio' && !form.address.trim()) errs.address = 'Ingresa tu dirección de entrega';
    return errs;
  };

  const isFormValid = !!(
    form.name.trim() && 
    form.whatsapp.trim() && 
    (deliveryMethod !== 'domicilio' || form.address.trim())
  );

  // Called after PIN is verified (or skipped if guest)
  const executeSubmit = async () => {
    setShowPin(false);
    setLoading(true);
    const orderId = generateOrderId();

    try {
      await createOrder({
        orderId,
        userId: isIdentified ? customer.phone : 'guest',
        customerName: form.name,
        customerPhone: form.whatsapp,
        items,
        total: totalPrice,
        deliveryMethod,
        address: deliveryMethod === 'domicilio' ? form.address : null,
        notes: form.notes,
        status: 'pending',
      });

      // 📳 Haptic Feedback (Success Click)
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 30, 100]); // Pulse: vibration, pause, vibration
      }

      const message = buildWhatsAppMessage({
        items,
        total: totalPrice,
        deliveryMethod,
        address: form.address,
        customerName: form.name,
        customerPhone: form.whatsapp,
        orderId,
      });

      // Notificar al admin
      await addNotification({
        title: '¡Nuevo Pedido Recibido! 🛍️',
        message: `El cliente ${form.name} ha realizado un pedido #${orderId}.`,
        orderId: orderId,
        type: 'new_order',
        targetRole: 'admin'
      });
      
      clearCart();
      navigate('/order-confirm', { state: { orderId, message } });

      // Delay redirect to allow user to see the confirmation page & animation
      setTimeout(() => openWhatsApp(message, config?.whatsappNumber), 2000);
    } catch (error) {
      console.error('Error creando pedido:', error);
      setLoading(false);
      showToast('Error al crear el pedido. Intenta nuevamente.', 'error');
    }
  };

  // Entry point — validate form then show PIN if needed
  const handleSubmit = async () => {
    if (items.length === 0) return;
    
    // Prevent admin from ordering
    if (isAdmin) {
      showToast('Estás en modo Vista Previa. No puedes realizar pedidos reales.', 'error');
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    // Identified customers must verify (or create) their PIN
    if (isIdentified) {
      setShowPin(true);
    } else {
      executeSubmit();
    }
  };

  if (items.length === 0) {
    return (
      <div className="app-container">
        <main className="page-content page-content--no-nav checkout-empty">
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <div className="empty-state-title">Tu carrito está vacío</div>
            <p className="empty-state-desc">Explora nuestros productos y llena tu vida de salud.</p>
            <button className="btn btn-primary" onClick={() => navigate('/catalog')} style={{ marginTop: 24 }}>
              Ir al Catálogo
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="page-content page-content--no-nav checkout-page">
        <div className="checkout-hero">
           <div className="checkout-hero-content">
             <span className="checkout-hero-label">Resumen de compra</span>
             <h1 className="checkout-hero-title">Finalizar Pedido</h1>
           </div>
        </div>

        {isAdmin && (
          <div className="admin-checkout-notice" style={{
            margin: '0 var(--space-md) var(--space-md)',
            padding: '16px',
            background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
            borderRadius: '16px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontSize: '24px' }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>MODO ADMINISTRADOR</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Puedes simular el carrito, pero el envío de pedidos está desactivado para tu cuenta.
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <section className="checkout-section">
          <h2 className="checkout-section-title">📦 Tu Pedido</h2>
          <div className="checkout-items">
            {items.map(item => (
              <div key={item.id} className="checkout-item">
                <div className="checkout-item-img">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} loading="lazy" />
                    : <span>🌿</span>
                  }
                </div>
                <div className="checkout-item-info">
                  <div className="checkout-item-name">{item.name}</div>
                  {item.selectedAdditions?.length > 0 && (
                    <div className="checkout-item-extras" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px', lineHeight: '1.2' }}>
                      + {item.selectedAdditions.map(a => a.name).join(', ')}
                    </div>
                  )}
                  <div className="checkout-item-qty">x{item.quantity}</div>
                </div>
                <div className="price">{formatCOP(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="checkout-total">
            <span className="text-muted">Total a pagar</span>
            <span className="price price-lg">{formatCOP(totalPrice)}</span>
          </div>
          
          {!config?.isOpen && (
            <div className="checkout-status-notice mt-md">
              <strong>🕒 Horario Comercial:</strong> 
              <p>Tu pedido ha sido recibido y será procesado apenas abramos la tienda. ¡Gracias por tu paciencia! 🌿</p>
            </div>
          )}
        </section>

        {/* Customer Info - Conditionally hidden or summarized */}
        <section className="checkout-section">
          <h2 className="checkout-section-title">📋 Datos del Cliente</h2>
          
          {isIdentified ? (
            <div className="checkout-customer-summary">
              <div className="summary-item">
                <span className="summary-icon">👤</span>
                <div className="summary-content">
                  <span className="summary-label">Nombre:</span>
                  <span className="summary-value">{customer.name}</span>
                </div>
              </div>
              <div className="summary-item">
                <span className="summary-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </span>
                <div className="summary-content">
                  <span className="summary-label">WhatsApp:</span>
                  <span className="summary-value">+57 {customer.phone}</span>
                </div>
              </div>
              <p className="summary-footer">
                Tus datos se agregaron automáticamente. ✨
              </p>
            </div>
          ) : (
            <div className="checkout-form">
              <div className="input-group">
                <label className="input-label" htmlFor="checkout-name">Nombre Completo</label>
                <input
                  id="checkout-name"
                  className={`input-field ${errors.name ? 'input-error' : ''}`}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  autoComplete="name"
                />
                {errors.name && <span className="input-error-msg">{errors.name}</span>}
              </div>

              <div className="input-group" style={{ marginTop: '12px' }}>
                <label className="input-label" htmlFor="checkout-whatsapp">WhatsApp (Celular)</label>
                <div className="phone-input-row" style={{ display: 'flex', gap: '8px' }}>
                  <div className="prefix-box" style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontWeight: 'bold' }}>+57</div>
                  <input
                    id="checkout-whatsapp"
                    className={`input-field ${errors.whatsapp ? 'input-error' : ''}`}
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="300 123 4567"
                    type="tel"
                    autoComplete="tel"
                    style={{ flex: 1 }}
                  />
                </div>
                {errors.whatsapp && <span className="input-error-msg">{errors.whatsapp}</span>}
              </div>
            </div>
          )}
        </section>

        {/* Delivery Method */}
        <section className="checkout-section">
          <h2 className="checkout-section-title">🚚 Entrega</h2>
          <div className="delivery-options">
            <button
              className={`delivery-option ${deliveryMethod === 'domicilio' ? 'active' : ''}`}
              onClick={() => setDeliveryMethod('domicilio')}
            >
              <span className="delivery-icon">🛵</span>
              <div>
                <div className="delivery-name">Domicilio</div>
                <div className="delivery-desc">Entrega en tu dirección</div>
              </div>
              <div className={`delivery-radio ${deliveryMethod === 'domicilio' ? 'checked' : ''}`} />
            </button>
            <button
              className={`delivery-option ${deliveryMethod === 'recogida' ? 'active' : ''}`}
              onClick={() => setDeliveryMethod('recogida')}
            >
              <span className="delivery-icon">🏪</span>
              <div>
                <div className="delivery-name">En Tienda</div>
                <div className="delivery-desc">Tú lo retiras</div>
              </div>
              <div className={`delivery-radio ${deliveryMethod === 'recogida' ? 'checked' : ''}`} />
            </button>
          </div>
        </section>

        {/* Address & Notes */}
        <section className="checkout-section">
          <div className="checkout-form">
            {deliveryMethod === 'domicilio' && (
              <div className="input-group">
                <label className="input-label" htmlFor="checkout-address">📍 Dirección de entrega</label>
                <input
                  id="checkout-address"
                  className={`input-field ${errors.address ? 'input-error' : ''}`}
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Calle 10 # 23-45, Barrio"
                  autoComplete="street-address"
                />
                {errors.address && <span className="input-error-msg">{errors.address}</span>}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="checkout-notes">Notas (opcional)</label>
              <textarea
                id="checkout-notes"
                className="input-field"
                name="notes"
                rows="2"
                value={form.notes}
                onChange={handleChange}
                placeholder="Instrucciones especiales para el pedido..."
                style={{ padding: '12px', resize: 'none' }}
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="checkout-submit">
          {isIdentified ? (
            <>
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 600 }}>
                ⚡ Checkout Express — pedido en un desliz
              </p>
              <SwipeButton
                onConfirm={handleSubmit}
                label={isAdmin ? "Pedidos Desactivados" : !isFormValid ? "Completa tus datos" : "Desliza para Confirmar"}
                disabled={loading || items.length === 0 || !isFormValid || isAdmin}
              />
              <p className="checkout-disclaimer" style={{ marginTop: '10px' }}>
                Te redirigiremos a WhatsApp para finalizar tu pedido
              </p>
            </>
          ) : (
            <>
              <button
                className="btn btn-whatsapp btn-lg"
                onClick={handleSubmit}
                disabled={loading || !isFormValid || isAdmin}
                id="btn-confirm-order"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                    </svg>
                    Confirmar Pedido
                  </>
                )}
              </button>
              <p className="checkout-disclaimer">
                Te redirigiremos a WhatsApp para finalizar tu pedido
              </p>
            </>
          )}
        </div>
      </main>

      {/* PIN modal — shown before order submission */}
      {showPin && (
        <PinModal
          title="Confirma tu identidad para el pedido"
          onVerified={executeSubmit}
          onCancel={() => setShowPin(false)}
        />
      )}
    </div>
  );
}
