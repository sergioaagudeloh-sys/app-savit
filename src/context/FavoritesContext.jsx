import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { playFavoriteSound } from '../utils/audio';

const FavoritesContext = createContext(null);
const STORAGE_KEY = 'savit_favorites';

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (id) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback((product) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === product.id);
      if (!exists) {
        playFavoriteSound();
      }
      if (exists) return prev.filter((f) => f.id !== product.id);
      // Store minimal product info
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          description: product.description,
        },
      ];
    });
  }, []); // Sin dependencias: usa el updater funcional de setFavorites

  const clearFavorites = useCallback(() => setFavorites([]), []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, clearFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
