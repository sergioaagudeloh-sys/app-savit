// src/hooks/useProducts.js
import { useProductsContext } from '../context/ProductsContext';

/**
 * useProducts Hook
 * Refactorizado para consumir ProductsContext y evitar parpadeos (flickers)
 * de carga al navegar entre secciones del catálogo.
 */
export function useProducts() {
  const { 
    products, loading, error, 
    addProduct, updateProduct, toggleProduct, toggleSoldOut, deleteProduct 
  } = useProductsContext();

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    toggleProduct,
    toggleSoldOut,
    deleteProduct
  };
}

/**
 * useCategoryManager Hook
 * Centralizado en el contexto global para persistencia instantánea.
 */
export function useCategoryManager() {
  const { categories, loading, addCategory, deleteCategory } = useProductsContext();

  return {
    categories,
    loading,
    addCategory,
    deleteCategory
  };
}

/**
 * useCategories Hook
 * Genera la lista de categorías para el selector del catálogo.
 */
export function useCategories() {
  const { categories: customCats } = useProductsContext();
  
  const all = [{ name: 'Todos', icon: '🍃' }];
  const custom = customCats.map(c => ({
    name: c.name,
    icon: c.icon || '🏷️'
  }));
  
  return [...all, ...custom];
}
