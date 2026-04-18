// src/hooks/useSubscriptions.js
// Hook centralizado para suscripciones/gastos recurrentes.
// Sigue el mismo patrón que useOrders.js y useProducts.js:
// un único listener de Firestore en toda la app, con fallback a localStorage.

import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

const STORAGE_KEY = 'savit_subscriptions';

function getDemoSubscriptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveDemoSubscriptions(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('savit_subscriptions_changed'));
  } catch (e) {
    console.warn('Error saving subscriptions to localStorage:', e);
  }
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Modo demo: leer desde localStorage y escuchar cambios locales
    if (!isFirebaseConfigured()) {
      const sync = () => {
        setSubscriptions(
          getDemoSubscriptions().sort((a, b) => (a.dayOfMonth || 0) - (b.dayOfMonth || 0))
        );
        setLoading(false);
      };
      sync();
      window.addEventListener('savit_subscriptions_changed', sync);
      window.addEventListener('storage', sync);
      return () => {
        window.removeEventListener('savit_subscriptions_changed', sync);
        window.removeEventListener('storage', sync);
      };
    }

    // Firebase: listener único compartido
    const q = query(collection(db, 'subscriptions'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.dayOfMonth || 0) - (b.dayOfMonth || 0));
        setSubscriptions(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando suscripciones:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // ─── Mutaciones ──────────────────────────────────────────────────────────────

  const addSubscription = async (data) => {
    const docData = {
      name: data.name?.trim() || '',
      category: data.category?.trim() || 'Otro',
      amount: parseFloat(data.amount) || 0,
      dayOfMonth: parseInt(data.dayOfMonth) || 1,
      active: true,
      lastNotifiedMonth: '',
    };

    if (!isFirebaseConfigured()) {
      const current = getDemoSubscriptions();
      saveDemoSubscriptions([
        ...current,
        { ...docData, id: `sub_local_${Date.now()}` },
      ]);
      return;
    }
    return addDoc(collection(db, 'subscriptions'), {
      ...docData,
      createdAt: serverTimestamp(),
    });
  };

  const updateSubscription = async (id, data) => {
    if (!isFirebaseConfigured()) {
      const updated = getDemoSubscriptions().map(s =>
        s.id === id ? { ...s, ...data } : s
      );
      saveDemoSubscriptions(updated);
      return;
    }
    return updateDoc(doc(db, 'subscriptions', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteSubscription = async (id) => {
    if (!isFirebaseConfigured()) {
      saveDemoSubscriptions(getDemoSubscriptions().filter(s => s.id !== id));
      return;
    }
    return deleteDoc(doc(db, 'subscriptions', id));
  };

  // ─── Derivados ───────────────────────────────────────────────────────────────
  const activeSubscriptions = subscriptions.filter(s => s.active);
  const totalMonthly = activeSubscriptions.reduce(
    (acc, s) => acc + (parseFloat(s.amount) || 0),
    0
  );

  return {
    subscriptions,
    loading,
    activeSubscriptions,
    totalMonthly,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  };
}
