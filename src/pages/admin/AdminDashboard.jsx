// src/pages/admin/AdminDashboard.jsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrders, useStoreConfig } from '../../hooks/useOrders';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useProducts } from '../../hooks/useProducts';
import { useNotifications } from '../../context/NotificationContext';
import { formatCOP, isEffectiveOrder, getOrderDate, isOrderFromToday } from '../../utils/formatters';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import './AdminDashboard.css';

const PIE_COLORS = ['#1d3b1f', '#2f5b2d', '#42803b', '#62a84a', '#8bd165'];

export default function AdminDashboard() {
  const { orders, loading } = useOrders();
  const { products } = useProducts();
  const { config } = useStoreConfig();
  const { subscriptions, activeSubscriptions, totalMonthly, updateSubscription } = useSubscriptions();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const handleMarkAsPaid = async (sub) => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    try {
      await updateSubscription(sub.id, { lastPaidMonth: currentMonthKey });
      showToast('Pago registrado correctamente', 'success');
    } catch (err) {
      showToast('Error al registrar pago', 'error');
    }
  };

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


  const stats = useMemo(() => {
    if (!orders.length) return { chartData: [], totalRevenue: 0, todayCount: 0, pendingCount: 0, top: [], bottom: [], premium: null };

    const calc = {};
    let totalRevenue = 0;
    let premiumProd = null;
    let todayCount = 0;
    let pendingCount = 0;

    const now = new Date();
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
      // Usa las funciones compartidas desde formatters.js
      const orderDate = getOrderDate(o);
      const orderDayStart = new Date(orderDate);
      orderDayStart.setHours(0, 0, 0, 0);

      const inPeriod = period === 'day'
        ? orderDayStart.getTime() === periodStart.getTime()
        : orderDate >= periodStart;
      const isToday = isOrderFromToday(o);
      const isEffective = isEffectiveOrder(o);
      const isPending = isToday && o.status === 'pending';
      if (isPending) pendingCount++;

      if (isEffective && inPeriod) {
        // Usar totalWithDelivery si existe (pedidos nuevos), si no total (retrocompatibilidad)
        totalRevenue += (o.totalWithDelivery || o.total || 0);
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

      if (isToday && isEffective) todayCount++;
    });

    const allProducts = Object.values(calc).sort((a, b) => b.revenue - a.revenue);

    const revenueChartData = allProducts.map(p => ({
      name: p.name,
      ingresos: p.revenue,
      quantity: p.quantity
    }));

    return {
      chartData: allProducts
        .slice(0, 6)
        .map(p => ({ name: p.name.length > 12 ? p.name.substring(0, 10) + '...' : p.name, ventas: p.quantity })),
      revenueChartData,
      totalRevenue,
      todayCount,
      pendingCount,
      top: allProducts.slice(0, 5),
      bottom: [...allProducts].reverse().slice(0, 5),
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
    <div className="flex-center w-full" style={{ height: '80vh' }}>
      <SkeletonDashboard />
    </div>
  );

  const periodLabel = period === 'day' ? selectedDate.split('-').reverse().join('/') : period === 'week' ? 'Últimos 7 días' : 'Este mes';

  return (
    <div className="admin-dashboard animate-fade-in">
      {/* ── Dashboard Hero ── */}

        {/* ── Dashboard Hero ── */}
        <div className="inv-hero">
          <div className="inv-hero-inner">
            <div className="inv-hero-top">
              <div className="inv-hero-title-area">
                <span className="inv-hero-label">Panel Central</span>
                <h1 className="inv-hero-title">¡Hola, Admin! 👋</h1>
                <span className="inv-hero-date">
                  {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>

            <div className="hero-stats-row">
              <div className="hero-stat-btn" onClick={() => setShowRevenueModal(true)}>
                <span className="hero-stat-icon">💰</span>
                <div className="hero-stat-info">
                  <span className="hero-stat-val">{formatCOP(stats.totalRevenue)}</span>
                  <span className="hero-stat-lab">
                    {period === 'day' 
                      ? (selectedDate === new Date().toISOString().split('T')[0] ? 'Ventas Hoy' : `Ventas ${selectedDate.split('-').reverse().join('/')}`)
                      : (period === 'week' ? 'Ventas Semana' : 'Ventas Mes')
                    }
                  </span>
                </div>
              </div>
              <Link to="/admin/orders" className={`hero-stat-btn ${stats.pendingCount > 0 ? 'urgent' : ''}`}>
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
          
          {/* Pending orders alert (Prominent Elite Design) */}
          {stats.pendingCount > 0 && (
            <div style={{ marginBottom: '16px', padding: '0 4px', position: 'relative', zIndex: 20 }}>
              <Link to="/admin/orders" className="elite-alert-banner">
                <div className="elite-alert-glow"></div>
                <div className="elite-alert-icon-wrapper">
                  <span className="elite-alert-icon">🔔</span>
                  <span className="elite-alert-badge">{stats.pendingCount}</span>
                </div>
                <div className="elite-alert-body">
                  <span className="elite-alert-title">Pedidos Pendientes</span>
                  <span className="elite-alert-subtitle">Requieren tu atención inmediata</span>
                </div>
                <div className="elite-alert-action">
                  <span>Gestionar</span>
                  <span className="elite-alert-arrow">➔</span>
                </div>
              </Link>
            </div>
          )}

          {/* Smart Promotions Grid (Responsive) */}
          {activePromos.length > 0 && (
            <div className="dash-promos-container">
              <div className="dash-section-header">
                <h2 className="dash-section-title">📢 Promociones Activas</h2>
                <Link to="/admin/offers" className="dash-section-action">
                  Gestionar ❯
                </Link>
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
            </div>
          )}

          {/* Performance Preview (Rendimiento) - MOVED UP */}
          <div className="dash-section-header" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
            <h2 className="dash-section-title">📊 Rendimiento</h2>
            <button
              className="dash-section-action"
              onClick={() => setShowRevenueModal(true)}
            >
              Ver más ❯
            </button>
          </div>

          {stats.chartData.length > 0 ? (
            <div className="dash-metrics-grid" onClick={() => setShowRevenueModal(true)} style={{ marginBottom: '16px' }}>
              <div className="dash-metric-item">
                <span className="metric-icon">📦</span>
                <span className="metric-val">{stats.chartData.reduce((acc, curr) => acc + curr.ventas, 0)}</span>
                <span className="metric-lab">Ventas Totales</span>
              </div>
              <div className="dash-metric-item highlight">
                <span className="metric-icon">💰</span>
                <span className="metric-val">{formatCOP(stats.totalRevenue)}</span>
                <span className="metric-lab">Ingresos Brutos</span>
              </div>
              <div className="dash-metric-item">
                <span className="metric-icon">📈</span>
                <span className="metric-val">
                  {stats.chartData.reduce((acc, curr) => acc + curr.ventas, 0) > 0 
                    ? formatCOP(stats.totalRevenue / stats.chartData.reduce((acc, curr) => acc + curr.ventas, 0)) 
                    : '$0'}
                </span>
                <span className="metric-lab">Ticket Promedio</span>
              </div>
            </div>
          ) : (
            <div className="dash-performance-empty">
              <div className="empty-content-card">
                <div className="empty-visual">
                  <div className="pulse-bg"></div>
                  <span className="empty-icon">📈</span>
                </div>
                <div className="empty-info">
                  <h3 className="empty-title">Esperando tu primera venta</h3>
                  <p className="empty-text">Las estadísticas de rendimiento cobran vida cuando tus clientes realizan pedidos. ¡Pronto verás aquí tus resultados!</p>
                </div>
                <button 
                  className="admin-btn-elite small-elite" 
                  onClick={() => setShowRevenueModal(true)}
                >
                  <span className="btn-icon">🔍</span>
                  Explorar Historial
                </button>
              </div>
            </div>
          )}

          {/* Ranking Preview (Top Productos) - MOVED UP */}
          {stats.chartData.length > 0 && (
            <div className="dash-ranking-preview" style={{ marginBottom: '16px' }}>
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

          {/* Upcoming Payments Alert - MOVED DOWN */}
          {(() => {
            const now = new Date();
            const today = now.getDate();
            const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
            
            const upcoming = subscriptions.filter(s => {
              const diff = s.dayOfMonth - today;
              return s.active && diff <= 3 && s.lastPaidMonth !== currentMonthKey;
            }).sort((a,b) => a.dayOfMonth - b.dayOfMonth);

            if (upcoming.length === 0) return null;

            return (
              <>
                <div className="dash-section-header mt-lg" style={{ paddingTop: '8px' }}>
                  <h2 className="dash-section-title">📅 Pagos Próximos</h2>
                  <Link to="/admin/subscriptions" className="dash-section-action">Gestionar ❯</Link>
                </div>
                <div className="dash-upcoming-list">
                  {upcoming
                    .map(sub => {
                      const diff = sub.dayOfMonth - new Date().getDate();
                      const isOverdue = diff < 0;
                      const isToday = diff === 0;

                      return (
                        <div 
                          key={sub.id} 
                          className={`dash-sub-item ${isOverdue ? 'overdue' : isToday ? 'today' : ''}`}
                          onClick={() => navigate('/admin/subscriptions')}
                        >
                          <div className="sub-item-info">
                            <span className="sub-item-name">{sub.name}</span>
                            <span className="sub-item-date">
                              {isOverdue ? `¡VENCIDO el día ${sub.dayOfMonth}! 🛑` : isToday ? 'VENCE HOY ⚠️' : `Vence el día ${sub.dayOfMonth}`}
                            </span>
                          </div>
                          <div className="sub-item-right-area">
                            <div className="sub-item-amount">{formatCOP(sub.amount)}</div>
                            <button 
                              className="dash-pay-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsPaid(sub);
                              }}
                            >
                              PAGAR ✓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            );
          })()}
        </div>

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
                      {/* Plata (Top 2) */}
                      {stats.top[1] && (
                        <div className="podium-card podium-silver">
                          <span className="podium-medal">🥈</span>
                          <span className="podium-name">{stats.top[1].name}</span>
                          <span className="podium-qty">{stats.top[1].quantity} uds</span>
                          <span className="podium-revenue">{formatCOP(stats.top[1].revenue)}</span>
                        </div>
                      )}
                      
                      {/* Oro (Top 1) */}
                      {stats.top[0] && (
                        <div className="podium-card podium-gold">
                          <span className="podium-medal">🥇</span>
                          <span className="podium-name">{stats.top[0].name}</span>
                          <span className="podium-qty">{stats.top[0].quantity} uds</span>
                          <span className="podium-revenue">{formatCOP(stats.top[0].revenue)}</span>
                        </div>
                      )}

                      {/* Bronce (Top 3) */}
                      {stats.top[2] && (
                        <div className="podium-card podium-bronze">
                          <span className="podium-medal">🥉</span>
                          <span className="podium-name">{stats.top[2].name}</span>
                          <span className="podium-qty">{stats.top[2].quantity} uds</span>
                          <span className="podium-revenue">{formatCOP(stats.top[2].revenue)}</span>
                        </div>
                      )}
                    </div>

                    {/* Resto del ranking (4 y 5) */}
                    {stats.top.slice(3).length > 0 && (
                      <div className="ranking-extra-section">
                        <h3 className="stats-section-title">Posiciones 4–5</h3>
                        <div className="stats-list-card">
                          <ul className="stats-ranking-list">
                            {stats.top.slice(3).map((p, i) => (
                              <li key={i} className="stats-ranking-item">
                                <div className="rank-pos-badge">#{i + 4}</div>
                                <span className="rank-item-name">{p.name}</span>
                                <span className="rank-item-val"><strong>{p.quantity}</strong> uds</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Menos vendidos */}
                    <div className="needs-boost-section">
                      <h3 className="stats-section-title">📉 Necesitan Impulso</h3>
                      <div className="stats-list-card needs-boost-card">
                        <ul className="stats-ranking-list">
                          {stats.bottom.map((p, i) => (
                            <li key={i} className="stats-ranking-item">
                              <span className="rank-item-name">{p.name}</span>
                              <span className="rank-item-val boost-val"><strong>{p.quantity}</strong> uds</span>
                            </li>
                          ))}
                        </ul>
                      </div>
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


    </div>
  );
}
