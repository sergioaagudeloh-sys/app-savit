import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { useCategoryManager } from '../hooks/useProducts';
import { useStoreConfig } from '../hooks/useOrders';
import { CategorySkeleton } from '../components/ui/Skeleton';
import { useNotifications } from '../context/NotificationContext';
import HealthyTip from '../components/ui/HealthyTip';
import StoreStatusBanner from '../components/ui/StoreStatusBanner';
import { formatCOP } from '../utils/formatters';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import '../components/ui/CategoryPills.css';
import SEO from '../components/common/SEO';
import './ClientHome.css';

import { playPromoSound } from '../utils/audio';
import { vibrateTap } from '../utils/haptics';

export default function ClientHome() {
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);

  useBodyScrollLock(showPromoModal);

  const navigate = useNavigate();
  const { addItem, setCartOpen } = useCart();
  const { customer } = useCustomer();
  const { showToast } = useNotifications();
  const { categories: customCats, loading } = useCategoryManager();
  const { config } = useStoreConfig();

  const promoEnabled = localStorage.getItem('savit_promo_enabled') !== 'false';
  const activePromos = config?.promos?.filter(p => p.active) || (config?.promo?.active ? [config.promo] : []);
  const displayCategories = customCats;
  const greetingName = customer?.name && customer.name !== 'Visitante' && customer.phone !== 'guest'
    ? customer.name.split(' ')[0]
    : 'visitante';


  // Auto-play carousel
  useEffect(() => {
    if (activePromos.length > 1) {
      const interval = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % activePromos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activePromos.length]);

  // Scroll carousel on slide change
  useEffect(() => {
    if (carouselRef.current && activePromos.length > 0) {
      const slideWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({ left: activeSlide * slideWidth, behavior: 'smooth' });
    }
  }, [activeSlide, activePromos.length]);

  const handlePromoClick = (promo) => {
    setSelectedPromo(promo);
    setShowPromoModal(true);
    playPromoSound();
  };

  const handleCategoryClick = (category) => {
    navigate('/catalog', { state: { category: category.name }, viewTransition: true });
  };

  return (
    <div className="app-container client-home-page">
      <SEO 
        title={`Sávit - ${greetingName === 'visitante' ? 'Mercado Saludable' : 'Hola ' + greetingName}`}
        description="Explora las mejores ofertas en productos saludables, naturales y nutritivos. Tu bienestar es nuestra prioridad."
      />

      <main className="page-content">
        {/* ── Promotional Carousel ── Full-bleed, top of page */}
        {promoEnabled && (
          <section className="promo-carousel-section">
            {activePromos.length > 0 ? (
              <>
                <div className="promo-carousel-track" ref={carouselRef}>
                  {activePromos.map((promo, idx) => (
                    <div key={idx} className="promo-slide" onClick={() => handlePromoClick(promo)}>
                      {promo.imageUrl ? (
                        <img className="promo-slide-img" src={promo.imageUrl} alt={promo.title} />
                      ) : (
                        <div className="promo-slide-gradient" />
                      )}
                      <div className="promo-slide-overlay">
                        <span className="promo-slide-badge">🔥 Oferta</span>
                        <h3 className="promo-slide-title">{promo.title}</h3>
                        <button className="promo-slide-cta">Ver oferta →</button>
                      </div>
                    </div>
                  ))}
                </div>
                {activePromos.length > 1 && (
                  <div className="carousel-dots">
                    {activePromos.map((_, i) => (
                      <button
                        key={i}
                        className={`dot${activeSlide === i ? ' active' : ''}`}
                        onClick={() => setActiveSlide(i)}
                        aria-label={`Oferta ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="promo-empty-fallback">
                <div className="promo-empty-overlay" />
                <div className="promo-empty-content">
                  <span className="promo-empty-badge">Sávit Premium</span>
                  <h3 className="promo-empty-title">Nutrición & Bienestar</h3>
                  <p className="promo-empty-text">¡Aquí verás nuestras próximas ofertas! Mientras tanto, ¡explora salud!</p>
                  <button className="promo-empty-cta" onClick={() => navigate('/catalog', { viewTransition: true })}>Ver catálogo 🛒</button>
                </div>
              </div>
            )}
          </section>
        )}

        <StoreStatusBanner isOpen={config?.isOpen !== false} variant="home" />

        {/* ── Main Content Card ── */}
        <div className="home-main-card">
          {/* Greeting */}
          <div className="home-greeting-group">
            <h1 className="home-greeting-title">Hola, {greetingName} 🌿</h1>
            <p className="home-greeting-subtitle">Nutre tu cuerpo con lo mejor de la naturaleza.</p>
          </div>

          {/* Categories */}
          {(loading || displayCategories.length > 0) && (
            <>
              <div className="home-section-header">
                <h2 className="home-section-title">Nuestras Categorías</h2>
                <span className="home-section-action" onClick={() => navigate('/catalog', { viewTransition: true })}>
                  Ver catálogo ❯
                </span>
              </div>
              <div className="featured-categories">
                {loading ? (
                  [...Array(4)].map((_, i) => <CategorySkeleton key={i} />)
                ) : displayCategories.length > 0 ? (
                  displayCategories.map(cat => (
                    <div
                      key={cat.id || cat.name}
                      className="category-pill"
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <span className="pill-icon">{cat.icon || '🏷️'}</span>
                      <span className="pill-name">{cat.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
                    Explora nuestro catálogo para ver los productos
                  </p>
                )}
              </div>
            </>
          )}
          {/* ── Healthy Tips Integrated ── */}
          <div className="home-section-header" style={{ marginTop: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <h2 className="home-section-title">Consejos Saludables</h2>
          </div>
        </div>

        <HealthyTip />

        {/* ── Why Savit ── */}
        <section className="why-savit-container">
          <div className="home-section-header home-section-header--centered">
            <h2 className="home-section-title">¿Por qué Savit?</h2>
            <p className="home-section-subtitle">Tu salud y bienestar en cada pedido</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon-wrapper">🚛</div>
              <div className="feature-content">
                <h3 className="feature-title">Envío Rápido</h3>
                <p className="feature-desc">En tiempo récord</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-wrapper">🥇</div>
              <div className="feature-content">
                <h3 className="feature-title">Alta Calidad</h3>
                <p className="feature-desc">Lo mejor para ti</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-wrapper">🌱</div>
              <div className="feature-content">
                <h3 className="feature-title">100% Natural</h3>
                <p className="feature-desc">Directo del origen</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon-wrapper">📱</div>
              <div className="feature-content">
                <h3 className="feature-title">Soporte Directo</h3>
                <p className="feature-desc">Vía WhatsApp</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="home-cta-container">
          <button className="button-full-card" onClick={() => navigate('/catalog', { viewTransition: true })}>
            <span className="emoji-large">🛒</span>
            Ir al Catálogo de Productos
          </button>
        </div>
      </main>

      {/* ── Promo Modal — namespace .promo-modal-* para evitar colisiones CSS ── */}
      {showPromoModal && selectedPromo && (
        <>
          {/* overlay propio: no usa .overlay global para no interferir con body:has() */}
          <div className="promo-modal-overlay" onClick={() => setShowPromoModal(false)} />
          <div className="promo-modal-dialog">
            <div className="promo-modal-wrapper">
              <button className="promo-modal-close" onClick={() => { vibrateTap(); setShowPromoModal(false); }}>✕</button>

              {selectedPromo.imageUrl ? (
                <div className="promo-modal-hero">
                  <img src={selectedPromo.imageUrl} alt={selectedPromo.title} />
                </div>
              ) : (
                <div className="promo-modal-placeholder">🎉</div>
              )}

              <div className="promo-modal-body">
                <h3 className="promo-modal-title">{selectedPromo.title}</h3>
                <span className="promo-tag">🔥 Oferta Especial</span>
                <p className="promo-modal-desc">
                  {selectedPromo.description || 'Sin descripción disponible.'}
                </p>

                <div className="promo-modal-footer">
                  {(selectedPromo.promoPrice || selectedPromo.price) && (
                    <div className="promo-modal-price-group">
                      <div className="promo-modal-price-label">
                        {selectedPromo.promoPrice ? 'Precio Especial' : 'Precio'}
                      </div>
                      <div className="promo-modal-price-value">
                        {formatCOP(selectedPromo.promoPrice || selectedPromo.price)}
                      </div>
                    </div>
                  )}
                  <div className="promo-modal-action">
                    <button
                      className="btn btn-primary w-full"
                      style={{ height: '48px', fontSize: '1.05rem' }}
                      onClick={() => {
                        if (selectedPromo.productId) {
                          addItem({
                            id: selectedPromo.productId,
                            name: selectedPromo.title.replace('¡Super Oferta: ', '').replace('!', ''),
                            price: Number(selectedPromo.promoPrice || selectedPromo.price),
                            imageUrl: selectedPromo.imageUrl,
                          });
                          setShowPromoModal(false);
                          setCartOpen(true);
                          showToast('¡Producto en promoción agregado!', 'success');
                        } else {
                          navigate('/catalog', { state: { search: selectedPromo.title }, viewTransition: true });
                        }
                      }}
                    >
                      Comprar Ahora 🛒
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
