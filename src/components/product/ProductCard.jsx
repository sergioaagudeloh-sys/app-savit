// src/components/product/ProductCard.jsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import LottiePlayer from '../common/LottiePlayer';
import ProgressiveImage from '../ui/ProgressiveImage';
import { vibrateSuccess } from '../../utils/haptics';
import { formatCOP } from '../../utils/formatters';
import { useIngredients } from '../../hooks/useIngredients';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useAddToCartAnimation } from '../../hooks/useAddToCartAnimation';
import './ProductCard.css';

/**
 * ProductCard Component - Optimized for Premium PWA Experience
 */
export default function ProductCard({ product, onToast }) {
  const [showAdded, setShowAdded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { addItem, items, updateQty, setCartOpen } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { ingredients } = useIngredients();
  const { triggerFlyAnimation, triggerLeaveAnimation } = useAddToCartAnimation();
  // Ref para el botón de añadir (origen de la animación de vuelo)
  const addBtnRef = useRef(null);

  // State for customization (additions)
  const [selectedAdditions, setSelectedAdditions] = useState([]);
  const [showIngredientsMenu, setShowIngredientsMenu] = useState(false);
  const [modalQty, setModalQty] = useState(1);

  // Lock scroll when detail modal or ingredients menu is open
  useBodyScrollLock(showDetail || showIngredientsMenu);

  if (!product) return null;

  const isSoldOut = product.soldOut === true || product.stock === 0;
  const hasDiscount = product.discount > 0;
  const currentPrice = hasDiscount 
    ? product.price * (1 - product.discount / 100) 
    : product.price;

  // Find item if already in cart (without additions for the main catalog view)
  const itemInCart = useMemo(() => 
    items.find(i => i.id === product.id && (!i.selectedAdditions || i.selectedAdditions.length === 0)), 
    [items, product.id]
  );
  const quantity = itemInCart ? itemInCart.quantity : 0;

  const handleAdd = useCallback((e, additions = [], qty = 1) => {
    e?.stopPropagation();
    if (isSoldOut) return;

    // If it's a prepared product and we are clicking the card's button (no additions provided)
    // AND it has additions available, we should open the detail modal instead
    if (product.type === 'prepared' && additions.length === 0 && product.additions?.length > 0 && !showDetail) {
      setSelectedAdditions([]);
      setModalQty(1);
      setShowDetail(true);
      return;
    }

    try {
      const productToAdd = { 
        ...product, 
        selectedAdditions: additions,
        price: additions.reduce((sum, ing) => sum + (ing.price || 0), currentPrice)
      };
      
      addItem(productToAdd, qty);
      vibrateSuccess();
      setShowAdded(true);

      // 🚀 Animación de vuelo hacia el botón del carrito
      triggerFlyAnimation(addBtnRef.current, product.imageUrl || product.image);
      
      // Trigger Gamification Coin Throw
      window.dispatchEvent(new CustomEvent('savit_throw_coin'));
      
      if (typeof onToast === 'function') {
        onToast(`¡${product.name} agregado! 🛍`, 'success');
      }

      setTimeout(() => setShowAdded(false), 1500);
    } catch (err) {
      console.error("Error adding item:", err);
    }
  }, [product, isSoldOut, addItem, onToast, currentPrice, showDetail]);

  const handleUpdateQty = useCallback((newQty, e) => {
    e?.stopPropagation();
    if (newQty < 0) return;
    
    // Detect if increasing or decreasing for animations
    const targetId = itemInCart?.cartId || product.id;
    
    if (newQty > quantity) {
      // 🚀 Incrementar: Vuelo hacia el carrito + Moneda
      triggerFlyAnimation(addBtnRef.current, product.imageUrl || product.image);
      window.dispatchEvent(new CustomEvent('savit_throw_coin'));
      vibrateSuccess();
    } else if (newQty < quantity) {
      // 🔙 Decrementar: Salida del carrito
      triggerLeaveAnimation(addBtnRef.current, product.imageUrl || product.image);
    }

    updateQty(targetId, newQty, product.id);
  }, [itemInCart, product.id, updateQty, quantity, triggerFlyAnimation, triggerLeaveAnimation, product.imageUrl, product.image]);

  const handleToggleAddit = (ing) => {
    setSelectedAdditions(prev => {
      const isSelected = prev.find(i => i.id === ing.id);
      if (isSelected) return prev.filter(i => i.id !== ing.id);
      return [...prev, ing];
    });
  };

  const totalPrice = useMemo(() => {
    return selectedAdditions.reduce((sum, ing) => sum + (ing.price || 0), currentPrice);
  }, [selectedAdditions, currentPrice]);

  const handleToggleFav = (e) => {
    e?.stopPropagation();
    toggleFavorite(product);
  };

  const handleOpenDetail = () => {
    setSelectedAdditions([]);
    setModalQty(1);
    setShowDetail(true);
  };

  return (
    <>
      <div 
        className={`product-card ${isSoldOut ? 'product-card--soldout' : ''}`}
        onClick={handleOpenDetail}
      >
        {/* ── Favorite Button ── */}
        <button 
          className={`product-fav-btn ${isFavorite(product.id) ? 'product-fav-btn--active' : ''}`}
          onClick={handleToggleFav}
          aria-label="Guardar en favoritos"
        >
          {isFavorite(product.id) ? '❤️' : '🤍'}
        </button>

        {/* ── Badge ── */}
        {hasDiscount && !isSoldOut && (
          <div className="product-badge">
            -{product.discount}%
          </div>
        )}

        {/* ── Image Section ── */}
        <div className="product-image-wrapper">
          <ProgressiveImage 
            src={product.imageUrl || product.image} 
            alt={product.name} 
            placeholder="https://via.placeholder.com/20/e8f5e0/e8f5e0"
          />
          
          {/* Success Animation fue reemplazada por animación de vuelo hacia el carrito */}


          {isSoldOut && (
            <div className="product-soldout-overlay">
              <span>Agotado</span>
            </div>
          )}
        </div>

        {/* ── Info Section ── */}
        <div className="product-info">
          <span className="product-category">{product.category || 'Natural'}</span>
          <h3 className="product-name">{product.name}</h3>
          <p className="product-desc">{product.description}</p>
          
          {/* ── Pricing Section (Middle) ── */}
          <div className="product-price">
            {hasDiscount ? (
              <div className="price-stack">
                <span className="price-old">{formatCOP(product.price)}</span>
                <span className="price-current">{formatCOP(currentPrice)}</span>
              </div>
            ) : (
              <span className="price-main">{formatCOP(product.price)}</span>
            )}
          </div>

          {/* ── Actions Row (Bottom) ── */}
          <div 
            ref={addBtnRef}
            className="product-actions" 
            onClick={e => e.stopPropagation()}
          >
            {quantity > 0 && product.type !== 'prepared' ? (
              <div className="qty-counter">
                <button 
                  className="qty-control-btn" 
                  onClick={(e) => handleUpdateQty(quantity - 1, e)}
                  aria-label="Disminuir"
                >
                  −
                </button>
                <span className="qty-counter-value">{quantity}</span>
                <button 
                  className="qty-control-btn" 
                  onClick={(e) => handleUpdateQty(quantity + 1, e)}
                  disabled={product.stock !== undefined && quantity >= product.stock}
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
            ) : (
              <button 
                className={`product-add-btn ${showAdded ? 'success' : ''}`}
                onClick={(e) => product.type === 'prepared' ? setShowDetail(true) : handleAdd(e)}
                disabled={isSoldOut}
              >
                {showAdded ? '¡Listo!' : product.type === 'prepared' ? 'Personalizar' : 'Añadir'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Product Detail Modal (Float Menu) ── */}
      {showDetail && (
        <div className="product-detail-overlay" onClick={() => setShowDetail(false)}>
          <div className="product-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="detail-close" onClick={() => setShowDetail(false)}>✕</button>
            
            <div className="detail-hero">
              <ProgressiveImage 
                src={product.imageUrl || product.image} 
                alt={product.name}
              />
              {hasDiscount && <div className="detail-badge">-{product.discount}%</div>}
            </div>

            <div className="detail-content">
              <div className="detail-header-row">
                <div className="detail-title-group">
                  <span className="detail-category">{product.category}</span>
                  <h2 className="detail-title">{product.name}</h2>
                </div>
                <div className="detail-price-box">
                  {hasDiscount ? (
                    <>
                      <span className="detail-price-current">{formatCOP(totalPrice)}</span>
                      <span className="detail-price-old">{formatCOP(product.price)}</span>
                    </>
                  ) : (
                    <span className="detail-price-current">{formatCOP(totalPrice)}</span>
                  )}
                </div>
              </div>
              
              {selectedAdditions.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <span className="detail-price-notif">Total con adiciones: {formatCOP(totalPrice)}</span>
                </div>
              )}

              <div className="detail-description">
                <h4>Descripción</h4>
                <p>{product.description || 'Este producto es seleccionado cuidadosamente por Sávit para brindarte lo mejor de la naturaleza.'}</p>
              </div>

              {product.type === 'prepared' && product.additions?.length > 0 && (
                <div className="detail-additions-trigger-box">
                  <div className="trigger-header">
                    <h4>¿Deseas agregar algo más?</h4>
                    {selectedAdditions.length > 0 && (
                      <span className="selection-count">{selectedAdditions.length} {selectedAdditions.length === 1 ? 'seleccionado' : 'seleccionados'}</span>
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="btn-trigger-ingredients"
                    onClick={() => setShowIngredientsMenu(true)}
                  >
                    <span className="trigger-icon">🥑</span>
                    <span className="trigger-text">Ver ingredientes y adiciones</span>
                    <span className="trigger-arrow">→</span>
                  </button>
                  
                  {selectedAdditions.length > 0 && (
                    <div className="active-additions-preview">
                      {selectedAdditions.slice(0, 3).map(a => a.name).join(', ')}
                      {selectedAdditions.length > 3 && '...'}
                    </div>
                  )}
                </div>
              )}

              {product.ingredients && product.ingredients.length > 0 && (
                <div className="detail-ingredients">
                  <h4>Ingredientes base</h4>
                  <div className="ingredients-tags">
                    {product.ingredients.map((ing, i) => (
                      <span key={i} className="ing-tag">{ing}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-footer">
                {isSoldOut ? (
                  <div className="product-detail-soldout-notice">
                    <span>Producto Agotado actualmente</span>
                  </div>
                ) : (
                  <div className="detail-controls">
                    <div className="detail-actions-row">
                      <div className="qty-counter" style={{ flex: 1, height: '56px', maxWidth: 'none' }}>
                        <button 
                          onClick={() => setModalQty(prev => Math.max(1, prev - 1))} 
                          disabled={modalQty <= 1}
                          className="qty-control-btn"
                          style={{ width: '46px', height: '46px' }}
                        >
                          −
                        </button>
                        <span className="qty-counter-value" style={{ fontSize: '1.2rem' }}>{modalQty}</span>
                        <button 
                          onClick={() => setModalQty(prev => prev + 1)} 
                          disabled={product.stock !== undefined && modalQty >= product.stock}
                          className="qty-control-btn"
                          style={{ width: '46px', height: '46px' }}
                        >
                          +
                        </button>
                      </div>

                      <button 
                        className="btn-go-cart"
                        onClick={() => {
                          setShowDetail(false);
                          setCartOpen(true);
                        }}
                        aria-label="Ir al carrito"
                      >
                         🛒
                      </button>
                    </div>

                    <button 
                      ref={addBtnRef}
                      className="btn-main-action"
                      onClick={(e) => {
                        handleAdd(e, selectedAdditions, modalQty);
                        setShowDetail(false);
                      }}
                    >
                      Añadir al Carrito
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Ingredients Fresh Menu (Nested Drawer) ── */}
      {showIngredientsMenu && (
        <div className="ingredients-menu-overlay" onClick={() => setShowIngredientsMenu(false)}>
          <div className="ingredients-menu-drawer" onClick={e => e.stopPropagation()}>
            <div className="ingredients-menu-header">
              <div className="menu-handle" />
              <div className="menu-title-group">
                <h3>Personaliza tu Sávit</h3>
                <p>Selecciona ingredientes frescos y premium</p>
              </div>
              <button className="menu-close-btn" onClick={() => setShowIngredientsMenu(false)}>✕</button>
            </div>

            <div className="ingredients-menu-body">
              <div className="ingredients-premium-grid">
                {product.additions.map(addId => {
                  const ing = ingredients.find(i => i.id === addId);
                  if (!ing) return null;
                  const isSelected = selectedAdditions.some(s => s.id === ing.id);
                  return (
                    <div 
                      key={ing.id} 
                      className={`premium-ingredient-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleAddit(ing)}
                    >
                      <div className="ingredient-card-check">
                        {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div className="ingredient-card-info">
                        <span className="ingredient-card-name">{ing.name}</span>
                        <span className="ingredient-card-price">+{formatCOP(ing.price || 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ingredients-menu-footer">
              <button 
                className="btn btn-primary w-full premium-save-btn" 
                onClick={() => setShowIngredientsMenu(false)}
              >
                Confirmar adiciones
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

