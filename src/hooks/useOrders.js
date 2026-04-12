import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, where
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { useStoreContext } from '../context/StoreContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ORDERS = [];


function getDemoOrders() {
  try {
    const local = localStorage.getItem('savit_demo_orders');
    if (local) {
      const parsed = JSON.parse(local);
      return parsed.map(o => ({
        ...o,
        createdAt: { toDate: () => new Date(o.createdAtMillis) }
      }));
    }
  } catch (e) {}
  // Map DEMO_ORDERS with createdAtMillis so saving down works correctly
  return DEMO_ORDERS.map(o => ({
    ...o,
    createdAtMillis: o.createdAt ? o.createdAt.toDate().getTime() : Date.now()
  }));
}

function saveDemoOrders(ordersList) {
  try {
    localStorage.setItem('savit_demo_orders', JSON.stringify(ordersList));
    window.dispatchEvent(new Event('savit_demo_orders_changed'));
  } catch (e) {
    console.error('Error saving demo orders:', e);
  }
}

export function useOrders() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const myWhatsapp = localStorage.getItem('savit_customer_phone') || user?.whatsapp || '';

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(() => isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const handleSync = () => {
        const allDemo = getDemoOrders();
        if (isAdmin) {
          setOrders(allDemo);
        } else if (myWhatsapp) {
          setOrders(allDemo.filter(o => o.customerPhone === myWhatsapp));
        } else {
          setOrders([]);
        }
      };
      handleSync();
      window.addEventListener('savit_demo_orders_changed', handleSync);
      window.addEventListener('storage', handleSync);
      setLoading(false);
      return () => {
        window.removeEventListener('savit_demo_orders_changed', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }

    let q;
    if (isAdmin) {
      q = collection(db, 'orders');
    } else if (myWhatsapp) {
      q = query(collection(db, 'orders'), where('customerPhone', '==', myWhatsapp));
    } else {
      setOrders([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAtMillis || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAtMillis || 0;
        return timeB - timeA;
      });
      setOrders(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setOrders([]);
      setLoading(false);
    });
    return unsub;
  }, [isAdmin, myWhatsapp]);

  const createOrder = async (orderData) => {
    if (!isFirebaseConfigured()) {
      const newOrder = { 
        id: `local_${Date.now()}`, 
        ...orderData, 
        createdAt: { toDate: () => new Date() },
        createdAtMillis: Date.now()
      };
      const current = getDemoOrders();
      saveDemoOrders([newOrder, ...current]);
      return newOrder;
    }
    return addDoc(collection(db, 'orders'), {
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  };

  const updateOrderStatus = async (id, status, extraData = {}) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoOrders();
      const updated = current.map(o => o.id === id ? { ...o, status, ...extraData } : o);
      saveDemoOrders(updated);
      return;
    }
    return updateDoc(doc(db, 'orders', id), { 
      status, 
      ...extraData,
      updatedAt: serverTimestamp() 
    });
  };

  const updateOrderDelivery = async (id, deliveryCost) => {
    const numericCost = Number(deliveryCost);
    if (!isFirebaseConfigured()) {
      const current = getDemoOrders();
      const updated = current.map(o => o.id === id ? { ...o, deliveryCost: numericCost, status: 'approved' } : o);
      saveDemoOrders(updated);
      return;
    }
    return updateDoc(doc(db, 'orders', id), { deliveryCost: numericCost, status: 'approved', updatedAt: serverTimestamp() });
  };

  const deleteOrder = async (id) => {
    if (!isFirebaseConfigured()) {
      const current = getDemoOrders();
      const updated = current.filter(o => o.id !== id);
      saveDemoOrders(updated);
      return;
    }
    return deleteDoc(doc(db, 'orders', id));
  };

  return { 
    orders, 
    loading, 
    createOrder, 
    updateOrderStatus, 
    updateOrderDelivery,
    deleteOrder
  };
}

export function useStoreConfig() {
  const { config, updateStoreConfig, loading } = useStoreContext();
  return { config, updateConfig: updateStoreConfig, loading };
}
