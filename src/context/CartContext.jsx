// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useReducer, useState, useCallback } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'savit_cart';

// --- Funciones de Audio importadas ---
import { playPopSound } from '../utils/audio';

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const additionsKey = (action.product.selectedAdditions || []).map(x => x.id).sort().join(',');
      const cartId = `${action.product.id}-${additionsKey}`;

      const existing = state.items.find(i => 
        (i.cartId || i.id) === (cartId || action.product.id)
      );

      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            (i.cartId || i.id) === (cartId || action.product.id)
              ? { ...i, quantity: i.quantity + (action.qty || 1) }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.product, cartId, quantity: action.qty || 1 }],
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.cartId ? i.cartId !== action.cartId : i.id !== action.id) };

    case 'UPDATE_QTY': {
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter(i => i.cartId ? i.cartId !== action.cartId : i.id !== action.id) };
      }
      return {
        ...state,
        items: state.items.map(i => {
          const isTarget = i.cartId ? i.cartId === action.cartId : i.id === action.id;
          return isTarget ? { ...i, quantity: action.qty } : i;
        }),
      };
    }
    case 'CLEAR':
      return { ...state, items: [] };

    case 'LOAD':
      return { ...state, items: action.items };

    default:
      return state;
  }
}

const initialState = { items: [] };

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isCartOpen, setCartOpen] = useState(false);
  const [addCount, setAddCount] = useState(0); // increments on each ADD

  // Cargar carrito guardado al iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items) && items.length > 0) {
          dispatch({ type: 'LOAD', items });
        }
      }
    } catch (e) {
      console.warn('Error cargando carrito guardado:', e);
    }
  }, []);

  // Persistir carrito en LocalStorage en cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (e) {
      console.warn('Error guardando carrito:', e);
    }
  }, [state.items]);

  const addItem = useCallback((product, qty = 1) => {
    try {
      playPopSound(true);
      dispatch({ type: 'ADD', product, qty });
      setAddCount(c => c + 1);
    } catch (e) {
      console.error('Error adding item to cart:', e);
    }
  }, []);

  const removeItem = useCallback((cartId, id) => {
    try {
      playPopSound(false);
      dispatch({ type: 'REMOVE', cartId, id });
    } catch (e) {
      console.error('Error removing item from cart:', e);
    }
  }, []);

  const updateQty = useCallback((cartId, qty, id) => {
    try {
      // Calculamos si estamos incrementando o decrementando para reproducir el tono correcto
      const item = state.items.find(i => i.cartId === cartId || i.id === id);
      const isIncrease = !item || qty > item.quantity;
      playPopSound(isIncrease);
      
      dispatch({ type: 'UPDATE_QTY', cartId, qty, id });
    } catch (e) {
      console.error('Error updating cart quantity:', e);
    }
  }, [state.items]);

  const clearCart = useCallback(() => {
    try {
      dispatch({ type: 'CLEAR' });
    } catch (e) {
      console.error('Error clearing cart:', e);
    }
  }, []);

  const totalItems = state.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
  const totalPrice = state.items?.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0) || 0;

  return (
    <CartContext.Provider value={{
      items: state.items || [],
      totalItems,
      totalPrice,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      isCartOpen,
      setCartOpen,
      addCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
