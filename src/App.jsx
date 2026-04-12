import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from './context/CartContext';
import { useStoreContext } from './context/StoreContext';
import { useAuth } from './context/AuthContext';
import CartDrawer from './components/cart/CartDrawer';
import { useNotifications } from './context/NotificationContext';
import ToastContainer from './components/ui/ToastContainer';
import Gamification from './components/ui/Gamification';

// Premium Savit Loader para el Suspense / Router Transitions
const FullPageLoader = () => {
  // Usamos window.location.pathname para una detección inmediata incluso antes de que el hook de router se actualice
  const isDashboard = window.location.pathname.startsWith('/admin');
  
  return (
    <div className={`app-loader-overlay ${isDashboard ? 'admin-page' : 'client-page'}`}>
      <div className="app-loader-content">
        <div className="app-loader-leaf-container">
          <svg viewBox="0 0 24 24" className="app-loader-leaf" fill="currentColor">
            <path d="M17.5,7.5c-4-4-10.5-6.5-14.5-5.5c0,0,1.5,5.5,5.5,9.5s9.5,5.5,9.5,5.5C19,13,21.5,11.5,17.5,7.5z" style={{ color: 'var(--color-accent)' }} />
            <path d="M6.5,16.5c4,4,10.5,6.5,14.5,5.5c0,0-1.5-5.5-5.5-9.5s-9.5-5.5-9.5-5.5C5,11,2.5,12.5,6.5,16.5z" style={{ color: 'var(--color-primary)' }} />
          </svg>
        </div>
        <h2 className="app-loader-text">Savit</h2>
        <div className="app-loader-progress">
          <div className="app-loader-bar"></div>
        </div>
      </div>
    </div>
  );
};

// Pages Client (Lazy)
const Welcome = lazy(() => import('./pages/Welcome'));
const ClientHome = lazy(() => import('./pages/ClientHome'));
const Home = lazy(() => import('./pages/Home'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirm = lazy(() => import('./pages/OrderConfirm'));
const Orders = lazy(() => import('./pages/Orders'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Rewards   = lazy(() => import('./pages/Rewards'));

// Pages Admin (Lazy)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminIngredients = lazy(() => import('./pages/admin/AdminIngredients'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));
const AdminOffers = lazy(() => import('./pages/admin/AdminOffers'));
const AdminAwards = lazy(() => import('./pages/admin/AdminAwards'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminGate = lazy(() => import('./components/layout/AdminGate'));

export default function App() {
  const { isCartOpen, setCartOpen } = useCart();
  const { loading: storeLoading } = useStoreContext();
  const { user, loading: authLoading, isGuest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasInitialRedirected = useRef(false);

  // Gestionar clase global en body para layouts administrativos de forma sincrónica
  useLayoutEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      document.body.classList.add('admin-page');
    } else {
      document.body.classList.remove('admin-page');
    }
  }, [location.pathname]);

  // Lógica de redirección al recargar (montaje inicial)
  useEffect(() => {
    // Esperamos a que terminen de cargar tanto la configuración como la sesión
    if (!storeLoading && !authLoading && !hasInitialRedirected.current) {
      if (user) {
        if (user.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/home');
        }
      } else if (isGuest) {
        navigate('/home');
      } else {
        // No logueado y no invitado -> Inicio principal
        navigate('/');
      }
      hasInitialRedirected.current = true;
    }
  }, [storeLoading, authLoading, user, isGuest, navigate]);

  if (storeLoading || authLoading) return <FullPageLoader />;

  return (
    <>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          
          <Route path="/home" element={<ClientHome />} />
          <Route path="/catalog" element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders"    element={<Orders />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/rewards"   element={<Rewards />} />
          <Route path="/order-confirm" element={<OrderConfirm />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
          <Route path="/admin/orders" element={<AdminGate><AdminOrders /></AdminGate>} />
          <Route path="/admin/products" element={<AdminGate><AdminProducts /></AdminGate>} />
          <Route path="/admin/ingredients" element={<AdminGate><AdminIngredients /></AdminGate>} />
          <Route path="/admin/offers" element={<AdminGate><AdminOffers /></AdminGate>} />
          <Route path="/admin/awards" element={<AdminGate><AdminAwards /></AdminGate>} />
          <Route path="/admin/config" element={<AdminGate><AdminConfig /></AdminGate>} />
          <Route path="/admin/subscriptions" element={<AdminGate><AdminSubscriptions /></AdminGate>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {isCartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      <ToastContainer />
      <Gamification />
    </>
  );
}
