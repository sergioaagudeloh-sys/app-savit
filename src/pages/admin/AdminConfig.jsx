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

  // Tab State
  const [activeTab, setActiveTab] = useState('tienda'); // 'tienda', 'fidelizacion', 'sistema'

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
    if (form.scheduleEnabled) {
      showToast('Desactiva primero el horario automático para poder abrir la tienda de forma manual', 'error');
      return;
    }
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
      <Header />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Ajustes del Negocio</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 className="inv-hero-title">Configuración</h1>
                  <div className="premium-license-badge mini">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span className="premium-title" style={{ fontSize: '11px' }}>PRO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs (con Glider) ── */}
            <div
              className="inv-stats config-tabs-row"
              style={{ '--tab-idx': activeTab === 'tienda' ? 0 : activeTab === 'fidelizacion' ? 1 : 2 }}
            >
              <div className="cfg-tab-glider" />
              <button className={`inv-stat ${activeTab === 'tienda' ? 'active' : ''}`} onClick={() => setActiveTab('tienda')}>
                <span className="inv-stat-value">📍</span>
                <span className="inv-stat-label">Tienda</span>
              </button>
              <button className={`inv-stat ${activeTab === 'fidelizacion' ? 'active' : ''}`} onClick={() => setActiveTab('fidelizacion')}>
                <span className="inv-stat-value">💎</span>
                <span className="inv-stat-label">Fidelidad</span>
              </button>
              <button className={`inv-stat ${activeTab === 'sistema' ? 'active' : ''}`} onClick={() => setActiveTab('sistema')}>
                <span className="inv-stat-value">⚙️</span>
                <span className="inv-stat-label">Sistema</span>
              </button>
            </div>
          </div>
        </div>

        <div className="admin-page-content">

          {/* ─────────── TAB: TIENDA ─────────── */}
          {activeTab === 'tienda' && (
            <div className="cfg-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Estado */}
              <div className="cfg-card" style={{ '--card-i': 0 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">🏪</div>
                  <div className="cfg-header-text">
                    <h3>Estado de la Tienda</h3>
                    <p>{form.isOpen ? 'Abierta · recibiendo pedidos' : 'Cerrada · banner activo'}</p>
                  </div>
                  <div className="cfg-toggle toggle-wrapper" onClick={handleToggleOpen}>
                    <div className={`toggle ${form.isOpen ? 'active' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Datos Generales */}
              <div className="cfg-card" style={{ '--card-i': 1 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">✍️</div>
                  <div className="cfg-header-text">
                    <h3>Datos Generales</h3>
                    <p>Nombre del negocio y WhatsApp</p>
                  </div>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="cfg-body">
                    <div className="cfg-grid-2">
                      <div className="cfg-input-group">
                        <label className="cfg-label">Nombre</label>
                        <input className="cfg-input" name="storeName" value={form.storeName} onChange={handleChange} required />
                      </div>
                      <div className="cfg-input-group">
                        <label className="cfg-label">WhatsApp</label>
                        <input className="cfg-input" name="whatsappNumber" value={form.whatsappNumber} onChange={handleChange} placeholder="573216513171" required />
                        <span className="cfg-hint">Sin símbolos ni espacios</span>
                      </div>
                    </div>
                    <div className="cfg-footer">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                        {saving ? <span className="spinner" /> : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Horario */}
              <div className="cfg-card" style={{ '--card-i': 2 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">🕒</div>
                  <div className="cfg-header-text">
                    <h3>Horario Automático</h3>
                    <p>Programar apertura y cierre</p>
                  </div>
                  <div className="cfg-toggle toggle-wrapper" onClick={handleToggleSchedule}>
                    <div className={`toggle ${form.scheduleEnabled ? 'active' : ''}`} />
                  </div>
                </div>
                {form.scheduleEnabled && (
                  <div className="cfg-schedule-fields">
                    <div className="cfg-grid-2" style={{ marginTop: 0 }}>
                      <div className="cfg-input-group">
                        <label className="cfg-label">Apertura</label>
                        <input type="time" className="cfg-input" name="openTime" value={form.openTime || '09:00'} onChange={handleChange} />
                      </div>
                      <div className="cfg-input-group">
                        <label className="cfg-label">Cierre</label>
                        <input type="time" className="cfg-input" name="closeTime" value={form.closeTime || '18:00'} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="cfg-footer">
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit}>Guardar Horario</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────── TAB: FIDELIZACIÓN ─────────── */}
          {activeTab === 'fidelizacion' && (
            <div className="cfg-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Bóveda Legal */}
              <div className="cfg-card" style={{ '--card-i': 0 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">📂</div>
                  <div className="cfg-header-text">
                    <h3>Bóveda Legal</h3>
                    <p>RUT y Cámara de Comercio en Drive</p>
                  </div>
                </div>
                <div className="cfg-body">
                  <div className="cfg-input-group">
                    <label className="cfg-label">Enlace Google Drive</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="cfg-input" style={{ flex: 1 }} name="googleDriveLink" value={form.googleDriveLink || ''} onChange={handleChange} placeholder="https://drive.google.com/..." />
                      {form.googleDriveLink && (
                        <a href={form.googleDriveLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Ver</a>
                      )}
                    </div>
                  </div>
                  <div className="cfg-footer">
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit}>Guardar</button>
                  </div>
                </div>
              </div>

              {/* Puntos Savit */}
              <div className="cfg-card" style={{ '--card-i': 1 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">⭐</div>
                  <div className="cfg-header-text">
                    <h3>Puntos Savit</h3>
                    <p>Recompensa por cada compra</p>
                  </div>
                  <div className="cfg-toggle toggle-wrapper" onClick={handleTogglePoints}>
                    <div className={`toggle ${pointsEnabled ? 'active' : ''}`} />
                  </div>
                </div>
                {pointsEnabled && (
                  <div className="cfg-body">
                    <div className="cfg-points-preview">
                      <span className="cfg-points-preview-emoji">🏆</span>
                      <div className="cfg-points-preview-info">
                        <strong>{pointsRate} pts por cada $1.000</strong>
                        <span>Ej: $20.000 = {(parseInt(pointsRate) || 10) * 20} puntos</span>
                      </div>
                    </div>
                    <div className="cfg-input-group">
                      <label className="cfg-label">Puntos por $1.000 COP</label>
                      <input type="number" className="cfg-input" min="1" max="1000" value={pointsRate} onChange={e => setPointsRate(e.target.value)} />
                      <span className="cfg-hint">Recomendado: 10 pts / $1.000</span>
                    </div>
                    <div className="cfg-footer">
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleSavePoints} disabled={saving}>
                        {saving ? <span className="spinner" /> : 'Guardar Puntos'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────── TAB: SISTEMA ─────────── */}
          {activeTab === 'sistema' && (
            <div className="cfg-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Mantenimiento */}
              <div className="cfg-card" style={{ '--card-i': 0 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">🛠️</div>
                  <div className="cfg-header-text">
                    <h3>Mantenimiento</h3>
                    <p>Copia de seguridad de datos locales</p>
                  </div>
                </div>
                <div className="cfg-body">
                  <div className="cfg-maintenance-row">
                    <button className="btn btn-outline btn-sm" onClick={handleExportBackup}>📥 Exportar JSON</button>
                    <label className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      📤 Importar JSON
                      <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sesión */}
              <div className="cfg-card danger" style={{ '--card-i': 1 }}>
                <div className="cfg-header">
                  <div className="cfg-header-icon">🚪</div>
                  <div className="cfg-header-text">
                    <h3>Sesión</h3>
                    <p>Cerrar acceso administrativo</p>
                  </div>
                </div>
                <div className="cfg-body">
                  <button
                    className="btn btn-danger btn-sm w-full"
                    onClick={() => { localStorage.removeItem('savit_admin_auth'); window.location.href = '/'; }}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}
