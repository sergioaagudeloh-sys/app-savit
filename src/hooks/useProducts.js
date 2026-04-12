// src/hooks/useProducts.js
import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

// Datos demo para cuando Firebase no está configurado
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

export function useProducts() {
  const [products, setProducts] = useState(getDemoProducts());
  const [loading, setLoading] = useState(() => isFirebaseConfigured());
  const [error, setError] = useState(null);

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
        console.error('Error cargando productos:', err);
        setError(err.message);
        setProducts(DEMO_PRODUCTS);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addProduct = async (data) => {
    // Check for duplicate name
    if (products.some(p => p.name.toLowerCase() === data.name.trim().toLowerCase())) {
      throw new Error('Ya existe un producto con este nombre');
    }

    if (!isFirebaseConfigured()) {
      const newP = { id: `local_p_${Date.now()}`, ...data, active: true, soldOut: false };
      const current = getDemoProducts();
      saveDemoProducts([newP, ...current]);
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
      const current = getDemoProducts();
      const updated = current.map(p => p.id === id ? { ...p, ...data } : p);
      saveDemoProducts(updated);
      return;
    }
    return updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
  };

  const toggleProduct = async (id, active) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoProducts();
      const updated = current.map(p => p.id === id ? { ...p, active } : p);
      saveDemoProducts(updated);
      return;
    }
    return updateDoc(doc(db, 'products', id), { active });
  };

  const toggleSoldOut = async (id, soldOut) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoProducts();
      const updated = current.map(p => p.id === id ? { ...p, soldOut } : p);
      saveDemoProducts(updated);
      return;
    }
    return updateDoc(doc(db, 'products', id), { soldOut });
  };

  const deleteProduct = async (id) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoProducts();
      const updated = current.filter(p => p.id !== id);
      saveDemoProducts(updated);
      return;
    }
    return deleteDoc(doc(db, 'products', id));
  };


  return { products, loading, error, addProduct, updateProduct, toggleProduct, toggleSoldOut, deleteProduct };
}

export function useCategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(() => isFirebaseConfigured());

  useEffect(() => {
    const deduplicate = (cats) => {
      const map = new Map();
      cats.forEach(c => {
        if (!c?.name) return;
        const key = c.name.trim().toLowerCase();
        if (!map.has(key)) map.set(key, c);
      });
      return Array.from(map.values());
    };

    if (!isFirebaseConfigured()) {
      const getCats = () => {
        try {
          const local = localStorage.getItem('savit_custom_categories');
          return deduplicate(local ? JSON.parse(local) : []);
        } catch (e) {
          console.warn('Error loading custom categories:', e);
          return [];
        }
      };
      setCategories(getCats());
      setLoading(false);
      const handleSync = () => setCategories(getCats());
      window.addEventListener('savit_custom_categories_changed', handleSync);
      return () => window.removeEventListener('savit_custom_categories_changed', handleSync);
    }

    const q = query(collection(db, 'categories'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(deduplicate(raw));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addCategory = async (name, icon = '🏷️') => {
    const newName = name.trim();
    if (!newName) return;

    // Check for duplicate in current state (works for both Firebase and Demo)
    if (categories.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error('Ya existe esta categoría');
    }

    if (!isFirebaseConfigured()) {
      try {
        const local = localStorage.getItem('savit_custom_categories');
        const current = local ? JSON.parse(local) : [];
        
        const newCat = { id: `cat_${Date.now()}`, name: newName, icon };
        localStorage.setItem('savit_custom_categories', JSON.stringify([...current, newCat]));
        window.dispatchEvent(new Event('savit_custom_categories_changed'));
        return newCat;
      } catch (e) {
        console.warn('Error adding custom category:', e);
        return;
      }
    }

    return addDoc(collection(db, 'categories'), { name: newName, icon, createdAt: serverTimestamp() });
  };

  const deleteCategory = async (id) => {
    if (!isFirebaseConfigured()) {
      try {
        const local = localStorage.getItem('savit_custom_categories');
        const current = local ? JSON.parse(local) : [];
        localStorage.setItem('savit_custom_categories', JSON.stringify(current.filter(c => c.id !== id)));
        window.dispatchEvent(new Event('savit_custom_categories_changed'));
      } catch (e) {
        console.warn('Error deleting custom category:', e);
      }
      return;
    }
    return deleteDoc(doc(db, 'categories', id));
  };

  return { categories, loading, addCategory, deleteCategory };
}

export function useCategories(products) {
  const { categories: customCats } = useCategoryManager();
  
  const all = [{ name: 'Todos', icon: '🍃' }];
  const custom = customCats.map(c => ({
    name: c.name,
    icon: c.icon || '🏷️'
  })).sort((a, b) => a.name.localeCompare(b.name));
  
  return [...all, ...custom];
}
