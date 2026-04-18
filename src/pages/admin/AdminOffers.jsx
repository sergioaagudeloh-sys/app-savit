// src/pages/admin/AdminOffers.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useStoreConfig } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useNotifications } from '../../context/NotificationContext';
import ProductPicker from '../../components/ui/ProductPicker';
import './AdminOffers.css';

const DEFAULT_PROMO = {
  active: true,
  title: '',
  description: '',
  imageUrl: '',
  productId: '',
  promoPrice: ''
};

export default function AdminOffers() {
  const { config, updateConfig, loading } = useStoreConfig();
  const { products } = useProducts();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [promos, setPromos]                 = useState([]);
  const [editingIndex, setEditingIndex]     = useState(null);
  const [form, setForm]                     = useState(DEFAULT_PROMO);
  const [saving, setSaving]                 = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingIndex, setDeletingIndex]   = useState(null);
  const [showForm, setShowForm]             = useState(false);

  useEffect(() => {
    if (config?.promos) {
      setPromos(config.promos || []);
    } else if (config?.promo) {
      setPromos([config.promo]);
    }
  }, [config]);

  if (loading && !config) return (
    <div className="app-container admin-offers admin-page">
      <Header title="Anuncios" />
      <AdminSidebar />
      <div className="flex-center w-full" style={{ height: '70vh' }}>
        <span className="spinner spinner-dark" />
      </div>
    </div>
  );

  const handleEdit = (index) => {
    setEditingIndex(index);
    setForm(promos[index]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNew = () => {
    setEditingIndex(null);
    setForm(DEFAULT_PROMO);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemove = (index) => {
    setDeletingIndex(index);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deletingIndex === null) return;
    const newPromos = promos.filter((_, i) => i !== deletingIndex);
    setSaving(true);
    setShowDeleteModal(false);
    try {
      await updateConfig({ promos: newPromos, promo: newPromos[0] || null });
      setPromos(newPromos);
      if (editingIndex === deletingIndex) {
        setEditingIndex(null);
        setForm(DEFAULT_PROMO);
      }
      showToast('Anuncio eliminado con éxito', 'success');
    } catch {
      showToast('Error al eliminar el anuncio', 'error');
    } finally {
      setSaving(false);
      setDeletingIndex(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        setForm(prev => ({
          ...prev,
          productId: product.id,
          title: `¡Super Oferta: ${product.name}!`,
          imageUrl: product.imageUrl || '',
          promoPrice: product.price || '',
          description: product.description || prev.description
        }));
      } else {
        setForm(prev => ({ ...prev, productId: '' }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newPromos = [...promos];
    if (editingIndex !== null) {
      newPromos[editingIndex] = form;
    } else {
      if (newPromos.length >= 5) {
        showToast('Solo puedes tener hasta 5 anuncios', 'error');
        return;
      }
      newPromos.push(form);
    }
    setSaving(true);
    try {
      await updateConfig({ promos: newPromos, promo: newPromos[0] || null });
      setPromos(newPromos);
      setEditingIndex(null);
      setForm(DEFAULT_PROMO);
      setShowForm(false);
      showToast('Anuncios actualizados con éxito', 'success');
    } catch {
      showToast('Error al guardar los anuncios', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isAtLimit = editingIndex === null && promos.length >= 5;

  return (
    <div className="app-container admin-offers admin-page">
      <Header />
      <AdminSidebar />

      <main className="page-content admin-main-content">

        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Gestión de Promociones</span>
                <h1 className="inv-hero-title">Anuncios</h1>
              </div>
            </div>

            <div className="inv-stats">
              <div className="inv-stat highlight">
                <span className="inv-stat-value">{promos.filter(p => p.active !== false).length}</span>
                <span className="inv-stat-label">En Vivo</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{promos.length}/5</span>
                <span className="inv-stat-label">Slots Uso</span>
              </div>
              <div className="inv-stat secondary" onClick={() => navigate('/admin/products')}>
                <span className="inv-stat-value">📦</span>
                <span className="inv-stat-label">Productos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">

          {/* Unified Tooling */}
          <div className="inv-toolbar-base">
            <div style={{ flex: 1 }} />
            <button 
              className={`inv-action-btn ${showForm ? 'secondary' : 'primary'} ripple`}
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                  setEditingIndex(null);
                  setForm(DEFAULT_PROMO);
                } else {
                  handleAddNew();
                }
              }}
            >
              <span className="inv-action-icon">{showForm ? '✕' : '＋'}</span>
              <span className="inv-action-text">{showForm ? 'Cancelar' : 'Nuevo Anuncio'}</span>
            </button>
          </div>

          {/* ── Formulario ── */}
          {showForm && (
            <div className="admin-config-card animate-slide-down premium-card mb-lg">
              <div className="card-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <form onSubmit={handleSubmit}>
                <h3 className="section-title mb-md">
                  {editingIndex !== null ? `✏️ Editando Anuncio #${editingIndex + 1}` : '➕ Crear Nuevo Anuncio'}
                </h3>

                <div className="input-group">
                  <label className="input-label">Vincular Producto (Opcional)</label>
                  <ProductPicker
                    products={products}
                    selectedProductId={form.productId}
                    onSelect={(id) => handleChange({ target: { name: 'productId', value: id } })}
                    disabled={isAtLimit}
                  />
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Título del Anuncio</label>
                    <input
                      className="input-field"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Ej: ¡Nuevo Combo Fit disponible!"
                      required
                      disabled={isAtLimit}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Precio Especial (Opcional)</label>
                    <input
                      className="input-field"
                      name="promoPrice"
                      type="number"
                      value={form.promoPrice}
                      onChange={handleChange}
                      placeholder="Ej: 25000"
                      disabled={isAtLimit}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Descripción</label>
                  <textarea
                    className="input-field"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Detalla lo que ofreces..."
                    rows="3"
                    required
                    disabled={isAtLimit}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">URL de la Imagen</label>
                  <input
                    className="input-field"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                    required
                  />
                  {form.imageUrl && (
                    <div style={{ marginTop: '12px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '140px', border: '1px solid var(--color-border)' }}>
                      <img src={form.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="admin-form-footer mt-lg">
                  <div className="toggle-group-inline">
                    <div className="toggle-wrapper" onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
                      <div className={`toggle ${form.active ? 'active' : ''}`} />
                      <span className="text-xs text-bold">{form.active ? 'ACTIVO' : 'PAUSADO'}</span>
                    </div>
                  </div>
                  <div className="admin-form-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingIndex(null); }}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" /> : (editingIndex !== null ? 'Guardar Cambios' : 'Añadir Anuncio')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ── Lista de Anuncios ── */}
          <div className="admin-config-header">
            <h3 className="section-title">Anuncios Actuales ({promos.length}/5)</h3>
            <p className="text-xs text-muted">Los clientes verán estos anuncios en un carrusel al inicio.</p>
          </div>

          <div className="promos-list-container">
            {promos.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No hay anuncios configurados aún.</p>
              </div>
            ) : (
              promos.map((promo, idx) => (
                <div
                  key={idx}
                  className={`promo-admin-card ${editingIndex === idx ? 'is-editing' : ''} ${!promo.active ? 'is-paused' : ''}`}
                >
                  <div className="promo-admin-header">
                    <h4 className="promo-admin-title">{promo.title}</h4>
                    <span className={`promo-admin-status ${promo.active ? 'active' : 'inactive'}`}>
                      {promo.active ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                  <div className="promo-admin-body">
                    {promo.imageUrl && (
                      <img src={promo.imageUrl} alt={promo.title} className="promo-admin-thumb" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="promo-admin-desc">{promo.description || 'Sin descripción'}</p>
                      {promo.promoPrice && (
                        <div className="mt-xs">
                          <span className="badge badge-accent">OFERTA: ${promo.promoPrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="promo-admin-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(idx)}>
                      ✏️ Editar
                    </button>
                    <button className="btn btn-ghost btn-sm text-error" onClick={() => handleRemove(idx)}>
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </main>

      {/* ── Modal: Confirmar Eliminación ── */}
      {showDeleteModal && (
        <>
          <div className="overlay" onClick={() => setShowDeleteModal(false)} />
          <div className="modal-responsive" style={{ maxWidth: '450px' }}>
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">🗑️ ¿Eliminar Anuncio?</h2>
              <button className="modal-responsive-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-responsive-body">
              <p className="modal-desc" style={{ marginBottom: '24px', fontSize: '1.05rem', lineHeight: '1.5' }}>
                Esta acción no se puede deshacer y el anuncio desaparecerá del inicio de la tienda.
              </p>
              <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-soft flex-1" onClick={() => setShowDeleteModal(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary bg-danger flex-1" onClick={confirmDelete}>
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
