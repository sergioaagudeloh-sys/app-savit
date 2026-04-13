// src/pages/admin/AdminRewards.jsx
import { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BottomNav from '../../components/layout/BottomNav';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { useNotifications } from '../../context/NotificationContext';
import './AdminRewards.css';

// ── Official Sávit Coin Mascot (Elite Metallic Edition)
const MascotIcon = ({ size = 60 }) => (
  <div className="rewards-mascot-admin" style={{ opacity: 0.8 }}>
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="goldAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5C842" />
          <stop offset="50%" stopColor="#FBDF83" />
          <stop offset="100%" stopColor="#E0A800" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#goldAdmin)" stroke="#8B6914" strokeWidth="2" />
      <text x="32" y="44" textAnchor="middle" fontSize="34" fontWeight="1000" fill="#6B4F00">S</text>
    </svg>
  </div>
);

export default function AdminRewards() {
  const { showToast } = useNotifications();
  const [redemptions, setRedemptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('redemptions'); // 'redemptions' | 'ranking'

  useEffect(() => {
    // 1. Fetch Redemptions
    const qR = query(collection(db, 'redemptions'), orderBy('createdAt', 'desc'));
    const unsubR = onSnapshot(qR, (snap) => {
      setRedemptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Fetch Customers with points
    const qC = query(collection(db, 'customers'), orderBy('savitPoints', 'desc'));
    const unsubC = onSnapshot(qC, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubR();
      unsubC();
    };
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'redemptions', id), { status: newStatus });
      showToast('Estado actualizado', 'success');
    } catch (e) {
      showToast('Error al actualizar', 'error');
    }
  };

  // Stats
  const pendingCount = redemptions.filter(r => r.status === 'pending').length;
  const totalPointsRedeemed = redemptions.reduce((acc, r) => acc + (r.pointsCost || 0), 0);
  const totalInCirculation = customers.reduce((acc, c) => acc + (c.savitPoints || 0), 0);

  return (
    <div className="app-container admin-rewards admin-page">
      <Header title="Gestión de Recompensas" />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        
        {/* Elite Hero */}
        <div className="inv-hero rewards-hero-admin">
          <div className="inv-hero-inner">
            <div className="inv-hero-top" style={{ alignItems: 'center' }}>
              <div className="inv-hero-title-area">
                <span className="inv-hero-label glass-label">Programa de Fidelidad</span>
                <h1 className="inv-hero-title">Centro de Recompensas</h1>
                <p className="inv-hero-subtitle">Monitorea canjes y ranking de lealtad</p>
              </div>
              <MascotIcon />
            </div>
            
            <div className="inv-stats glass-stats">
              <div className={`inv-stat ripple ${tab === 'redemptions' ? 'active-stat' : ''}`} onClick={() => setTab('redemptions')}>
                <span className="inv-stat-value">{pendingCount}</span>
                <span className="inv-stat-label">Pendientes</span>
              </div>
              <div className="inv-stat">
                <span className="inv-stat-value">{totalPointsRedeemed.toLocaleString()}</span>
                <span className="inv-stat-label">Pts Canjeados</span>
              </div>
              <div className={`inv-stat ripple ${tab === 'ranking' ? 'active-stat' : ''}`} onClick={() => setTab('ranking')}>
                <span className="inv-stat-value">{totalInCirculation.toLocaleString()}</span>
                <span className="inv-stat-label">Balance Global</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-page-content">
          
          <div className="rewards-admin-tabs">
            <button 
              className={`tab-btn ${tab === 'redemptions' ? 'active' : ''}`} 
              onClick={() => setTab('redemptions')}
            >
              Solicitudes de Canje
            </button>
            <button 
              className={`tab-btn ${tab === 'ranking' ? 'active' : ''}`} 
              onClick={() => setTab('ranking')}
            >
              Ranking de Puntos
            </button>
          </div>

          {loading ? (
            <div className="flex-center p-xl"><span className="spinner spinner-dark" /></div>
          ) : tab === 'redemptions' ? (
            <div className="redemptions-section">
              <div className="admin-section-meta mb-md">
                <div>
                  <h3 className="admin-section-title">Historial de Canjes</h3>
                  <p className="admin-section-desc">Gestiona las entregas de premios solicitados por los clientes</p>
                </div>
              </div>

              {redemptions.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-state-icon">🎁</div>
                  <h3>No hay canjes registrados</h3>
                  <p>Las solicitudes aparecerán aquí cuando un cliente canjee sus puntos.</p>
                </div>
              ) : (
                <div className="redemptions-list">
                  {redemptions.map(red => (
                    <RedemptionCard 
                      key={red.id} 
                      red={red} 
                      onUpdate={handleUpdateStatus} 
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="ranking-section">
              <div className="admin-section-meta mb-md">
                <div>
                  <h3 className="admin-section-title">Base de Clientes Fieles</h3>
                  <p className="admin-section-desc">Ranking de clientes basado en su balance actual de puntos</p>
                </div>
              </div>

              <div className="premium-card overflow-hidden">
                <div className="ranking-table-wrapper">
                  <table className="ranking-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th className="hide-mobile">Pedidos</th>
                        <th className="text-right">Balance Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((cust, idx) => (
                        <tr key={cust.id} className={`ranking-row ${idx < 3 ? `top-rank rank-${idx + 1}` : ''}`}>
                          <td className="rank-idx">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </td>
                          <td>
                            <div className="customer-cell">
                              <span className="customer-avatar">{cust.name?.charAt(0) || '?'}</span>
                              <div className="customer-meta">
                                <span className="customer-name">{cust.name || 'Sin Nombre'}</span>
                                <span className="customer-sub">{cust.phone || cust.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="text-muted hide-mobile">{cust.ordersCount || 0} pedidos</td>
                          <td className="text-right">
                            <span className="points-badge-elite">
                              <span className="badge-sparkle">✨</span>
                              {cust.savitPoints?.toLocaleString() || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function RedemptionCard({ red, onUpdate }) {
  const date = new Date(red.createdAt).toLocaleDateString('es-CO', { 
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
  });

  const getStatusLabel = (s) => {
    switch(s) {
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return 'Pendiente';
    }
  };

  return (
    <div className={`redemption-card premium-card animate-fade-in status-${red.status}`}>
      <div className="red-card-badge">
        {red.status === 'pending' ? '🔔 Nuevo' : '✓'}
      </div>
      
      <div className="red-main-info">
        <div className="customer-info-row">
          <span className="red-customer-name">{red.customerName}</span>
          <span className="red-date">{date}</span>
        </div>
        <h4 className="red-award-name">🎁 {red.awardName}</h4>
        <div className="red-points-cost">
          Costo: <strong>{red.pointsCost?.toLocaleString()} Pts</strong>
        </div>
      </div>

      <div className="red-footer">
        <div className={`status-pill ${red.status}`}>
          {getStatusLabel(red.status)}
        </div>
        
        <div className="red-actions">
          {red.status === 'pending' && (
            <>
              <button 
                className="btn btn-soft btn-sm" 
                onClick={() => onUpdate(red.id, 'delivered')}
              >
                Entregar
              </button>
              <button 
                className="btn btn-ghost btn-sm text-error" 
                onClick={() => onUpdate(red.id, 'cancelled')}
              >
                Rechazar
              </button>
            </>
          )}
          {red.status !== 'pending' && (
             <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => onUpdate(red.id, 'pending')}
            >
              Reestablecer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
