import React from 'react';
import ProgressiveImage from './ProgressiveImage';
import './ChatProductCard.css';

/**
 * Tarjeta de producto premium para el chat de IA.
 * Soporta dos modos:
 *   - 'cart'     → Botón "🛒 Agregar" que llama a onAddToCart
 *   - 'favorite' → Botón "♥ Favorito" que llama a onFavorite
 */
export default function ChatProductCard({
  product,
  mode = 'cart',
  onAddToCart,
  onFavorite,
}) {
  if (!product) return null;

  const finalPrice = product.isPromo && product.promoPrice ? product.promoPrice : product.price;
  const imageSrc   = product.imageUrl || product.image || '/placeholder-product.png';

  const handleAdd = (e) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product);
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (onFavorite) onFavorite(product);
  };

  return (
    <div className={`chat-product-card mode-${mode}`}>
      {/* Imagen */}
      <div className="chat-product-img-container">
        <ProgressiveImage
          src={imageSrc}
          alt={product.name}
          className="chat-product-img"
        />
        {product.isPromo && (
          <div className="chat-product-promo-badge">Oferta</div>
        )}
      </div>

      {/* Información */}
      <div className="chat-product-info">
        <h4 className="chat-product-name">{product.name}</h4>

        <div className="chat-product-prices">
          <span className="chat-product-price">
            ${Number(finalPrice).toLocaleString('es-CO')}
          </span>
          {product.isPromo && product.price !== finalPrice && (
            <span className="chat-product-old-price">
              ${Number(product.price).toLocaleString('es-CO')}
            </span>
          )}
        </div>

        {product.description && (
          <p className="chat-product-description-mini">
            {product.description.length > 48
              ? `${product.description.substring(0, 48)}…`
              : product.description}
          </p>
        )}

        {/* BUG 1 FIX: Botón según modo */}
        {mode === 'cart' && onAddToCart && (
          <button className="chat-product-btn cart-btn" onClick={handleAdd}>
            🛒 Agregar
          </button>
        )}
        {mode === 'favorite' && onFavorite && (
          <button className="chat-product-btn fav-btn" onClick={handleFavorite}>
            ♥ Favorito
          </button>
        )}
      </div>
    </div>
  );
}
