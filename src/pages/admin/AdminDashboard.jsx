// src/pages/admin/AdminDashboard.jsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { useOrders, useStoreConfig } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useNotifications } from '../../context/NotificationContext';
import { formatCOP } from '../../utils/formatters';
import { db, isFirebaseConfigured } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import './AdminDashboard.css';

const PIE_COLORS = ['#1d3b1f', '#2f5b2d', '#42803b', '#62a84a', '#8bd165'];

export default function AdminDashboard() {
  const { orders, loading } = useOrders();
  const { products } = useProducts();
  const { config } = useStoreConfig();
  const { showToast } = useNotifications();
  const [subscriptions, setSubscriptions] = useState([]);

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showTopProductsModal, setShowTopProductsModal] = useState(false);
  const [period, setPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // Carousel state
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);
  const activePromos = config?.promos?.filter(p => p.active) || (config?.promo?.active ? [config.promo] : []);

  useEffect(() => {
    if (activePromos.length > 1) {
      const interval = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % activePromos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activePromos.length]);

  useEffect(() => {
    if (carouselRef.current && activePromos.length > 0) {
      carouselRef.current.scrollTo({
        left: activeSlide * carouselRef.current.offsetWidth,
        behavior: 'smooth',
      });
    }
  }, [activeSlide, activePromos.length]);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      const q = query(collection(db, 'subscriptions'), where('active', '==', true));
      return onSnapshot(q, (snap) => {
        setSubscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    } else {
      setSubscriptions(JSON.parse(localStorage.getItem('savit_subscriptions') || '[]'));
    }
  }, []);


  const stats = useMemo(() => {
    if (!orders.length) return { chartData: [], totalRevenue: 0, todayCount: 0, pendingCount: 0, top: [], bottom: [], premium: null };

    const calc = {};
    let totalRevenue = 0;
    let premiumProd = null;
    let todayCount = 0;
    let pendingCount = 0;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const periodStart = new Date(now);
    if (period === 'day') {
      const parts = selectedDate.split('-');
      periodStart.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      periodStart.setDate(now.getDate() - 7);
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
    }

    orders.forEach(o => {
      const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAtMillis);
      const orderDayStart = new Date(orderDate);
      orderDayStart.setHours(0, 0, 0, 0);

      const inPeriod = period === 'day'
        ? orderDayStart.getTime() === periodStart.getTime()
        : orderDate >= periodStart;
      const isToday = orderDayStart.getTime() === todayStart.getTime();
      const isEffective = ['completed', 'paid', 'dispatched', 'delivered'].includes(o.status);
      const isPending = isToday && o.status !== 'delivered' && o.status !== 'cancelled';
      if (isPending) pendingCount++;

      if (isEffective && inPeriod) {
        totalRevenue += (o.total || 0);
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach(item => {
            if (!calc[item.name]) {
              calc[item.name] = { name: item.name || 'Sin nombre', quantity: 0, revenue: 0, price: item.price || 0 };
            }
            calc[item.name].quantity += (item.quantity || 1);
            calc[item.name].revenue += ((item.price || 0) * (item.quantity || 1));
            if (!premiumProd || (item.price || 0) > premiumProd.price) premiumProd = item;
          });
        }
      }

      if (isToday && o.status === 'delivered') todayCount++;
    });

    const allProducts = Object.values(calc);

    return {
      chartData: allProducts
        .map(p => ({ name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name, ventas: p.quantity }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 5),
      revenueChartData: [...allProducts]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(p => ({ name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name, ingresos: p.revenue, quantity: p.quantity })),
      totalRevenue,
      todayCount,
      pendingCount,
      top: [...allProducts].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      bottom: [...allProducts].sort((a, b) => a.quantity - b.quantity).slice(0, 5),
      premium: premiumProd,
    };

  }, [orders, period, selectedDate]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [viewDate]);

  const navigateMonth = (dir) => {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + dir);
    setViewDate(next);
  };

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date.toISOString().split('T')[0]);
    setShowCalendar(false);
  };

  if (loading) return (
    <div className="app-container admin-dashboard admin-page">
      <Header />
      <AdminSidebar />
      <main className="page-content admin-main-content">
        <SkeletonDashboard />
      </main>
      <BottomNav />
    </div>
  );

  const periodLabel = period === 'day' ? selectedDate.split('-').reverse().join('/') : period === 'week' ? 'Últimos 7 días' : 'Este mes';

  return (
    <div className="app-container admin-dashboard admin-page">
      <Header />
      <AdminSidebar />
      <main className="page-content admin-main-content">

        {/* ── Dashboard Hero ── */}
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top" style={{ alignItems: 'center' }}>
              <div className="inv-hero-title-area">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                  <span className="inv-hero-label" style={{ marginBottom: 0 }}>Panel Central</span>
                </div>
                <h1 className="inv-hero-title" style={{ marginTop: '2px', marginBottom: '4px' }}>¡Hola, Admin! 👋</h1>
                <span className="inv-hero-date" style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '16px', display: 'block', fontWeight: 600 }}>
                  {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>

            {/* Fila de Estadísticas Premium en Hero */}
            <div className="hero-stats-row" style={{ marginTop: '4px', marginBottom: '24px' }}>
              <div className="hero-stat-btn ripple" onClick={() => setShowRevenueModal(true)}>
                <span className="hero-stat-icon">💰</span>
                <div className="hero-stat-info">
                  <span className="hero-stat-val">{formatCOP(stats.totalRevenue)}</span>
                  <span className="hero-stat-lab">Ventas Hoy</span>
                </div>
              </div>
              <Link to="/admin/orders" className={`hero-stat-btn ripple ${stats.pendingCount > 0 ? 'urgent' : ''}`}>
                <span className="hero-stat-icon">⏳</span>
                <div className="hero-stat-info">
                  <span className="hero-stat-val">{stats.pendingCount}</span>
                  <span className="hero-stat-lab">Pedidos</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Content Area ── */}
        <div className="admin-page-content">
          
          {/* Smart Promotions Grid (Responsive) - PRIORITIZED TOP */}
          {activePromos.length > 0 && (
            <div className="dash-promos-container">
              <div className="dash-section-header">
                <h2 className="dash-section-title">📢 Promociones Activas</h2>
              </div>
              <div className={`dash-promos-grid items-${activePromos.length > 2 ? 'multi' : activePromos.length}`}>
                {activePromos.map((promo, idx) => (
                  <div key={idx} className="dash-promo-rect">
                    {promo.imageUrl && <img className="dash-promo-rect-img" src={promo.imageUrl} alt={promo.title} />}
                    <div className="dash-promo-rect-content">
                      <span className="badge-live">EN VIVO</span>
                      <h3 className="dash-promo-rect-title">{promo.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px' }}>
                <Link to="/admin/offers" className="btn w-full" style={{ background: 'var(--color-bg-soft)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', justifyContent: 'center', boxShadow: 'none' }}>
                  Gestionar Ofertas ❯
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Acciones Rápidas</h2>
          </div>
          <div className="dash-quick-actions">
            <Link to="/admin/orders" className="dash-action-card">
              <span className="action-emoji">📋</span>
              <span className="action-text">Pedidos</span>
            </Link>
            <Link to="/admin/products" className="dash-action-card">
              <span className="action-emoji">🥗</span>
              <span className="action-text">Productos</span>
            </Link>
            <Link to="/admin/offers" className="dash-action-card">
              <span className="action-emoji">🔥</span>
              <span className="action-text">Ofertas</span>
            </Link>

            <Link to="/admin/config" className="dash-action-card">
              <span className="action-emoji">⚙️</span>
              <span className="action-text">Config</span>
            </Link>
          </div>
          
          {/* Pending orders alert (Prominent) */}
          {stats.pendingCount > 0 && (
            <Link to="/admin/orders" className="dash-alert-banner" style={{ textDecoration: 'none' }}>
              <span className="dash-alert-icon">🔔</span>
              <div className="dash-alert-body">
                <strong>Tienes {stats.pendingCount} pedido{stats.pendingCount > 1 ? 's' : ''} pendiente{stats.pendingCount > 1 ? 's' : ''}</strong>
                <span>Toca aquí para gestionarlos</span>
              </div>
              <span className="dash-alert-arrow">❯</span>
            </Link>
          )}


          {/* Upcoming Payments Alert */}
          {(() => {
            const today = new Date().getDate();
            const upcoming = subscriptions.filter(s => {
              const diff = s.dayOfMonth - today;
              return s.active && diff >= 0 && diff <= 3;
            }).sort((a,b) => a.dayOfMonth - b.dayOfMonth);

            if (upcoming.length === 0) return null;

            return (
              <div className="dash-section-header mt-lg">
                <h2 className="dash-section-title">📅 Pagos Próximos</h2>
                <Link to="/admin/subscriptions" className="dash-section-action">Gestionar ❯</Link>
              </div>
            );
          })()}

          <div className="dash-upcoming-list">
            {subscriptions
              .filter(s => {
                const diff = s.dayOfMonth - new Date().getDate();
                return s.active && (diff <= 3); // Muestra si vence en <= 3 días o si ya venció
              })
              .sort((a, b) => (a.dayOfMonth - new Date().getDate()) - (b.dayOfMonth - new Date().getDate()))
              .map(sub => {
                const diff = sub.dayOfMonth - new Date().getDate();
                const isOverdue = diff < 0;
                const isToday = diff === 0;

                return (
                  <div 
                    key={sub.id} 
                    className={`dash-sub-item ${isOverdue ? 'overdue' : isToday ? 'today' : ''}`}
                    onClick={() => window.location.href = '/admin/subscriptions'}
                  >

                    <div className="sub-item-info">
                      <span className="sub-item-name">{sub.name}</span>
                      <span className="sub-item-date">
                        {isOverdue ? `¡VENCIDO el día ${sub.dayOfMonth}! 🛑` : isToday ? 'VENCE HOY ⚠️' : `Vence el día ${sub.dayOfMonth}`}
                      </span>
                    </div>
                    <div className="sub-item-amount">{formatCOP(sub.amount)}</div>
                  </div>
                );
              })}
          </div>

          {/* Performance Preview */}
          <div className="dash-section-header">
            <h2 className="dash-section-title">Rendimiento</h2>
            <button
              className="dash-section-action"
              onClick={() => setShowRevenueModal(true)}
            >
              Ver más ❯
            </button>
          </div>

          {stats.chartData.length > 0 ? (
            <div className="dash-chart-card" onClick={() => setShowRevenueModal(true)} style={{ transform: 'translateZ(0)' }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    dataKey="ventas"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    stroke="none"
                    paddingAngle={4}
                    animationDuration={450}
                    animationBegin={0}
                  >
                    {stats.chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <p className="dash-chart-label">Distribución productos más vendidos · Toca para detalles</p>
            </div>
          ) : (
            <div className="dash-empty-chart">
              <span>📉</span>
              <p>Aún no hay datos de ventas para este período</p>
              <button className="btn btn-soft" onClick={() => setShowRevenueModal(true)}>
                Ver análisis detallado
              </button>
            </div>
          )}

          {/* Ranking Preview */}
          {stats.chartData.length > 0 && (
            <div className="dash-ranking-preview" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="dash-section-header">
                <h2 className="dash-section-title">🏆 Top Productos</h2>
                <button className="dash-section-action" onClick={() => setShowTopProductsModal(true)}>Ver más ❯</button>
              </div>
              <div className="dash-ranking-list">
                {stats.chartData.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="dash-rank-item">
                    <span className={`rank-number n${idx + 1}`}>{idx + 1}</span>
                    <span className="rank-name">{item.name}</span>
                    <span className="rank-val">{item.ventas} uds</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: Recaudado (Financiero) ── */}
      {showRevenueModal && (
        <>
          <div className="overlay" onClick={() => setShowRevenueModal(false)} />
          <div className="modal-responsive">
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">💰 Finanzas</h2>
              <button className="modal-responsive-close" onClick={() => setShowRevenueModal(false)}>✕</button>
            </div>
            <div className="modal-responsive-body">
              {/* Period selector */}
              <div className="stats-segmented-control">
                {['day', 'week', 'month'].map(p => (
                  <button
                    key={p}
                    className={`stats-segmented-btn${period === p ? ' active' : ''}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
                  </button>
                ))}
              </div>

              {period === 'day' && (
                <div className="stats-date-picker" onClick={() => { setViewDate(new Date(selectedDate + 'T00:00:00')); setShowCalendar(true); }}>
                  <div>
                    <div className="stats-date-picker-label">Fecha de Análisis</div>
                    <div className="stats-date-picker-value">{selectedDate.split('-').reverse().join(' / ')}</div>
                  </div>
                  <span style={{ fontSize: '24px', opacity: 0.8 }}>📅</span>
                </div>
              )}

              {/* Content removed and moved to top-level */}


              <div className="stats-scroll-content">
                {/* Revenue hero card */}
                <div className="stats-card main-stats-card mb-xl">
                  <div className="stats-card-label">Total Recaudado · {periodLabel}</div>
                  <div className="stats-card-value">{formatCOP(stats.totalRevenue)}</div>
                  <div className="stats-card-sub">Solo pedidos completados / pagados</div>
                </div>

                {/* Revenue distribution chart */}
                <h3 className="stats-section-title">Distribución por Producto (ingresos $)</h3>
                <div className="chart-container" style={{ background: 'var(--color-bg-soft)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                  {stats.revenueChartData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie 
                          data={stats.revenueChartData} 
                          dataKey="ingresos" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={50} 
                          outerRadius={70} 
                          stroke="none" 
                          paddingAngle={5}
                          animationDuration={500}
                          animationBegin={0}
                        >
                          {stats.revenueChartData.map((_, index) => (
                            <Cell key={`cell-r-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [formatCOP(value), 'Ingresos']}
                          wrapperStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-chart">Sin datos para este período</div>
                  )}
                </div>

                {/* Revenue table */}
                {stats.revenueChartData?.length > 0 && (
                  <div className="revenue-table">
                    <div className="revenue-table-header">
                      <span>Producto</span>
                      <span>Uds</span>
                      <span>Ingresos</span>
                    </div>
                    {stats.revenueChartData.map((p, i) => (
                      <div key={i} className="revenue-table-row">
                        <span className="rev-product-name">{p.name}</span>
                        <span className="rev-qty">{p.quantity}</span>
                        <span className="rev-amount">{formatCOP(p.ingresos)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL: Top Productos (Ranking Operativo) ── */}
      {showTopProductsModal && (
        <>
          <div className="overlay" onClick={() => setShowTopProductsModal(false)} />
          <div className="modal-responsive">
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">🏆 Ranking de Productos</h2>
              <button className="modal-responsive-close" onClick={() => setShowTopProductsModal(false)}>✕</button>
            </div>
            <div className="modal-responsive-body">
              <div className="stats-segmented-control">
                {['day', 'week', 'month'].map(p => (
                  <button
                    key={p}
                    className={`stats-segmented-btn${period === p ? ' active' : ''}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
                  </button>
                ))}
              </div>

              <div className="stats-scroll-content">
                {stats.top.length > 0 ? (
                  <>
                    {/* Podio top 3 */}
                    <h3 className="stats-section-title">🥇 Más Vendidos</h3>
                    <div className="podium-grid">
                      {[1, 0, 2].map((rankIdx) => {
                        const product = stats.top[rankIdx];
                        if (!product) return <div key={rankIdx} className="podium-empty" />;
                        const medals = ['🥇', '🥈', '🥉'];
                        const positions = [2, 1, 3]; // visual order: silver left, gold center, bronze right
                        const positionIdx = [1, 0, 2];
                        return (
                          <div
                            key={rankIdx}
                            className={`podium-card podium-pos-${positionIdx[rankIdx] + 1}`}
                          >
                            <span className="podium-medal">{medals[rankIdx]}</span>
                            <span className="podium-name">{product.name}</span>
                            <span className="podium-qty">{product.quantity} uds</span>
                            <span className="podium-revenue">{formatCOP(product.revenue)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resto del ranking (4 y 5) */}
                    {stats.top.slice(3).length > 0 && (
                      <>
                        <h3 className="stats-section-title" style={{ marginTop: 'var(--space-lg)' }}>Posiciones 4–5</h3>
                        <div className="stats-card">
                          <ul className="stats-list">
                            {stats.top.slice(3).map((p, i) => (
                              <li key={i} className="stats-list-item">
                                <span className="ranking-pos">#{i + 4}</span>
                                <span className="stats-item-name">{p.name}</span>
                                <span className="stats-item-val">{p.quantity} uds</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Menos vendidos */}
                    <h3 className="stats-section-title" style={{ marginTop: 'var(--space-lg)' }}>📉 Necesitan Impulso</h3>
                    <div className="stats-card" style={{ borderLeft: '4px solid #ffb74d' }}>
                      <ul className="stats-list">
                        {stats.bottom.map((p, i) => (
                          <li key={i} className="stats-list-item">
                            <span className="stats-item-name" style={{ color: 'var(--color-text-muted)' }}>{p.name}</span>
                            <span className="stats-item-val" style={{ color: '#f57c00' }}>{p.quantity} uds</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="dash-empty-chart" style={{ marginTop: 'var(--space-xl)' }}>
                    <span>📊</span>
                    <p>Sin ventas registradas para este período</p>
                    <button className="btn btn-soft" onClick={() => setPeriod('month')}>Ver este mes</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL: Calendario (Selección de fecha) ── */}
      {showCalendar && (
        <>
          <div className="overlay" style={{ zIndex: 100000 }} onClick={() => setShowCalendar(false)} />
          <div className="modal-responsive" style={{ zIndex: 100001, maxWidth: '400px' }}>
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">📅 Seleccionar Fecha</h2>
              <button className="modal-responsive-close" onClick={() => setShowCalendar(false)}>✕</button>
            </div>
            <div className="modal-responsive-body">
              <div className="calendar-header" style={{ width: '100%' }}>
                <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>❮</button>
                <div className="calendar-month-title">
                  {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </div>
                <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>❯</button>
              </div>
              <div className="calendar-weekdays" style={{ width: '100%' }}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                  <div key={d} className="weekday-header">{d}</div>
                ))}
              </div>
              <div className="calendar-grid" style={{ width: '100%' }}>
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={i} className="calendar-day empty" />;
                  const dStr = date.toISOString().split('T')[0];
                  return (
                    <div
                      key={i}
                      className={`calendar-day${dStr === selectedDate ? ' active' : ''}${dStr === new Date().toISOString().split('T')[0] ? ' today' : ''}`}
                      onClick={() => handleDateSelect(date)}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-primary w-full mt-lg" onClick={() => setShowCalendar(false)}>Confirmar</button>
            </div>
          </div>
        </>
      )}

      {!showRevenueModal && !showTopProductsModal && !showCalendar && <BottomNav />}

    </div>
  );
}
