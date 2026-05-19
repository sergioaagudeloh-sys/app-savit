// src/pages/admin/AdminSubscriptions.jsx
import { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useSwipe } from '../../hooks/useSwipe';
import { formatCOP, checkIsPaidThisMonth } from '../../utils/formatters';
import EmptyState from '../../components/common/EmptyState';
import './AdminSubscriptions.css';

export default function AdminSubscriptions() {
  const { showToast, clearSubscriptionNotifications } = useNotifications();
  const { subscriptions, loading, activeSubscriptions, totalMonthly, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const [showForm, setShowForm] = useState(false);

  const initialForm = {
    name: '',
    amount: '',
    dayOfMonth: new Date().getDate(),
    category: 'Servicios Públicos',
    notes: ''
  };

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleOpenNew = () => {
    setForm(initialForm);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    setSaving(true);
    try {
      await addSubscription(form);
      showToast('Servicio registrado correctamente', 'success');
      handleCancel();
    } catch (err) {
      showToast('Error al guardar el servicio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteSubscription(deletingId);
      showToast('Servicio eliminado', 'success');
    } catch (err) {
      showToast('Error al eliminar', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (sub) => {
    try {
      await updateSubscription(sub.id, { active: !sub.active });
    } catch (err) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleMarkAsPaid = async (sub) => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    try {
      await updateSubscription(sub.id, { lastPaidMonth: currentMonthKey });
      if (clearSubscriptionNotifications) {
        await clearSubscriptionNotifications(sub.id);
      }
      showToast('Pago registrado correctamente', 'success');
    } catch (err) {
      showToast('Error al registrar pago', 'error');
    }
  };

  const getNextPaymentLabel = (sub) => {
    const day = sub.dayOfMonth;
    if (!day) return 'Sin fecha';
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
    
    if (checkIsPaidThisMonth(sub.lastPaidMonth)) {
      return '✅ Pagado';
    }

    if (day === currentDay) return 'Hoy';
    if (day === currentDay + 1) return 'Mañana';
    if (day < currentDay) return `Vencido (hace ${currentDay - day} días)`;
    return `En ${day - currentDay} días`;
  };

  const activeCount = activeSubscriptions.length;

  return (
    <div className="admin-subscriptions-container animate-fade-in">

        {/* Elite Hero */}
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Gestión de Gastos</span>
                <h1 className="inv-hero-title">Pagos Mensuales</h1>
              </div>
            </div>

            <div className="inv-stats">
              <div className="inv-stat highlight">
                <span className="inv-stat-value">{activeCount}</span>
                <span className="inv-stat-label">Activos</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{formatCOP(totalMonthly)}</span>
                <span className="inv-stat-label">Total / Mes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">

          {/* Action Button */}
          <div className="inv-toolbar-base">
            <div style={{ flex: 1 }} />
            <button
              className={`inv-action-btn ${showForm ? 'secondary' : 'primary'} ripple`}
              onClick={showForm ? handleCancel : handleOpenNew}
            >
              <span className="inv-action-icon">{showForm ? '✕' : '＋'}</span>
              <span className="inv-action-text">{showForm ? 'Cancelar' : 'Nueva Suscripción'}</span>
            </button>
          </div>

          {showForm && (
            <div className="premium-card animate-slide-down mb-lg">
              <div className="card-header">
                <div className="card-header-icon">💸</div>
                <div>
                  <h3>Vincular Nuevo Gasto</h3>
                  <p>Configura pagos recurrentes y recordatorios mensuales</p>
                </div>
              </div>

              <form className="p-lg" onSubmit={handleSubmit}>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Nombre del Concepto</label>
                    <input
                      className="input-field"
                      placeholder="Ej: Internet, Alquiler, Software..."
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Categoría</label>
                    <select
                      className="input-field"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                    >
                      <option>Servicios Públicos</option>
                      <option>Alquiler</option>
                      <option>Software / SaaS</option>
                      <option>Mantenimiento</option>
                      <option>Nómina</option>
                      <option>Suscripciones</option>
                      <option>Otros</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Monto Mensual ($)</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="0"
                      value={form.amount}
                      onChange={e => setForm({...form, amount: e.target.value})}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Día Límite (1-31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="input-field"
                      value={form.dayOfMonth}
                      onChange={e => setForm({...form, dayOfMonth: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-footer mt-md">
                  <div className="admin-form-actions">
                    <button type="button" className="btn btn-ghost" onClick={handleCancel}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" /> : 'Confirmar y Guardar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="admin-section-meta mb-md">
            <div>
              <h3 className="admin-section-title">Calendario de Pagos</h3>
              <p className="admin-section-desc">Gestiona tus gastos recurrentes y próximos vencimientos</p>
            </div>
            <div className="admin-count-badge">
              {subscriptions.length} Servicios
            </div>
          </div>

          {loading ? (
            <div className="flex-center p-xl"><span className="spinner spinner-dark" /></div>
          ) : subscriptions.length === 0 ? (
            <EmptyState
              icon="💸"
              title="No hay pagos registrados"
              message="Comienza a gestionar tus gastos recurrentes aquí."
              action={
                <button className="btn btn-primary mt-md" onClick={handleOpenNew}>
                  Registrar el primero
                </button>
              }
            />
          ) : (
            <div className="sub-grid">
              {subscriptions.map((sub, idx) => (
                <SubscriptionCard
                  key={sub.id || idx}
                  sub={sub}
                  delay={idx * 0.05}
                  onToggle={() => toggleActive(sub)}
                  onDelete={() => handleDeleteClick(sub.id)}
                  onMarkPaid={handleMarkAsPaid}
                  label={getNextPaymentLabel(sub)}
                />
              ))}
            </div>
          )}
        </div>

        {deletingId && (
          <>
            <div className="overlay" onClick={() => setDeletingId(null)} />
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-icon warning">⚠️</div>
                <h3 className="modal-title">¿Eliminar servicio?</h3>
                <p className="modal-desc">Esta acción no se puede deshacer y detendrá el recordatorio mensual de este pago recurrente.</p>
                <div className="modal-actions">
                  <button className="btn btn-ghost flex-1" onClick={() => setDeletingId(null)}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary bg-danger flex-1" onClick={executeDelete}>
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

function SubscriptionCard({ sub, delay, onToggle, onDelete, onMarkPaid, label }) {
  const swipeHandlers = useSwipe({
    onSwipeLeft: onDelete,
    threshold: 80
  });

  const today = new Date().getDate();
  const isPaidThisMonth = checkIsPaidThisMonth(sub.lastPaidMonth);

  const daysDiff = (sub.dayOfMonth || 1) - today;
  
  // Si ya está pagado este mes, mostramos la barra al 100% en verde indicando ciclo completado con éxito
  const progressRatio = isPaidThisMonth ? 1 : (sub.dayOfMonth > 0 ? today / sub.dayOfMonth : 0);
  const progressWidth = sub.active ? Math.max(0, Math.min(100, progressRatio * 100)) : 0;

  const progressColor = isPaidThisMonth
    ? 'var(--color-success)'
    : (label === 'Hoy' || daysDiff < 0)
      ? 'var(--color-danger)'
      : label === 'Mañana'
        ? 'var(--color-accent)'
        : 'var(--color-primary)';

  return (
    <div
      className={`sub-card premium-card premium-hover animate-fade-in ${!sub.active ? 'is-paused' : ''}`}
      style={{ animationDelay: `${delay}s` }}
      {...(sub.active ? swipeHandlers : {})}
    >
      <div className="sub-header">
        <div className={`sub-category-badge ${(sub.category || 'Otros').toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-')}`}>
          {sub.category || 'Otros'}
        </div>
        <div className="sub-status-indicator">
          <div className="status-dot" style={{ background: !sub.active ? 'var(--color-stone)' : (isPaidThisMonth ? 'var(--color-success)' : (daysDiff < 0 ? 'var(--color-danger)' : 'var(--color-success)')) }} />
          <span>{!sub.active ? 'Pausado' : (isPaidThisMonth ? 'Al día' : (daysDiff < 0 ? 'Vencido' : 'Activo'))}</span>
        </div>
      </div>

      <div className="sub-content">
        <h4 className="sub-title">{sub.name || 'Sin nombre'}</h4>
        <div className="sub-amount-row">
          <span className="sub-currency">$</span>
          <span className="sub-amount">{(parseFloat(sub.amount) || 0).toLocaleString('es-CO')}</span>
          <span className="sub-period">/ mes</span>
        </div>

        {sub.active && (
          <div className="sub-progress-area">
            <div className="sub-progress-track">
              <div
                className="sub-progress-bar"
                style={{ width: `${progressWidth}%`, background: progressColor }}
              />
            </div>
            <div className="sub-progress-label">
              <span>Ciclo mensual</span>
              <span>{Math.round(progressWidth)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="sub-footer-elite">
        <div className="sub-dates">
          <div className="sub-date-item">
            <span className="sub-date-label">Día Pago</span>
            <span className="sub-date-value">Día {sub.dayOfMonth}</span>
          </div>
          <div className={`sub-date-item highlight ${isPaidThisMonth ? 'success' : (label === 'Hoy' || daysDiff < 0 ? 'danger' : (label === 'Mañana' ? 'warning' : ''))}`}>
            <span className="sub-date-label">Próximo</span>
            <span className="sub-date-value">{label}</span>
          </div>
        </div>

        <div className="sub-actions-elite">
          {!isPaidThisMonth ? (
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.7rem', padding: '4px 12px', borderRadius: '20px' }}
              onClick={(e) => { e.stopPropagation(); onMarkPaid(sub); }}
              title="Marcar como Pagado este mes"
            >
              PAGAR ✓
            </button>
          ) : (
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-success)', marginRight: '8px' }}>
              ✓ AL DÍA
            </span>
          )}

          <button
            className="sub-btn-icon"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            title={sub.active ? 'Pausar Recordatorio' : 'Activar Recordatorio'}
          >
            {sub.active ? '⏸️' : '▶️'}
          </button>
          <button
            className="sub-btn-icon danger"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Eliminar"
          >
            🗑️
          </button>
        </div>
      </div>

      {sub.active && <div className="swipe-feedback">Desliza para eliminar</div>}
    </div>
  );
}
