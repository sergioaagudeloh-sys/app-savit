// src/pages/admin/AdminAwards.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useAwards } from '../../hooks/useAwards';
import { useNotifications } from '../../context/NotificationContext';
import { useStoreConfig } from '../../hooks/useOrders';
import './AdminAwards.css';

const DEFAULT_AWARD = { name: '', description: '', pointsCost: 0, isActive: true };

export default function AdminAwards() {
  const { awards, loading } = useAwards();
  const { showToast } = useNotifications();
  const { config, updateConfig } = useStoreConfig();
  const navigate = useNavigate();

  const [showForm, setShowForm]       = useState(false);
  const [showRules, setShowRules]       = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(DEFAULT_AWARD);
  const [saving, setSaving]           = useState(false);

  // Points Config State (local copy for the form)
  const [pointsForm, setPointsForm] = useState({
    pointsPer1000: config?.pointsConfig?.pointsPer1000 || 10,
    enabled: config?.pointsConfig?.enabled !== false
  });

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'rules') {
      setShowRules(true);
      setShowForm(false);
    }
  }, [location]);

  useEffect(() => {
    if (config?.pointsConfig) {
      setPointsForm({
        pointsPer1000: config.pointsConfig.pointsPer1000,
        enabled: config.pointsConfig.enabled
      });
    }
  }, [config]);

  /* ── Handlers ── */
  const handleOpenNew = () => {
    setForm(DEFAULT_AWARD);
    setEditingId(null);
    setShowForm(true);
    setShowRules(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleRules = () => {
    setShowRules(!showRules);
    setShowForm(false);
    if (!showRules) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePointsConfig = async () => {
    try {
      await updateConfig({
        pointsConfig: pointsForm
      });
      showToast('Configuración de puntos guardada', 'success');
      setShowRules(false);
    } catch (e) {
      showToast('Error al guardar configuración', 'error');
    }
  };

  const handleEdit = (award) => {
    setForm(award);
    setEditingId(award.id);
    setShowForm(true);
    setShowRules(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_AWARD);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { id, ...data } = form;
        await updateDoc(doc(db, 'awards', editingId), data);
        showToast('Premio actualizado', 'success');
      } else {
        await addDoc(collection(db, 'awards'), form);
        showToast('Premio creado con éxito', 'success');
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving award:', error);
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este premio?')) return;
    try {
      await deleteDoc(doc(db, 'awards', id));
      showToast('Premio eliminado', 'success');
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const activeCount = awards.filter(a => a.isActive !== false).length;

  return (
    <div className="app-container admin-awards admin-page">
      <Header />
      <AdminSidebar />

      <main className="page-content admin-main-content">

        {/* ── Hero ── */}
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Fidelización de Clientes</span>
                <h1 className="inv-hero-title">Puntos & Premios</h1>
              </div>
            </div>

            <div className="inv-stats">
              <div className={`inv-stat ${!showRules ? 'highlight' : ''}`} onClick={() => { setShowRules(false); setShowForm(false); }}>
                <span className="inv-stat-value">{activeCount}</span>
                <span className="inv-stat-label">Premios</span>
              </div>
              <div className={`inv-stat ${showRules ? 'highlight' : ''}`} onClick={() => setShowRules(true)}>
                <span className="inv-stat-value">⚙️</span>
                <span className="inv-stat-label">Reglas</span>
              </div>
              <div className="inv-stat secondary" onClick={() => navigate('/admin/products')}>
                <span className="inv-stat-value">📦</span>
                <span className="inv-stat-label">Inventario</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">

          <div className="inv-toolbar-base centered-toolbar">
            <button 
              className={`inv-action-btn ${showForm ? 'secondary' : 'primary'} ripple`}
              onClick={showForm ? handleCancel : handleOpenNew}
            >
              <span className="inv-action-icon">{showForm ? '✕' : '＋'}</span>
              <span className="inv-action-text">{showForm ? 'Cancelar' : 'Nuevo Premio'}</span>
            </button>
          </div>

          {/* ── Configuración de Reglas de Puntos ── */}
          {showRules && (
            <div className="premium-card animate-slide-down mb-lg">
              <div className="card-header">
                <div className="card-header-icon">⚙️</div>
                <div>
                  <h3>Sistema de Acumulación</h3>
                  <p>Configura cuántos puntos ganan los clientes por sus compras</p>
                </div>
              </div>
              <div className="p-lg">
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Puntos por cada $1.000 COP</label>
                    <input
                      type="number"
                      className="input-field"
                      value={pointsForm.pointsPer1000}
                      onChange={(e) => setPointsForm({ ...pointsForm, pointsPer1000: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted">Ej: 10 significa que por $100.000 ganan 1.000 puntos.</p>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Estado del Programa</label>
                    <div className="toggle-wrapper mt-xs" onClick={() => setPointsForm(p => ({ ...p, enabled: !p.enabled }))}>
                      <div className={`toggle ${pointsForm.enabled ? 'active' : ''}`} />
                      <span className="text-xs text-bold ml-sm">{pointsForm.enabled ? 'ACTIVADO' : 'DESACTIVADO'}</span>
                    </div>
                  </div>
                </div>
                <div className="admin-form-footer mt-lg">
                  <button className="btn btn-primary ml-auto" onClick={handleSavePointsConfig}>
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Formulario ── */}
          {showForm && (
            <div className="premium-card animate-slide-down mb-lg">
              <div className="card-header">
                <div className="card-header-icon">
                  {editingId ? '✏️' : '🏆'}
                </div>
                <div>
                  <h3>{editingId ? 'Editar Premio' : 'Crear Nuevo Premio'}</h3>
                  <p>Define las condiciones y el costo en puntos</p>
                </div>
              </div>

              <form className="p-lg" onSubmit={handleSave}>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Nombre del Premio / Bono</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="Ej: Jugo Gratis o $5.000 Descuento"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Costo en Puntos</label>
                    <input
                      className="input-field"
                      type="number"
                      min="1"
                      placeholder="Ej: 500"
                      value={form.pointsCost}
                      onChange={(e) => setForm({ ...form, pointsCost: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Descripción</label>
                  <textarea
                    className="input-field"
                    placeholder="Ej: Solo válido para jugos de temporada de lunes a viernes."
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-form-footer mt-lg">
                  <div className="toggle-group-inline">
                    <div className="toggle-wrapper" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                      <div className={`toggle ${form.isActive ? 'active' : ''}`} />
                      <span className="text-xs text-bold">{form.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                  </div>
                  <div className="admin-form-actions">
                    <button type="button" className="btn btn-ghost" onClick={handleCancel}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" /> : (editingId ? 'Guardar Cambios' : 'Crear Premio')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ── Lista de Premios ── */}
          <div className="admin-section-meta mb-md">
            <div>
              <h3 className="admin-section-title">Catálogo de Recompensas</h3>
              <p className="admin-section-desc">Gestiona los premios y bonos que tus clientes pueden canjear</p>
            </div>
            <div className="admin-count-badge">
              {awards.length} Ítems
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ height: '30vh' }}>
              <span className="spinner spinner-dark" />
            </div>
          ) : awards.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">🏆</div>
              <h3>No hay premios configurados</h3>
              <p>Crea el primer premio para motivar a tus clientes.</p>
              <button className="btn btn-primary mt-md" onClick={handleOpenNew}>
                Crear primer premio
              </button>
            </div>
          ) : (
            <div className="awards-grid">
              {awards.map(award => (
                <div
                  key={award.id}
                  className={`award-card ${editingId === award.id ? 'is-editing' : ''} ${award.isActive === false ? 'is-paused' : ''}`}
                >
                  <div className="award-info">
                    <div className="award-card-header">
                      <h3>{award.name}</h3>
                      <span className={`award-status-label ${award.isActive !== false ? 'active' : 'inactive'}`}>
                        {award.isActive !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p>{award.description}</p>
                    <div className="award-points-badge">
                      <span style={{ fontSize: '1.2rem' }}>🪙</span>
                      <span>{award.pointsCost.toLocaleString()} Puntos</span>
                    </div>
                  </div>
                  <div className="award-actions">
                    <button className="btn btn-soft btn-sm" onClick={() => handleEdit(award)}>
                      ✏️ Editar
                    </button>
                    <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(award.id)}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
