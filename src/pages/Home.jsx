// src/pages/Home.jsx
import { useState, useMemo, useEffect, forwardRef, useCallback } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import Fuse from 'fuse.js';
import { useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Banner from '../components/ui/Banner';
import SearchBar from '../components/ui/SearchBar';
import CategoryPills from '../components/ui/CategoryPills';
import ProductCard from '../components/product/ProductCard';
import StoreStatusBanner from '../components/ui/StoreStatusBanner';
import { useCart } from '../context/CartContext';
import { useProducts, useCategories } from '../hooks/useProducts';
import { useStoreConfig } from '../hooks/useOrders';
import { useNotifications } from '../context/NotificationContext';
import { useSwipe } from '../hooks/useSwipe';
import EmptyState from '../components/common/EmptyState';
import './Home.css';

import { ProductSkeleton } from '../components/ui/Skeleton';

// ── Virtualization Components ────────────────────────────────────────────────
const GridList = forwardRef(({ children, ...props }, ref) => (
  <div {...props} ref={ref} className="product-grid">
    {children}
  </div>
));

const GridItem = ({ children, ...props }) => (
  <div {...props} className="product-item-wrapper">
    {children}
  </div>
);

export default function Home() {
  const { products, loading } = useProducts();
  const { config } = useStoreConfig();
  const { showToast } = useNotifications(); // Using global notification context
  const { setCartOpen } = useCart();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('Todos');

  useEffect(() => {
    if (location.state) {
      if (location.state.category) {
        setSelectedCat(location.state.category);
      }
      if (location.state.search) {
        setSearch(location.state.search);
      }
    }
    window.scrollTo(0, 0);
  }, [location.state]);

  const categories = useCategories(products);

  const handleNextCategory = () => {
    if (!categories || categories.length <= 1) return;
    const currentIndex = categories.findIndex(c => c.name === selectedCat);
    const nextIndex = (currentIndex + 1) % categories.length;
    setSelectedCat(categories[nextIndex].name);
  };

  const handlePrevCategory = () => {
    if (!categories || categories.length <= 1) return;
    const currentIndex = categories.findIndex(c => c.name === selectedCat);
    const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
    setSelectedCat(categories[prevIndex].name);
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleNextCategory,
    onSwipeRight: handlePrevCategory,
    threshold: 60
  });

  // Instancia de Fuse cacheada — solo se recrea cuando cambian los productos
  const fuseInstance = useMemo(() => {
    if (!products) return null;
    const fuseOptions = {
      keys: [
        { name: 'name',        weight: 0.7 },
        { name: 'category',    weight: 0.1 },
        { name: 'description', weight: 0.1 },
        { name: 'tags',        weight: 0.1 }
      ],
      threshold: 0.35,
      ignoreLocation: true
    };
    return new Fuse(products.filter(p => p.active !== false), fuseOptions);
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];

    const baseProducts = products.filter(p => {
      const matchesCat = selectedCat === 'Todos' || p.category === selectedCat;
      return matchesCat && p.active !== false;
    });

    const searchStr = search?.trim();
    if (!searchStr || !fuseInstance) return baseProducts;

    const results = fuseInstance.search(searchStr);
    return results
      .map(res => res.item)
      .filter(p => selectedCat === 'Todos' || p.category === selectedCat);
  }, [products, search, selectedCat, fuseInstance]);

  const handleToast = useCallback((msg, type) => {
    showToast(msg, type);
  }, [showToast]);

  return (
    <div className="app-container catalog-page" {...swipeHandlers}>
      <Header onCartOpen={() => setCartOpen(true)} />

      <div className="catalog-hero-wrapper">
        <Banner />
      </div>

      <main className="page-content catalog-content">
        <SearchBar onSearch={setSearch} />

        {categories && categories.length > 1 && (
          <CategoryPills
            categories={categories}
            selected={selectedCat}
            onSelect={setSelectedCat}
          />
        )}

        <div className="section-header">
          <h2 className="section-title">
            {search ? `Resultados para "${search}"` : selectedCat === 'Todos' ? 'Todos los Productos' : selectedCat}
          </h2>
          {filtered.length > 0 && (
            <span className="section-action">{filtered.length} productos</span>
          )}
        </div>

        {loading ? (
          <div className="product-grid">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <VirtuosoGrid
            useWindowScroll
            data={filtered}
            components={{
              List: GridList,
              Item: GridItem
            }}
            itemContent={(index, product) => (
              <ProductCard
                key={product.id}
                product={product}
                onToast={handleToast}
              />
            )}
          />
        ) : (
          <EmptyState 
            icon="🍃"
            title="Aún no hay nada aquí"
            message="No encontramos productos que coincidan. ¡Prueba buscando otra cosa o cambia de categoría!"
            action={
              <button 
                className="btn btn-primary-soft"
                onClick={() => {
                  setSearch('');
                  setSelectedCat('Todos');
                }}
              >
                Ver todo el catálogo
              </button>
            }
          />
        )}
      </main>
    </div>
  );
}
