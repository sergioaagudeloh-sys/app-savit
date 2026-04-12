// src/pages/admin/AdminConfig.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useStoreConfig } from '../../hooks/useOrders';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/layout/Toast';
import './AdminConfig.css';

export default function AdminConfig() {
  const { config, updateConfig, loading } = useStoreConfig();
  const { toasts, showToast } = useToast();
  const navigate = useNavigate();

  // Store Config State
  const [form, setForm] = useState({
    isOpen: true,
    whatsappNumber: '',
    storeName: '',
    scheduleEnabled: false,
    openTime: '09:00',
    closeTime: '18:00',
    googleDriveLink: ''
  });

  // Points Config State
  const [pointsEnabled, setPointsEnabled] = useState(true);
  const [pointsRate, setPointsRate] = useState(10);
  
  const [saving, setSaving] = useState(false);

  // Sync store config state
  useEffect(() => {
    if (config) {
      setForm(prev => ({ ...prev, ...config }));
      if (config.pointsConfig) {
        setPointsEnabled(config.pointsConfig.enabled ?? true);
        setPointsRate(config.pointsConfig.pointsPer1000 ?? 10);
      }
    }
  }, [config]);

  if (loading && !config) return (
    <div className="app-container admin-config admin-page">
      <Header title="Configuración" />
      <AdminSidebar />
      <div className="flex-center w-full" style={{ height: '70vh' }}>
        <span className="spinner spinner-dark" />
      </div>
    </div>
  );



  const handleToggleOpen = () => {
    const newValue = !form.isOpen;
    setForm(prev => ({ ...prev, isOpen: newValue }));
    handleSaveDirect({ isOpen: newValue });
  };

  const handleToggleSchedule = () => {
    const newValue = !form.scheduleEnabled;
    setForm(prev => ({ ...prev, scheduleEnabled: newValue }));
    handleSaveDirect({ scheduleEnabled: newValue });
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveDirect = async (dataToSave) => {
    setSaving(true);
    try {
      await updateConfig(dataToSave);
      showToast('Configuración actualizada', 'success');
    } catch (e) {
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveDirect(form);
  };

  const handleSavePoints = () => {
    const rate = Math.max(1, parseInt(pointsRate) || 10);
    setPointsRate(rate);
    handleSaveDirect({
      pointsConfig: { enabled: pointsEnabled, pointsPer1000: rate }
    });
  };

  const handleTogglePoints = () => {
    const newVal = !pointsEnabled;
    setPointsEnabled(newVal);
    handleSaveDirect({
      pointsConfig: { enabled: newVal, pointsPer1000: parseInt(pointsRate) || 10 }
    });
  };



  const handleExportBackup = () => {
    try {
      const data = {
        products: JSON.parse(localStorage.getItem('savit_demo_products') || '[]'),
        orders: JSON.parse(localStorage.getItem('savit_demo_orders') || '[]'),
        categories: JSON.parse(localStorage.getItem('savit_custom_categories') || '[]'),
        config: JSON.parse(localStorage.getItem('savit_store_config') || '{}'),
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_savit_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad exportada', 'success');
    } catch (e) {
      showToast('Error al exportar datos', 'error');
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validar estructura básica
        if (!data.products && !data.orders && !data.categories) {
          throw new Error('Formato de archivo no válido');
        }

        if (data.products) localStorage.setItem('savit_demo_products', JSON.stringify(data.products));
        if (data.orders) localStorage.setItem('savit_demo_orders', JSON.stringify(data.orders));
        if (data.categories) localStorage.setItem('savit_custom_categories', JSON.stringify(data.categories));
        if (data.config) localStorage.setItem('savit_store_config', JSON.stringify(data.config));
        
        showToast('Copia restaurada con éxito. Recargando...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        showToast('Error: Arrastra un archivo .json de Savit válido', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container admin-config admin-page">
      <Header title="Configuración" />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Ajustes del Negocio</span>
                <h1 className="inv-hero-title">Configuración</h1>
              </div>

              <div className="inv-hero-actions">
                <div className="premium-license-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="premium-icon">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  <div className="premium-text-group">
                    <span className="premium-title">Licencia PRO</span>
                    <span className="premium-subtitle">Activada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Hero Stats/Tabs Row ── */}
            <div className="inv-stats">
              <button className="inv-stat active">
                <span className="inv-stat-value">⚙️</span>
                <span className="inv-stat-label">General</span>
              </button>
              <button className="inv-stat" onClick={() => navigate('/admin/awards')}>
                <span className="inv-stat-value">⭐</span>
                <span className="inv-stat-label">Premios</span>
              </button>
              <button className="inv-stat" onClick={() => navigate('/admin/products')}>
                <span className="inv-stat-value">📦</span>
                <span className="inv-stat-label">Inventario</span>
              </button>
            </div>
          </div>
        </div>
          {/* ── Status of the Store ── */}
          <div className="premium-card mb-lg">
            <div className="card-header">
              <div className="card-header-icon">🏪</div>
              <div className="flex-1">
                <h3>Estado de la Tienda</h3>
                <p>{form.isOpen ? 'Abierta: Recibiendo pedidos.' : 'Cerrada: Banner activo.'}</p>
              </div>
              <div className="toggle-wrapper" onClick={handleToggleOpen}>
                <div className={`toggle ${form.isOpen ? 'active' : ''}`} />
              </div>
            </div>
          </div>

          {/* ── General Data ── */}
          <div className="premium-card mb-lg">
            <div className="card-header">
              <div className="card-header-icon">✍️</div>
              <div>
                <h3>Datos Generales</h3>
                <p>Información básica de contacto y marca</p>
              </div>
            </div>
            <form className="p-lg" onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Nombre del Negocio</label>
                  <input 
                    className="input-field" 
                    name="storeName" 
                    value={form.storeName} 
                    onChange={handleChange} 
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Número de WhatsApp</label>
                  <input 
                    className="input-field" 
                    name="whatsappNumber" 
                    value={form.whatsappNumber} 
                    onChange={handleChange} 
                    placeholder="573216513171"
                    required
                  />
                  <p className="text-xs text-muted">Ex: 573216513171 (sin símbolos)</p>
                </div>
              </div>
              <div className="admin-form-footer mt-md">
                <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto' }} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Guardar Datos Generales'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Automatic Schedule ── */}
          <div className="premium-card mb-lg">
            <div className="card-header">
              <div className="card-header-icon">🕒</div>
              <div className="flex-1">
                <h3>Horario Automático</h3>
                <p>Abrir y cerrar la tienda según reloj</p>
              </div>
              <div className="toggle-wrapper" onClick={handleToggleSchedule}>
                <div className={`toggle ${form.scheduleEnabled ? 'active' : ''}`} />
              </div>
            </div>
            
            {form.scheduleEnabled && (
              <div className="p-lg animate-slide-down">
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Hora de Apertura</label>
                    <input 
                      type="time" 
                      className="input-field" 
                      name="openTime" 
                      value={form.openTime || '09:00'} 
                      onChange={handleChange} 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Hora de Cierre</label>
                    <input 
                      type="time" 
                      className="input-field" 
                      name="closeTime" 
                      value={form.closeTime || '18:00'} 
                      onChange={handleChange} 
                    />
                  </div>
                </div>
                <div className="admin-form-footer mt-md">
                   <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSubmit}>
                     Actualizar Horario
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bóveda Legal ── */}
          <div className="premium-card mb-lg">
            <div className="card-header">
              <div className="card-header-icon">📂</div>
              <div className="flex-1">
                <h3>Bóveda Legal</h3>
                <p>Documentación RUT y Cámara de Comercio</p>
              </div>
            </div>
            <div className="p-lg">
              <div className="input-group">
                <label className="input-label">Enlace de Google Drive</label>
                <div className="flex gap-sm">
                  <input 
                    className="input-field flex-1" 
                    name="googleDriveLink" 
                    value={form.googleDriveLink || ''} 
                    onChange={handleChange} 
                    placeholder="https://drive.google.com/..."
                  />
                  {form.googleDriveLink && (
                    <a href={form.googleDriveLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      Abir
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Puntos Savit ── */}
          <div className="premium-card mb-lg">
            <div className="card-header">
              <div className="card-header-icon">⭐</div>
              <div className="flex-1">
                <h3>Puntos Savit</h3>
                <p>Configura la recompensa por cada compra</p>
              </div>
              <div className="toggle-wrapper" onClick={handleTogglePoints}>
                <div className={`toggle ${pointsEnabled ? 'active' : ''}`} />
              </div>
            </div>

            {pointsEnabled && (
              <div className="p-lg animate-slide-down">
                <div className="points-config-info" style={{
                  background: 'linear-gradient(135deg, var(--color-primary-light), rgba(36,76,38,0.06))',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  marginBottom: 'var(--space-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '2rem' }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                      Clientes ganan <strong>{pointsRate}</strong> pts por cada $1.000
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Ej: una compra de $20.000 = {(parseInt(pointsRate) || 10) * 20} puntos Savit
                    </div>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Puntos por cada $1.000 COP</label>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    max="1000"
                    value={pointsRate}
                    onChange={e => setPointsRate(e.target.value)}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
                    Valor recomendado: 10 pts / $1.000. Máximo 1.000 pts.
                  </p>
                </div>

                <div className="admin-form-footer mt-md">
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginLeft: 'auto' }}
                    onClick={handleSavePoints}
                    disabled={saving}
                  >
                    {saving ? <span className="spinner" /> : '⭐ Guardar Configuración'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Maintenance ── */}
          <div className="premium-card mb-xl">
            <div className="card-header">
              <div className="card-header-icon">🛠️</div>
              <div className="flex-1">
                <h3>Mantenimiento</h3>
                <p>Respaldo de base de datos local</p>
              </div>
            </div>
            <div className="p-lg">
               <div className="maintenance-actions">
                  <button className="btn btn-soft btn-sm" onClick={handleExportBackup}>
                    📥 Exportar JSON
                  </button>
                  <label className="btn btn-outline btn-sm cursor-pointer text-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    📤 Importar JSON
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
                  </label>
                </div>
            </div>
          </div>

          {/* ── Session ── */}
          <div className="premium-card" style={{ border: '1px solid var(--color-danger)', background: 'transparent' }}>
            <div className="card-header">
              <div className="card-header-icon">🚪</div>
              <div className="flex-1">
                <h3 style={{ color: 'var(--color-danger)' }}>Sesión</h3>
                <p>Cerrar acceso administrativo</p>
              </div>
            </div>
            <div className="p-lg">
              <button 
                className="btn btn-outline btn-sm w-full" 
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={() => {
                  localStorage.removeItem('savit_admin_auth');
                  window.location.href = '/';
                }}
              >
                Cerrar Sesión Administrador
              </button>
            </div>
          </div>
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}
