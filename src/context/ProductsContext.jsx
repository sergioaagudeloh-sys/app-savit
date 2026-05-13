// src/context/ProductsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

const ProductsContext = createContext();

// Demo products fallback
const DEMO_PRODUCTS = [];

function getDemoProducts() {
  try {
    const local = localStorage.getItem('savit_demo_products');
    if (local) return JSON.parse(local);
  } catch (e) {}
  return DEMO_PRODUCTS;
}

function saveDemoProducts(productsList) {
  try {
    localStorage.setItem('savit_demo_products', JSON.stringify(productsList));
    window.dispatchEvent(new Event('savit_demo_products_changed'));
  } catch (e) {
    console.warn('Error saving products:', e);
  }
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(getDemoProducts());
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(products.length === 0 && isFirebaseConfigured());
  const [error, setError] = useState(null);

  // Sync Products
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const handleSync = () => setProducts(getDemoProducts());
      window.addEventListener('savit_demo_products_changed', handleSync);
      window.addEventListener('storage', handleSync);
      setLoading(false);
      return () => {
        window.removeEventListener('savit_demo_products_changed', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }

    const q = query(collection(db, 'products'), orderBy('name'));
    const unsub = onSnapshot(q,
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(docs);
        setLoading(false);
      },
      (err) => {
        console.error('ProductsContext: Error loading products:', err);
        setError(err.message);
        setProducts(DEMO_PRODUCTS);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Sync Categories
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const getCats = () => {
        try {
          const local = localStorage.getItem('savit_custom_categories');
          return local ? JSON.parse(local) : [];
        } catch (e) { return []; }
      };
      setCategories(getCats());
      const handleSync = () => setCategories(getCats());
      window.addEventListener('savit_custom_categories_changed', handleSync);
      return () => window.removeEventListener('savit_custom_categories_changed', handleSync);
    }

    const q = query(collection(db, 'categories'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(docs);
    });
    return unsub;
  }, []);

  // Mutations
  const addProduct = async (data) => {
    if (products.some(p => p.name.toLowerCase() === data.name.trim().toLowerCase())) {
      throw new Error('Ya existe un producto con este nombre');
    }
    if (!isFirebaseConfigured()) {
      const newP = { id: `local_p_${Date.now()}`, ...data, active: true, soldOut: false };
      saveDemoProducts([newP, ...products]);
      return newP;
    }
    return addDoc(collection(db, 'products'), {
      ...data,
      createdAt: serverTimestamp(),
      active: true,
      soldOut: false,
    });
  };

  const updateProduct = async (id, data) => {
    if (!isFirebaseConfigured()) {
      const updated = products.map(p => p.id === id ? { ...p, ...data } : p);
      saveDemoProducts(updated);
      return;
    }
    return updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
  };

  const toggleProduct = async (id, active) => {
    return updateProduct(id, { active });
  };

  const toggleSoldOut = async (id, soldOut) => {
    return updateProduct(id, { soldOut });
  };

  const deleteProduct = async (id) => {
    if (!isFirebaseConfigured()) {
      saveDemoProducts(products.filter(p => p.id !== id));
      return;
    }
    return deleteDoc(doc(db, 'products', id));
  };

  const addCategory = async (name, icon = '🏷️') => {
    const newName = name.trim();
    if (categories.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error('Ya existe esta categoría');
    }
    if (!isFirebaseConfigured()) {
      const local = localStorage.getItem('savit_custom_categories');
      const current = local ? JSON.parse(local) : [];
      const newCat = { id: `cat_${Date.now()}`, name: newName, icon };
      localStorage.setItem('savit_custom_categories', JSON.stringify([...current, newCat]));
      window.dispatchEvent(new Event('savit_custom_categories_changed'));
      return newCat;
    }
    return addDoc(collection(db, 'categories'), { name: newName, icon, createdAt: serverTimestamp() });
  };

  const deleteCategory = async (id) => {
    if (!isFirebaseConfigured()) {
      const local = localStorage.getItem('savit_custom_categories');
      const current = local ? JSON.parse(local) : [];
      localStorage.setItem('savit_custom_categories', JSON.stringify(current.filter(c => c.id !== id)));
      window.dispatchEvent(new Event('savit_custom_categories_changed'));
      return;
    }
    return deleteDoc(doc(db, 'categories', id));
  };

  return (
    <ProductsContext.Provider value={{
      products, categories, loading, error,
      addProduct, updateProduct, toggleProduct, toggleSoldOut, deleteProduct,
      addCategory, deleteCategory
    }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProductsContext must be used within ProductsProvider');
  return context;
}
