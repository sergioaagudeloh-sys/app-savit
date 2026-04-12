import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

const DEMO_INGREDIENTS = [];

function getDemoIngredients() {
  try {
    const local = localStorage.getItem('savit_demo_ingredients');
    if (local) return JSON.parse(local);
  } catch (e) {}
  return DEMO_INGREDIENTS;
}

function saveDemoIngredients(ingredientsList) {
  try {
    localStorage.setItem('savit_demo_ingredients', JSON.stringify(ingredientsList));
    window.dispatchEvent(new Event('savit_demo_ingredients_changed'));
  } catch (e) {
    console.warn('Error saving ingredients:', e);
  }
}

export function useIngredients() {
  const [ingredients, setIngredients] = useState(getDemoIngredients());
  const [loading, setLoading] = useState(() => isFirebaseConfigured());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const handleSync = () => setIngredients(getDemoIngredients());
      window.addEventListener('savit_demo_ingredients_changed', handleSync);
      window.addEventListener('storage', handleSync);
      setLoading(false);
      return () => {
        window.removeEventListener('savit_demo_ingredients_changed', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }

    const q = query(collection(db, 'ingredients'), orderBy('name'));
    const unsub = onSnapshot(q,
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setIngredients(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando ingredientes:', err);
        setError(err.message);
        setIngredients(DEMO_INGREDIENTS);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addIngredient = async (data) => {
    if (ingredients.some(i => i.name.toLowerCase() === data.name.trim().toLowerCase())) {
      throw new Error('Ya existe un ingrediente con este nombre');
    }

    if (!isFirebaseConfigured()) {
      const newI = { id: `local_i_${Date.now()}`, ...data, active: true };
      const current = getDemoIngredients();
      saveDemoIngredients([newI, ...current]);
      return newI;
    }
    return addDoc(collection(db, 'ingredients'), {
      ...data,
      createdAt: serverTimestamp(),
      active: true,
    });
  };

  const updateIngredient = async (id, data) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoIngredients();
      const updated = current.map(i => i.id === id ? { ...i, ...data } : i);
      saveDemoIngredients(updated);
      return;
    }
    return updateDoc(doc(db, 'ingredients', id), { ...data, updatedAt: serverTimestamp() });
  };

  const toggleIngredient = async (id, active) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoIngredients();
      const updated = current.map(i => i.id === id ? { ...i, active } : i);
      saveDemoIngredients(updated);
      return;
    }
    return updateDoc(doc(db, 'ingredients', id), { active });
  };

  const deleteIngredient = async (id) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoIngredients();
      const updated = current.filter(i => i.id !== id);
      saveDemoIngredients(updated);
      return;
    }
    return deleteDoc(doc(db, 'ingredients', id));
  };

  return { ingredients, loading, error, addIngredient, updateIngredient, toggleIngredient, deleteIngredient };
}
