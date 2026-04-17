// src/pages/admin/AdminProducts.jsx
import { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import SearchBar from '../../components/ui/SearchBar';
import { useProducts, useCategories, useCategoryManager } from '../../hooks/useProducts';
import { useToast } from '../../hooks/useToast';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useIngredients } from '../../hooks/useIngredients';
import Toast from '../../components/layout/Toast';
import { formatCOP } from '../../utils/formatters';
import { AdminProductSkeleton } from '../../components/ui/Skeleton';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import './AdminProducts.css';

// ── Virtualization Components ────────────────────────────────────────────────
const AdminListContainer = forwardRef(({ children, ...props }, ref) => (
  <div {...props} ref={ref} className="product-admin-list">
    {children}
  </div>
));

// ── Inline Image Uploader Component ────────────────────────────────────────
function ImageUploader({ value, onChange }) {
  const { uploading, progress, error, uploadImage, reset } = useImageUpload();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(value || '');

  // Sync preview when external value changes (e.g. editing existing product)
  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately while uploading
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const url = await uploadImage(file);
      URL.revokeObjectURL(localPreview);
      setPreview(url);
      onChange(url);
    } catch {
      // error already set by hook — revert preview
      setPreview(value || '');
    }

    // Reset file input so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    reset();
  };

  return (
    <div className="img-uploader">
      {preview ? (
        <div className="img-uploader-preview">
          <img src={preview} alt="Vista previa" />
          {uploading && (
            <div className="img-uploader-progress-overlay">
              <div className="img-uploader-progress-bar" style={{ width: `${progress}%` }} />
              <span className="img-uploader-progress-label">{progress}%</span>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              className="img-uploader-remove"
              onClick={handleRemove}
              aria-label="Eliminar imagen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="img-uploader-zone"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="img-uploader-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <span className="img-uploader-text">Toca para subir foto</span>
          <span className="img-uploader-hint">JPG, PNG o WebP · Máx 5 MB</span>
        </button>
      )}

      {/* URL fallback input */}
      {!preview && (
        <div className="img-uploader-url-area">
          <div className="img-uploader-divider">
            <span>o ingresa un enlace</span>
          </div>
          <div className="img-uploader-url-input-wrapper">
            <span className="url-icon">🔗</span>
            <input
              className="img-uploader-url-field"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              value={value || ''}
              onChange={(e) => {
                onChange(e.target.value);
                setPreview(e.target.value);
              }}
            />
          </div>
        </div>
      )}

      {error && <p className="img-uploader-error">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AdminProducts() {
  const { products, loading, addProduct, updateProduct, toggleProduct, toggleSoldOut, deleteProduct } = useProducts();
  const { ingredients } = useIngredients();
  const { categories: customCats, addCategory, deleteCategory } = useCategoryManager();
  const categories = useCategories(products).filter(c => c !== 'Todos');
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, showToast } = useToast();

  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingId,      setEditingId]      = useState(null);
  const [productToDelete,setProductToDelete]= useState(null);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [newCatName,     setNewCatName]     = useState('');
  const [newCatIcon,     setNewCatIcon]     = useState('🏷️');
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: '', imageUrl: '', active: true, type: 'net', additions: []
  });

  useBodyScrollLock(isModalOpen || !!productToDelete);

  // Auto-edit from Store navigation
  useEffect(() => {
    if (location.state?.editProduct) {
      openEdit(location.state.editProduct);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchTerm.toLowerCase();
      return !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
    });
  }, [products, searchTerm]);

  // Live stats
  const activeCount   = products.filter(p => p.active).length;
  const inactiveCount = products.filter(p => !p.active).length;
  const totalProducts = products.length;

  const openNew = () => {
    setForm({ name: '', description: '', price: '', category: '', imageUrl: '', active: true, type: 'net', additions: [] });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (product) => {
    setForm({ type: 'net', additions: [], ...product });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleAddCat = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName, newCatIcon);
      setNewCatName('');
      setNewCatIcon('🏷️');
      showToast('Categoría añadida', 'success');
    } catch {
      showToast('Error al añadir categoría', 'error');
    }
  };

  const handleDeleteCat = async (id) => {
    try {
      await deleteCategory(id);
      showToast('Categoría eliminada', 'success');
    } catch {
      showToast('Error al eliminar categoría', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category) { showToast('Selecciona una categoría', 'warning'); return; }
    const priceVal = Number(form.price);
    if (isNaN(priceVal) || priceVal <= 0) { showToast('El precio debe ser un número válido', 'error'); return; }
    try {
      const payload = { ...form, price: priceVal };
      if (editingId) {
        await updateProduct(editingId, payload);
        showToast('Producto actualizado ✅', 'success');
      } else {
        await addProduct(payload);
        showToast('Producto creado ✅', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error');
    }
  };

  const handleDelete  = (product) => setProductToDelete(product);
  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const idToDelete = productToDelete.id;
      setProductToDelete(null); // Cerrar inmediatamente para mejor UX (Optimista)
      await deleteProduct(idToDelete);
      showToast('Producto eliminado', 'success');
    } catch (e) {
      showToast(e.message || 'Error al eliminar', 'error');
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await toggleProduct(id, !currentStatus);
      showToast(!currentStatus ? 'Producto activado' : 'Producto ocultado', 'success');
    } catch {
      showToast('Error al cambiar estado', 'error');
    }
  };

  const handleSoldOut = async (id, currentSoldOut) => {
    try {
      await toggleSoldOut(id, !currentSoldOut);
      showToast(!currentSoldOut ? '🚫 Marcado como agotado' : '✅ Stock restaurado', !currentSoldOut ? 'warning' : 'success');
    } catch {
      showToast('Error al cambiar stock', 'error');
    }
  };

  return (
    <div className="app-container admin-products admin-page">
      <Header />
      <AdminSidebar />

      <main className="page-content admin-main-content">

        {/* ── Hero ── */}
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Gestión de Catálogo</span>
                <h1 className="inv-hero-title">Inventario</h1>
              </div>
            </div>
            
            <div className="inv-stats mt-lg">
              <div className="inv-stat">
                <span className="inv-stat-value">{totalProducts}</span>
                <span className="inv-stat-label">Total</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{activeCount}</span>
                <span className="inv-stat-label">Visibles</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{inactiveCount}</span>
                <span className="inv-stat-label">Ocultos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">
          {/* Unified Tooling: Search + Categories */}
          <div className="inv-toolbar-base">
            <div className="inv-search-modern">
               <span className="inv-search-icon">🔍</span>
               <input 
                 type="text" 
                 placeholder="Buscar productos..." 
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <button className="cat-btn-modern ripple" onClick={() => setIsCatModalOpen(true)}>
              <span>📁</span>
              <span>Categorías</span>
            </button>
            <button className="inv-action-btn primary ripple" onClick={openNew}>
              <span className="inv-action-icon">＋</span>
              <span className="inv-action-text hide-mobile">Nuevo Producto</span>
            </button>
          </div>

          {/* ── Product List ── */}
          {loading ? (
            <div className="product-admin-list">
            {[...Array(5)].map((_, i) => <AdminProductSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="inv-empty animate-fade-in">
            <div className="inv-empty-icon">🔍</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
              {searchTerm ? 'Sin coincidencias' : 'Catálogo vacío'}
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {searchTerm ? `No encontramos resultados para "${searchTerm}"` : 'Comienza a construir tu menú añadiendo productos.'}
            </p>
          </div>
        ) : (
          <Virtuoso
            useWindowScroll
            data={filteredProducts}
            components={{
              List: AdminListContainer
            }}
            itemContent={(index, p) => (
              <div key={p.id} className={`product-admin-item ${!p.active ? 'inactive' : ''}`}>

                {/* Image */}
                <div className="product-admin-img">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    : <div className="product-admin-img-fallback">📦</div>
                  }
                </div>

                {/* Info */}
                <div className="product-admin-info">
                  <div className="product-admin-header">
                    <span className="product-admin-name">{p.name}</span>
                    <div className="product-admin-toggles">
                      {/* Visible / Oculto */}
                      <div
                        className="toggle-wrapper"
                        onClick={() => handleToggle(p.id, p.active)}
                        title={p.active ? 'Ocultar producto' : 'Activar producto'}
                      >
                        <div className={`toggle ${p.active ? 'active' : ''}`} />
                      </div>
                      {/* Agotado */}
                      {p.active && (
                        <button
                          className={`admin-soldout-btn ${p.soldOut ? 'is-soldout' : ''}`}
                          onClick={() => handleSoldOut(p.id, p.soldOut)}
                          title={p.soldOut ? 'Restaurar stock' : 'Marcar como agotado'}
                        >
                          {p.soldOut ? '🚫' : '📦'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="product-admin-meta">
                    <span className="product-admin-price">{formatCOP(p.price)}</span>
                    {p.category && (
                      <span className="product-admin-cat">{p.category}</span>
                    )}
                    <span className={`product-admin-status ${p.active ? (p.soldOut ? 'soldout' : 'active') : 'inactive'}`}>
                      {p.active ? (p.soldOut ? '● Agotado' : '● Visible') : '● Oculto'}
                    </span>
                  </div>

                  <div className="product-admin-actions">
                    <button className="admin-btn-edit" onClick={() => openEdit(p)}>
                      ✏️ Editar
                    </button>
                    <button className="admin-btn-delete" onClick={() => handleDelete(p)}>
                      🗑️ Borrar
                    </button>
                  </div>
                </div>

              </div>
            )}
          />
        )}

        </div>
      </main>

      {/* ── Modal: Añadir/Editar Producto ── */}
      {isModalOpen && (
        <>
          <div className="overlay" onClick={() => setIsModalOpen(false)} />
          <div className="modal-responsive">
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">
                {editingId ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
              </h2>
              <button className="modal-responsive-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-responsive-body">
              <form onSubmit={handleSave} className="flex flex-col gap-md pb-xl">
                
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Nombre del producto</label>
                    <input className="input-field" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Granola de avena" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Precio base (COP)</label>
                    <input className="input-field" type="number" required min="0" placeholder="Ej: 12000" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Descripción</label>
                  <textarea className="input-field" rows="3" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalla ingredientes, peso, tamaño..." />
                </div>

                <div className="input-group">
                  <label className="input-label">Categoría</label>
                  <div className="category-chips-grid">
                    {categories.map(c => (
                      <button
                        key={c.name} type="button"
                        className={`category-chip ${form.category === c.name ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, category: c.name })}
                      >
                        <span className="category-chip-icon">{c.icon || '🏷️'}</span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                  {categories.length === 0 && (
                    <p className="text-xs text-muted mt-sm">No hay categorías. Créalas en el botón "📁 Categorías" del inventario.</p>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Configuración Logística</label>
                  <div className="product-type-cards">
                    <button 
                      type="button" 
                      className={`product-type-card ${form.type === 'net' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, type: 'net', additions: [] })}
                    >
                      <div className="type-card-icon">📦</div>
                      <div className="type-card-text">
                        <span className="type-card-title">Neto / Fijo</span>
                        <span className="type-card-desc">Producto sin cambios</span>
                      </div>
                      <div className="type-card-radio"></div>
                    </button>
                    <button 
                      type="button" 
                      className={`product-type-card ${form.type === 'prepared' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, type: 'prepared' })}
                    >
                      <div className="type-card-icon">👩‍🍳</div>
                      <div className="type-card-text">
                        <span className="type-card-title">Preparado</span>
                        <span className="type-card-desc">Personalizable</span>
                      </div>
                      <div className="type-card-radio"></div>
                    </button>
                  </div>

                  {form.type === 'prepared' && (
                    <div className="animate-slide-down mt-md" style={{ background: 'var(--color-bg-soft)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-sm mb-md">
                        <span style={{ fontSize: '1.2rem' }}>🌿</span>
                        <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 700 }}>Ingredientes Extra</h4>
                      </div>
                      
                      {ingredients?.filter(i => i.active).length > 0 ? (
                        <div className="grid-2 gap-sm">
                          {ingredients.filter(i => i.active).map(ing => {
                            const isSelected = form.additions?.includes(ing.id);
                            return (
                              <label key={ing.id} className={`ingredient-select-item ${isSelected ? 'active' : ''}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const adds = form.additions || [];
                                    setForm({ ...form, additions: checked ? [...adds, ing.id] : adds.filter(id => id !== ing.id) });
                                  }}
                                  className="hidden-checkbox"
                                />
                                <div className="flex-1">
                                  <p className="ing-name m-0">{ing.name}</p>
                                  <p className="ing-price m-0">+{formatCOP(ing.price)}</p>
                                </div>
                                {isSelected && <span className="text-primary text-sm">✓</span>}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-md text-center" style={{ borderRadius: '12px', background: 'rgba(255,160,0,0.05)', border: '1px dashed #ffa00033' }}>
                          <p className="text-xs text-amber-700 m-0">No hay ingredientes activos disponibles.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Imagen de Presentación</label>
                  <ImageUploader
                    value={form.imageUrl}
                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                  />
                </div>

                <div className="modal-actions-centered">
                  <button type="button" className="admin-btn-cancel ripple" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="admin-btn-save ripple" disabled={loading}>
                    {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Gestionar Categorías ── */}
      {isCatModalOpen && (
        <>
          <div className="overlay" onClick={() => setIsCatModalOpen(false)} />
          <div className="modal-responsive">
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">📁 Categorías</h2>
              <button className="modal-responsive-close" onClick={() => setIsCatModalOpen(false)}>✕</button>
            </div>
            <div className="modal-responsive-body pb-xl">
              <form 
                className="flex flex-col gap-sm mb-xl p-md" 
                style={{ background: 'var(--color-bg-soft)', borderRadius: '16px' }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newCatName) return;
                  try {
                    await addCategory(newCatName, newCatIcon);
                    setNewCatName('');
                    setNewCatIcon('🏷️');
                    showToast('Categoría agregada', 'success');
                  } catch (err) {
                    showToast(err.message, 'error');
                  }
                }}
              >
                <div className="input-group">
                  <label className="input-label">Añadir Nueva</label>
                  <div className="flex gap-sm">
                    <div className="emoji-selector-trigger" style={{ flexShrink: 0 }}>
                      <input 
                        type="text" 
                        className="input-field text-center" 
                        style={{ width: '48px', fontSize: '1.2rem', padding: '0' }}
                        value={newCatIcon}
                        readOnly
                      />
                    </div>
                    <input 
                      className="input-field" 
                      style={{ flex: 1 }}
                      placeholder="Nombre..." 
                      value={newCatName} 
                      onChange={e => setNewCatName(e.target.value)} 
                    />
                  </div>
                  
                  <div className="emoji-picker-container">
                    {['🏷️', '🥦', '🍎', '🥜', '🥤', '🍞', '🍯', '🍫', '🥥', '🥣', '🧼', '🌿'].map(emoji => (
                      <button 
                        key={emoji}
                        type="button"
                        className={`emoji-btn ${newCatIcon === emoji ? 'active' : ''}`}
                        onClick={() => setNewCatIcon(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  
                  <button type="submit" className="btn btn-primary btn-md w-full mt-sm">Añadir Categoría</button>
                </div>
              </form>

              <div className="cat-list flex flex-col gap-sm">
                <h3 className="m-0 mb-sm" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 800 }}>Existentes</h3>
                {customCats.length > 0 ? customCats.map(c => (
                  <div key={c.id} className="cat-defined-item">
                    <div className="flex items-center gap-md">
                      <div className="cat-icon-wrapper">{c.icon || '🏷️'}</div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</span>
                    </div>
                    <button 
                      className="btn btn-icon btn-danger-soft" 
                      onClick={() => {
                        if (window.confirm(`¿Eliminar categoría "${c.name}"?`)) {
                          deleteCategory(c.id);
                          showToast('Categoría eliminada', 'success');
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-xl opacity-40">
                    <p className="text-sm m-0">No hay categorías personalizadas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Confirmar Borrado ── */}
      {productToDelete && (
        <>
          <div className="overlay" onClick={() => setProductToDelete(null)} />
          <div className="modal-responsive" style={{ maxWidth: '400px', margin: 'auto' }}>
            <div className="modal-responsive-header border-none">
              <h2 className="modal-responsive-title">🗑️ Eliminar Producto</h2>
              <button 
                className="modal-responsive-close" 
                onClick={() => setProductToDelete(null)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-responsive-body text-center pt-none pb-xl">
              <p className="mb-xl text-muted">¿Seguro que deseas eliminar <strong>{productToDelete.name}</strong>?<br/>Esta acción borrará el producto permanentemente.</p>
              <div className="flex gap-md">
                <button className="btn btn-secondary flex-1" onClick={() => setProductToDelete(null)}>Cancelar</button>
                <button className="btn btn-danger flex-1" onClick={confirmDelete}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        </>
      )}


      <Toast toasts={toasts} />
    </div>
  );
}
