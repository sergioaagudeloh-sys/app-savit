// src/components/ui/CartBadge.jsx
import { useEffect, useRef, useState } from 'react';
import './CartBadge.css';

/**
 * CartBadge — contador premium del carrito.
 *
 * Estrategia de animación:
 *  - Usamos la prop `key` de React internamente: cada vez que `count`
 *    cambia, destruimos y recreamos el span → el navegador reinicia
 *    la animación CSS sin necesidad de setTimeout/classList tricks.
 *  - Un `pulsing` state separado muestra el anillo de ripple durante 600 ms
 *    para dar retroalimentación visual cuando se agrega un ítem.
 */
export default function CartBadge({ count }) {
  const prevCount  = useRef(count);
  const [pulse, setPulse] = useState(false);
  const [animKey, setAnimKey] = useState(0); // fuerza re-render del badge

  useEffect(() => {
    if (count !== prevCount.current) {
      // Incremento → ripple de "añadido"
      if (count > prevCount.current) {
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 700);
        return () => clearTimeout(t);
      }
      // Cualquier cambio → pop del número
      setAnimKey(k => k + 1);
      prevCount.current = count;
    }
  }, [count]);

  if (count <= 0) return null;

  return (
    <span className="cart-badge-wrapper" aria-label={`${count} productos en el carrito`}>
      {/* Anillo de pulse cuando se añade ítem */}
      {pulse && <span className="cart-badge-ripple" aria-hidden />}

      {/* El badge en sí — key cambia → animación pop se reinicia */}
      <span key={animKey} className="cart-badge-count">
        {count > 99 ? '99+' : count}
      </span>
    </span>
  );
}
