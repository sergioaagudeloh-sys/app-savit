/**
 * useAddToCartAnimation
 *
 * Dispara una animación de "vuelo parabólico" de un elemento ghost
 * desde el botón de origen hasta el botón del carrito en el header.
 *
 * Uso:
 *   const { triggerFlyAnimation } = useAddToCartAnimation();
 *   // En el handler del botón "Añadir":
 *   triggerFlyAnimation(buttonRef.current, imageUrl);
 */
import { useCallback } from 'react';

export function useAddToCartAnimation() {
  const getCartBtn = () => {
    const headerBtn = document.getElementById('cart-btn-header');
    const bottomBtn = document.getElementById('cart-btn-bottom');
    const isVisible = (el) => el && el.offsetParent !== null;
    return isVisible(headerBtn) ? headerBtn : (isVisible(bottomBtn) ? bottomBtn : headerBtn || bottomBtn);
  };

  const createGhost = (imageUrl, startRect) => {
    const ghost = document.createElement('div');
    ghost.className = 'cart-fly-ghost';
    const ghostSize = 38;

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.draggable = false;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      `;
      ghost.appendChild(img);
    } else {
      ghost.textContent = '🛍';
    }

    ghost.style.cssText = `
      position: fixed;
      left: ${startRect.left + startRect.width / 2 - ghostSize / 2}px;
      top:  ${startRect.top  + startRect.height / 2 - ghostSize / 2}px;
      width: ${ghostSize}px;
      height: ${ghostSize}px;
      z-index: 100000;
      pointer-events: none;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      background: white;
      border: 2px solid var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      will-change: transform, opacity;
    `;
    return ghost;
  };

  const triggerFlyAnimation = useCallback((originEl, imageUrl = null) => {
    const cartBtn = getCartBtn();
    if (!cartBtn || !originEl) return;

    const originRect = originEl.getBoundingClientRect();
    const destRect   = cartBtn.getBoundingClientRect();
    const ghost = createGhost(imageUrl, originRect);
    document.body.appendChild(ghost);

    const dx = destRect.left + destRect.width / 2  - (originRect.left + originRect.width / 2);
    const dy = destRect.top  + destRect.height / 2 - (originRect.top  + originRect.height / 2);

    const animation = ghost.animate(
      [
        { transform: 'translate(0, 0) scale(0.5)', opacity: 0 },
        { 
          transform: `translate(${dx * 0.4}px, ${Math.min(dy * 0.3, -40)}px) scale(1.1)`,
          opacity: 1,
          offset: 0.35 
        },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 }
      ],
      { duration: 650, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' }
    );

    animation.onfinish = () => {
      ghost.remove();
      cartBtn.classList.add('cart-btn-pulse');
      setTimeout(() => cartBtn.classList.remove('cart-btn-pulse'), 600);
    };
  }, []);

  const triggerLeaveAnimation = useCallback((originEl, imageUrl = null) => {
    const cartBtn = getCartBtn();
    if (!cartBtn || !originEl) return;

    const originRect = originEl.getBoundingClientRect();
    const destRect   = cartBtn.getBoundingClientRect();
    
    // El ghost empieza en el carrito
    const ghost = createGhost(imageUrl, destRect);
    document.body.appendChild(ghost);

    // Vector hacia el componente (sentido opuesto)
    const dx = (originRect.left + originRect.width / 2) - (destRect.left + destRect.width / 2);
    const dy = (originRect.top + originRect.height / 2) - (destRect.top + destRect.height / 2);

    const animation = ghost.animate(
      [
        { transform: 'translate(0, 0) scale(0.3)', opacity: 0 },
        { 
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(0.8)`,
          opacity: 1,
          offset: 0.45 
        },
        { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 0 }
      ],
      { duration: 550, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' }
    );

    animation.onfinish = () => {
      ghost.remove();
      // Pequeño pulse en el origen para feedback
      originEl.classList.add('qty-pulse');
      setTimeout(() => originEl.classList.remove('qty-pulse'), 400);
    };
  }, []);

  return { triggerFlyAnimation, triggerLeaveAnimation };
}
