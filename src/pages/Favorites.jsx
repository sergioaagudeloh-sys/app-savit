// src/pages/Favorites.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import ProductCard from '../components/product/ProductCard';
import Mascot from '../components/ui/Mascot';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/layout/Toast';
import './Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const { setCartOpen } = useCart();
  const { favorites, clearFavorites } = useFavorites();
  const { toasts, showToast } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="app-container favorites-page">
      <Header onCartOpen={() => setCartOpen(true)} />

      <main className="page-content">
        {/* ── Hero ── */}
        <div className="fav-hero">
          <div className="fav-hero-content">
            <span className="fav-hero-label">Tu lista personal</span>
            <h1 className="fav-hero-title">
              💚 Favoritos
            </h1>
            {favorites.length > 0 && (
              <span className="fav-hero-count">
                {favorites.length} producto{favorites.length !== 1 ? 's' : ''} guardado{favorites.length !== 1 ? 's' : ''}
              </span>
            )}
            {favorites.length === 0 && (
              <p className="fav-hero-subtitle">Guarda tus productos preferidos aquí.</p>
            )}
          </div>
        </div>

        {favorites.length === 0 ? (
          /* ── Empty state ── */
          <div className="fav-empty">
            <div className="fav-empty-illustration">🤍</div>
            <h3 className="fav-empty-title">Nada guardado aún</h3>
            <p className="fav-empty-desc">
              Toca el corazón en cualquier producto del catálogo para añadirlo aquí.
            </p>
            <div className="fav-empty-tip">
              <span className="fav-empty-tip-icon">💡</span>
              Escucharás un sonido especial al guardar tu primer favorito.
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/catalog')}
            >
              🛒 Explorar Catálogo
            </button>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="fav-toolbar">
              <span className="fav-sort-label">Tus guardados</span>
              <button
                className="fav-clear-btn"
                onClick={() => setShowClearConfirm(true)}
              >
                🗑️ Limpiar
              </button>
            </div>

            {/* ── Grid ── */}
            <div className="fav-grid">
              {favorites.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onToast={showToast}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Confirm clear dialog ── */}
      {showClearConfirm && (
        <>
          <div className="overlay" onClick={() => setShowClearConfirm(false)} />
          <div className="modal-dialog">
            <div className="modal-content-wrapper">
              <div className="modal-content">
                <div className="modal-icon">🗑️</div>
                <h3 className="modal-title">¿Limpiar favoritos?</h3>
                <p className="modal-desc">Se eliminarán todos los productos de tu lista.</p>
                <div className="modal-actions">
                  <button className="btn btn-ghost flex-1" onClick={() => setShowClearConfirm(false)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary bg-danger flex-1"
                    onClick={() => { clearFavorites(); setShowClearConfirm(false); }}
                  >
                    Sí, limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Mascot page="favorites" />
      <BottomNav />
      <Toast toasts={toasts} />
    </div>
  );
}
