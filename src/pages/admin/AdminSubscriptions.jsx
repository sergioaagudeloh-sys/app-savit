// src/pages/admin/AdminSubscriptions.jsx
import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { db, isFirebaseConfigured } from '../../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';
import { useSwipe } from '../../hooks/useSwipe';
import './AdminSubscriptions.css';

export default function AdminSubscriptions() {
  const { showToast } = useNotifications();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    amount: '',
    dayOfMonth: new Date().getDate(),
    category: 'Servicios Públicos',
    notes: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const saved = JSON.parse(localStorage.getItem('savit_subscriptions') || '[]');
      setSubscriptions(saved);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'subscriptions'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubscriptions(docs.sort((a, b) => a.dayOfMonth - b.dayOfMonth));
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    setSaving(true);
    
    const data = {
      ...form,
      amount: parseFloat(form.amount),
      dayOfMonth: parseInt(form.dayOfMonth),
      createdAt: serverTimestamp(),
      active: true,
      lastNotifiedMonth: '' 
    };

    try {
      if (isFirebaseConfigured()) {
        await addDoc(collection(db, 'subscriptions'), data);
      } else {
        const updated = [...subscriptions, { ...data, id: Date.now().toString() }];
        localStorage.setItem('savit_subscriptions', JSON.stringify(updated));
        setSubscriptions(updated);
      }
      
      showToast('Servicio registrado correctamente', 'success', 'Suscripciones');
      setForm({ name: '', amount: '', dayOfMonth: new Date().getDate(), category: 'Servicios Públicos', notes: '' });
      setShowForm(false);
    } catch (err) {
      showToast('Error al guardar el servicio', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este pago recurrente?')) return;
    
    try {
      if (isFirebaseConfigured()) {
        await deleteDoc(doc(db, 'subscriptions', id));
      } else {
        const updated = subscriptions.filter(s => s.id !== id);
        localStorage.setItem('savit_subscriptions', JSON.stringify(updated));
        setSubscriptions(updated);
      }
      showToast('Servicio eliminado', 'info');
    } catch (err) {
      showToast('Error al eliminar', 'danger');
    }
  };

  const toggleActive = async (sub) => {
    try {
      if (isFirebaseConfigured()) {
        await updateDoc(doc(db, 'subscriptions', sub.id), { active: !sub.active });
      } else {
        const updated = subscriptions.map(s => s.id === sub.id ? { ...s, active: !s.active } : s);
        localStorage.setItem('savit_subscriptions', JSON.stringify(updated));
        setSubscriptions(updated);
      }
    } catch (err) {
      showToast('Error al actualizar estado', 'danger');
    }
  };

  const getNextPaymentLabel = (day) => {
    const today = new Date();
    const currentDay = today.getDate();
    if (day === currentDay) return 'Hoy';
    if (day === currentDay + 1) return 'Mañana';
    if (day < currentDay) return 'Próximo mes';
    return `En ${day - currentDay} días`;
  };

  return (
    <div className="app-container admin-subscriptions admin-page">
      <Header title="Gastos Fijos" />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Pagos Mensuales</span>
                <h1 className="inv-hero-title">Recurrentes</h1>
              </div>

              <div className="inv-hero-actions">
                <button 
                  className={`inv-action-btn ${showForm ? 'secondary' : 'primary'} animate-pulse`} 
                  onClick={() => setShowForm(!showForm)}
                >
                  <span className="inv-action-icon">{showForm ? '✕' : '+'}</span>
                  {showForm ? 'Cancelar' : 'Agregar Servicio'}
                </button>
              </div>
            </div>
            
            <div className="inv-stats">
              <div className="inv-stat highlight">
                <span className="inv-stat-value">
                  {subscriptions.filter(s => s.active).length}
                </span>
                <span className="inv-stat-label">Activos</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">
                  ${subscriptions.reduce((acc, s) => s.active ? acc + s.amount : acc, 0).toLocaleString()}
                </span>
                <span className="inv-stat-label">Presupuesto Mes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">

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
                      placeholder="0.00"
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
                   <div className="admin-form-actions" style={{ marginLeft: 'auto' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" /> : 'Confirmar y Guardar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
            <div className="flex-between mb-sm align-center">
              <h3 className="section-title">Calendario de Pagos</h3>
              <span className="text-muted text-xs uppercase font-bold letter-spacing-1">Próximos Vencimientos</span>
            </div>
            
            {loading ? (
              <div className="flex-center p-xl"><span className="spinner spinner-dark" /></div>
            ) : subscriptions.length === 0 ? (
              <div className="empty-state animate-fade-in">
                <div className="empty-icon">💸</div>
                <p>No tienes gastos recurrentes registrados.</p>
                <button className="btn btn-link" onClick={() => setShowForm(true)}>Empezar a gestionar</button>
              </div>
            ) : (
              <div className="sub-grid">
                {subscriptions.map((sub, idx) => (
                  <SubscriptionCard 
                    key={sub.id} 
                    sub={sub} 
                    delay={idx * 0.05}
                    onToggle={() => toggleActive(sub)}
                    onDelete={() => handleDelete(sub.id)}
                    label={getNextPaymentLabel(sub.dayOfMonth)}
                  />
                ))}
              </div>
            )}
          </div>
      </main>
    </div>
  );
}

function SubscriptionCard({ sub, delay, onToggle, onDelete, label }) {
  const swipeHandlers = useSwipe({
    onSwipeLeft: onDelete,
    threshold: 80
  });

  const today = new Date().getDate();
  const daysDiff = sub.dayOfMonth - today;
  const progressWidth = sub.active ? Math.max(0, Math.min(100, (today / sub.dayOfMonth) * 100)) : 0;
  
  // Color del progreso
  const progressColor = label === 'Hoy' || daysDiff < 0 
    ? 'var(--color-danger)' 
    : label === 'Mañana' 
      ? 'var(--color-accent)' 
      : 'var(--color-primary)';

  return (
    <div 
      className={`sub-card premium-hover animate-fade-in ${!sub.active ? 'inactive' : ''}`}
      style={{ animationDelay: `${delay}s` }}
      {...swipeHandlers}
    >
      <div className="sub-header">
        <div className={`sub-badge ${sub.category.toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-')}`}>
          {sub.category}
        </div>
        <div className="sub-status">
          <div className="sub-dot" style={{ background: sub.active ? (daysDiff < 0 ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-stone)' }} />
          <span>{sub.active ? (daysDiff < 0 ? 'Vencido 🛑' : 'Recordatorio Activo') : 'Pausado'}</span>
        </div>
      </div>
      
      <div className="sub-body">
        <h4 className="sub-name">{sub.name}</h4>
        <div className="sub-price-row">
          <span className="sub-currency">$</span>
          <span className="sub-price">{sub.amount.toLocaleString()}</span>
          <span className="sub-period">/ mes</span>
        </div>
        
        {sub.active && (
          <div className="sub-progress-container">
            <div className="sub-progress-bar">
              <div 
                className="sub-progress-fill" 
                style={{ width: `${progressWidth}%`, background: progressColor }}
              />
            </div>
            <div className="sub-progress-text">
              Progreso del mes: {Math.round(progressWidth)}%
            </div>
          </div>
        )}
      </div>

      <div className="sub-footer">
        <div className="sub-info">
          <div className="sub-info-item">
            <span className="sub-info-label">Fecha Límite</span>
            <span className="sub-info-value">Día {sub.dayOfMonth}</span>
          </div>
          <div className={`sub-info-item highlight ${label === 'Hoy' || daysDiff < 0 ? 'danger' : label === 'Mañana' ? 'warning' : ''}`}>
            <span className="sub-info-label">Estado</span>
            <span className="sub-info-value">{label}</span>
          </div>
        </div>
        
        <div className="sub-actions">
          <button 
            className="sub-action-btn" 
            onClick={onToggle}
            title={sub.active ? 'Desactivar' : 'Activar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
          </button>
          <button className="sub-action-btn delete" onClick={onDelete}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      
      <div className="swipe-hint">Desliza para eliminar</div>
    </div>
  );
}
