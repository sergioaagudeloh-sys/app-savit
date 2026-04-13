// src/pages/admin/AdminSubscriptions.jsx
import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BottomNav from '../../components/layout/BottomNav';
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
// Import useSwipe if it's used, but I'll make it safe
import { useSwipe } from '../../hooks/useSwipe';
import './AdminSubscriptions.css';

export default function AdminSubscriptions() {
  const { showToast } = useNotifications();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleOpenNew = () => {
    setForm(initialForm);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  useEffect(() => {
    let unsub = () => {};

    try {
      if (!isFirebaseConfigured()) {
        const savedRaw = localStorage.getItem('savit_subscriptions');
        const saved = savedRaw ? JSON.parse(savedRaw) : [];
        setSubscriptions(Array.isArray(saved) ? saved : []);
        setLoading(false);
      } else {
        const q = query(collection(db, 'subscriptions'));
        unsub = onSnapshot(q, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSubscriptions(docs.sort((a, b) => (a.dayOfMonth || 0) - (b.dayOfMonth || 0)));
          setLoading(false);
        }, (err) => {
          console.error("Firestore Error:", err);
          showToast('Error al conectar con la base de datos', 'error');
          setLoading(false);
        });
      }
    } catch (error) {
      console.error("Init Error:", error);
      setSubscriptions([]);
      setLoading(false);
    }

    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    setSaving(true);
    
    const data = {
      ...form,
      amount: parseFloat(form.amount) || 0,
      dayOfMonth: parseInt(form.dayOfMonth) || 1,
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
      
      showToast('Servicio registrado correctamente', 'success');
      handleCancel();
    } catch (err) {
      showToast('Error al guardar el servicio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este pago recurrente?')) return;
    
    try {
      if (isFirebaseConfigured()) {
        await deleteDoc(doc(db, 'subscriptions', id));
      } else {
        const updated = subscriptions.filter(s => s.id !== id);
        localStorage.setItem('savit_subscriptions', JSON.stringify(updated));
        setSubscriptions(updated);
      }
      showToast('Servicio eliminado', 'success');
    } catch (err) {
      showToast('Error al eliminar', 'error');
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
      showToast('Error al actualizar estado', 'error');
    }
  };

  const getNextPaymentLabel = (day) => {
    if (!day) return 'Sin fecha';
    const today = new Date();
    const currentDay = today.getDate();
    if (day === currentDay) return 'Hoy';
    if (day === currentDay + 1) return 'Mañana';
    if (day < currentDay) return 'Próximo mes';
    return `En ${day - currentDay} días`;
  };

  // Stats calculate
  const activeCount = subscriptions.filter(s => s.active).length;
  const totalMonthly = subscriptions.reduce((acc, s) => s.active ? acc + (parseFloat(s.amount) || 0) : acc, 0);

  return (
    <div className="app-container admin-subscriptions admin-page">
      <Header />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        
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
                <span className="inv-stat-value">
                  ${totalMonthly.toLocaleString('es-CO')}
                </span>
                <span className="inv-stat-label">Total / Mes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">
          
          {/* Centered Action Button */}
          <div className="inv-toolbar-base centered-toolbar">
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
                   <div className="admin-form-actions" style={{ marginLeft: 'auto' }}>
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
            <div className="empty-state-card animate-fade-in">
              <div className="empty-state-icon">💸</div>
              <h3>No hay pagos registrados</h3>
              <p>Comienza a gestionar tus gastos recurrentes aquí.</p>
              <button className="btn btn-primary mt-md" onClick={handleOpenNew}>Registrar el primero</button>
            </div>
          ) : (
            <div className="sub-grid">
              {subscriptions.map((sub, idx) => (
                <SubscriptionCard 
                  key={sub.id || idx} 
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
      <BottomNav />
    </div>
  );
}

function SubscriptionCard({ sub, delay, onToggle, onDelete, label }) {
  // Safe use of useSwipe
  const swipeHandlers = useSwipe({
    onSwipeLeft: onDelete,
    threshold: 80
  });

  const today = new Date().getDate();
  const daysDiff = (sub.dayOfMonth || 1) - today;
  // Safe progress calculation
  const progressRatio = sub.dayOfMonth > 0 ? today / sub.dayOfMonth : 0;
  const progressWidth = sub.active ? Math.max(0, Math.min(100, progressRatio * 100)) : 0;
  
  const progressColor = label === 'Hoy' || daysDiff < 0 
    ? 'var(--color-danger)' 
    : label === 'Mañana' 
      ? 'var(--color-accent)' 
      : 'var(--color-primary)';

  const formatAmount = (val) => {
    try {
      return (parseFloat(val) || 0).toLocaleString('es-CO');
    } catch {
      return '0';
    }
  };

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
          <div className="status-dot" style={{ background: sub.active ? (daysDiff < 0 ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--color-stone)' }} />
          <span>{sub.active ? (daysDiff < 0 ? 'Vencido' : 'Activo') : 'Pausado'}</span>
        </div>
      </div>
      
      <div className="sub-content">
        <h4 className="sub-title">{sub.name || 'Sin nombre'}</h4>
        <div className="sub-amount-row">
          <span className="sub-currency">$</span>
          <span className="sub-amount">{formatAmount(sub.amount)}</span>
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
          <div className={`sub-date-item highlight ${label === 'Hoy' || daysDiff < 0 ? 'danger' : label === 'Mañana' ? 'warning' : ''}`}>
            <span className="sub-date-label">Próximo</span>
            <span className="sub-date-value">{label}</span>
          </div>
        </div>
        
        <div className="sub-actions-elite">
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
