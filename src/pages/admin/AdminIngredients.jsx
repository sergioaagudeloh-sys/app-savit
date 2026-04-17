// src/pages/admin/AdminIngredients.jsx
import React, { useState } from 'react';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useIngredients } from '../../hooks/useIngredients';
import { formatCOP } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/layout/Toast';
import './AdminIngredients.css';

export default function AdminIngredients() {
  const { ingredients, loading, error, addIngredient, updateIngredient, toggleIngredient, deleteIngredient } = useIngredients();
  const { toasts, showToast } = useToast();

  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [showConfirm, setShowConfirm]   = useState(null);
  const [form, setForm]                 = useState({ name: '', price: '' });

  const handleOpenNew = () => {
    setForm({ name: '', price: '' });
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (ing) => {
    setForm({ name: ing.name, price: ing.price });
    setEditingId(ing.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', price: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = { name: form.name.trim(), price: Number(form.price) };
      if (editingId) {
        await updateIngredient(editingId, data);
        showToast('Ingrediente actualizado', 'success');
      } else {
        await addIngredient(data);
        showToast('Ingrediente creado', 'success');
      }
      handleCancel();
    } catch (err) {
      showToast(err.message || 'Error al guardar el ingrediente', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!showConfirm) return;
    try {
      await deleteIngredient(showConfirm);
      showToast('Ingrediente eliminado', 'success');
      setShowConfirm(null);
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  };

  const activeCount = ingredients.filter(i => i.active).length;

  return (
    <div className="app-container admin-ingredients admin-page">
      <Header />
      <AdminSidebar />

      <main className="page-content admin-main-content">

        {/* ── Hero ── */}
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Gestión de Insumos</span>
                <h1 className="inv-hero-title">Ingredientes Extra</h1>
              </div>
            </div>

            <div className="inv-stats">
              <div className="inv-stat highlight">
                <span className="inv-stat-value">{activeCount}</span>
                <span className="inv-stat-label">Activos</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{ingredients.length}</span>
                <span className="inv-stat-label">Total</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">
          {/* Unified Tooling */}
          <div className="inv-toolbar-base centered-toolbar">
            <button
              className={`inv-action-btn ${showForm ? 'secondary' : 'primary'} ripple`}
              onClick={showForm ? handleCancel : handleOpenNew}
            >
              <span className="inv-action-icon">{showForm ? '✕' : '＋'}</span>
              <span className="inv-action-text">{showForm ? 'Cancelar' : 'Nuevo Insumo'}</span>
            </button>
          </div>

          {error && <p className="text-error">{error}</p>}

          {/* ── Formulario ── */}
          {showForm && (
            <div className="premium-card animate-slide-down mb-lg">
              <div className="card-header">
                <div className="card-header-icon">
                  {editingId ? '✏️' : '➕'}
                </div>
                <div>
                  <h3>{editingId ? 'Editar Ingrediente' : 'Crear Nuevo Ingrediente'}</h3>
                  <p>Define el nombre y el costo adicional para el cliente</p>
                </div>
              </div>

              <form className="p-lg" onSubmit={handleSave}>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Nombre del Ingrediente</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="Ej: Adición de Queso"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Costo Extra (COP)</label>
                    <input
                      className="input-field"
                      type="number"
                      min="0"
                      placeholder="Ej: 2000"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-footer mt-md">
                  <div className="admin-form-actions" style={{ marginLeft: 'auto' }}>
                    <button type="button" className="btn btn-ghost" onClick={handleCancel}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">
                      {editingId ? 'Actualizar Ingrediente' : 'Crear Ingrediente'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex-center" style={{ height: '40vh' }}>
              <span className="spinner spinner-dark" />
            </div>
          ) : ingredients.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">🧄</div>
              <h3>No hay ingredientes registrados</h3>
              <p>Comienza añadiendo adiciones como "Queso", "Salsa Extra", etc.</p>
              <button className="btn btn-primary mt-md" onClick={handleOpenNew}>
                Crear primer ingrediente
              </button>
            </div>
          ) : (
            <div className="ingredients-grid">
              {ingredients.map((ing) => (
                <div key={ing.id} className={`ingredient-card ${!ing.active ? 'inactive' : ''}`}>
                  <div className="ingredient-info">
                    <h3>{ing.name}</h3>
                    <div className="ingredient-price">{formatCOP(ing.price)}</div>
                    <span className={`ingredient-status-badge ${ing.active ? 'active' : 'inactive'}`}>
                      {ing.active ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>

                  <div className="ingredient-actions">
                    <button
                      className="btn-icon"
                      onClick={() => toggleIngredient(ing.id, !ing.active)}
                      title={ing.active ? 'Desactivar' : 'Activar'}
                      style={{ color: ing.active ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                      </svg>
                    </button>
                    <button className="btn-icon" onClick={() => openEdit(ing)} title="Editar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => setShowConfirm(ing.id)}
                      title="Eliminar"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Modal: Confirmar Eliminación ── */}
        {showConfirm && (
          <>
            <div className="overlay" onClick={() => setShowConfirm(null)} />
            <div className="modal-responsive" style={{ maxWidth: '450px' }}>
              <div className="modal-responsive-header">
                <h2 className="modal-responsive-title">🗑️ ¿Eliminar Ingrediente?</h2>
                <button className="modal-responsive-close" onClick={() => setShowConfirm(null)}>✕</button>
              </div>
              <div className="modal-responsive-body">
                <p className="modal-desc" style={{ marginBottom: '24px', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  Esta acción no se puede deshacer. Los productos que usen este ingrediente dejarán de mostrarlo como opción.
                </p>
                <div className="modal-actions" style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-soft flex-1" onClick={() => setShowConfirm(null)}>
                    Cancelar
                  </button>
                  <button className="inv-action-btn danger flex-1" onClick={confirmDelete}>
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </main>


      <Toast toasts={toasts} />
    </div>
  );
}
