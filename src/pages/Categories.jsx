// src/pages/Categories.jsx
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useProducts, useCategories } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';

export default function Categories() {
  const { products } = useProducts();
  const categories = useCategories(products).filter(c => c !== 'Todos');
  const { setCartOpen } = useCart();

  return (
    <div className="app-container">
      <Header title="Categorías" onCartOpen={() => setCartOpen(true)} />
      <main className="page-content">
        <div style={{ padding: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            {categories.map(cat => (
              <div 
                key={cat} 
                className="card flex-center flex-col p-lg"
                style={{ height: 120, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 32, marginBottom: 'var(--space-sm)' }}>🏷️</div>
                <div style={{ fontWeight: 700, textAlign: 'center' }}>{cat}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
