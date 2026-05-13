import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from './context/CartContext';
import { useStoreContext } from './context/StoreContext';
import { useAuth } from './context/AuthContext';
import CartDrawer from './components/cart/CartDrawer';
import { useNotifications } from './context/NotificationContext';
import ToastContainer from './components/ui/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import AdminBackFAB from './components/ui/AdminBackFAB';
import OfflineBanner from './components/ui/OfflineBanner';
import ForceUpdateOverlay from './components/ui/ForceUpdateOverlay';

// Premium Savit Loader para el Suspense / Router Transitions
const FullPageLoader = () => {
  const isDashboard = window.location.pathname.startsWith('/admin');
  
  return (
    <div className={`app-loader-overlay ${isDashboard ? 'admin-page' : ''}`}>
      <div className="app-loader-content">
        <div className="app-loader-logo-wrap">
          <img src="/logo.png" alt="Sávit Logo" className="app-loader-brand-logo" />
        </div>
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

// Pages Admin (Lazy)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminIngredients = lazy(() => import('./pages/admin/AdminIngredients'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));
const AdminOffers = lazy(() => import('./pages/admin/AdminOffers'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminGate = lazy(() => import('./components/layout/AdminGate'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const ClientLayout = lazy(() => import('./components/layout/ClientLayout'));

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

  useLayoutEffect(() => {
    // Inicializar Dark Mode global
    if (localStorage.getItem('savit_dark_mode') === 'true') {
      document.body.classList.add('dark-mode');
    }
  }, []);

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
    <ErrorBoundary>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          
          <Route path="/home" element={<ClientLayout><ClientHome /></ClientLayout>} />
          <Route path="/catalog" element={<ClientLayout><Home /></ClientLayout>} />
          <Route path="/checkout" element={<ClientLayout><Checkout /></ClientLayout>} />
          <Route path="/orders"    element={<ClientLayout><Orders /></ClientLayout>} />
          <Route path="/favorites" element={<ClientLayout><Favorites /></ClientLayout>} />
          <Route path="/order-confirm" element={<ClientLayout><OrderConfirm /></ClientLayout>} />

          {/* Admin Routes wrapped in Gate and Layout */}
          <Route path="/admin" element={<AdminGate><AdminLayout><AdminDashboard /></AdminLayout></AdminGate>} />
          <Route path="/admin/orders" element={<AdminGate><AdminLayout><AdminOrders /></AdminLayout></AdminGate>} />
          <Route path="/admin/products" element={<AdminGate><AdminLayout><AdminProducts /></AdminLayout></AdminGate>} />
          <Route path="/admin/ingredients" element={<AdminGate><AdminLayout><AdminIngredients /></AdminLayout></AdminGate>} />
          <Route path="/admin/offers" element={<AdminGate><AdminLayout><AdminOffers /></AdminLayout></AdminGate>} />
          <Route path="/admin/config" element={<AdminGate><AdminLayout><AdminConfig /></AdminLayout></AdminGate>} />
          <Route path="/admin/subscriptions" element={<AdminGate><AdminLayout><AdminSubscriptions /></AdminLayout></AdminGate>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {isCartOpen && (
        <ErrorBoundary>
          <CartDrawer onClose={() => setCartOpen(false)} />
        </ErrorBoundary>
      )}
      <AdminBackFAB />
      <OfflineBanner />
      <ForceUpdateOverlay />
      <ToastContainer />
    </ErrorBoundary>
  );
}
