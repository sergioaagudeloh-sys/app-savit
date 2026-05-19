// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db, isFirebaseConfigured } from '../firebase';
import { useCustomer } from './CustomerContext';
import { playNotificationSound, playOrderUpdateSound } from '../utils/audio';
import { formatCOP, checkIsPaidThisMonth } from '../utils/formatters';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  limit,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const location = useLocation();
  const { customer } = useCustomer();
  const isAdmin = location.pathname.startsWith('/admin');
  // Only treat the session as an authenticated admin if the local auth flag is set.
  // This prevents Firestore listeners from opening BEFORE the admin logs in.
  const isAdminAuthenticated = isAdmin && localStorage.getItem('savit_admin_auth') === 'true';
  const currentRole = isAdmin ? 'admin' : 'client';
  const userId = customer?.phone || 'anonymous';

  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const isFirstLoad = useRef(true);

  // --- TOAST LOGIC ---
  // C1 FIX: showToastRef mantiene siempre la versión más reciente de showToast
  // para que el closure del listener de Firestore nunca capture una versión stale.
  const showToastRef = useRef(null);

  const showToast = (message, type = 'info', title = '', customDuration = null) => {
    const id = Date.now();
    
    // Tiempos Dinámicos según requerimiento:
    // - Órdenes: 8 segundos (suficiente para llamar la atención)
    // - Mensajes/Chat: 4 segundos
    // - Sistema / Guardado / Info: 1 segundo (rápido y ágil)
    let duration = 1000;
    if (customDuration) {
      duration = customDuration;
    } else if (type === 'order') {
      duration = 8000;
    } else if (type === 'chat' || type === 'message') {
      duration = 4000;
    } else {
      duration = 1000;
    }
    
    const newToast = { id, message, type, title, duration };
    setToasts(prev => [...prev, newToast]);

    // Actualizar la ref siempre que se recrea la función
    // (se hace abajo con useEffect, aquí sólo usamos el id recién creado)
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
      setTimeout(() => {
        removeToast(id);
      }, 300);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // C1 FIX: Mantener la ref sincronizada con la función más reciente
  useEffect(() => {
    showToastRef.current = showToast;
  });

  // Synchronization logic
  useEffect(() => {
    // FALLBACK: LocalStorage (No Firebase)
    if (!isFirebaseConfigured()) {
      const handleSync = () => {
        try {
          const saved = localStorage.getItem('savit_notifications');
          setNotifications(saved ? JSON.parse(saved) : []);
        } catch (e) {
          setNotifications([]);
        }
      };
      
      handleSync();
      window.addEventListener('storage', handleSync);
      window.addEventListener('savit_notifications_changed', handleSync);
      return () => {
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('savit_notifications_changed', handleSync);
      };
    }

    // GUARD: If the user is on an admin route but NOT yet authenticated,
    // do NOT open the Firestore listener. This prevents order notifications
    // from appearing on the admin login screen.
    if (isAdmin && !isAdminAuthenticated) {
      setNotifications([]);
      return;
    }

    // Reset flag whenever identity changes to catch the first "added" batch of the new listener
    isFirstLoad.current = true;

    // FIREBASE: Real-time synchronization
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'notifications'), 
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    } else {
      // C2 FIX: Filtrado estricto de seguridad en Firestore para clientes.
      // Previene fugas de datos de otras órdenes o notificaciones administrativas.
      // Requiere índice compuesto en Firebase: userId (ASC) y timestamp (DESC)
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }
    
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp 
        };
      });

      // --- Efecto de Sonido y Toasts ---
      // We only show toasts for documents ADDED after the initial load of THIS specific listener instance
      if (!isFirstLoad.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotif = change.doc.data();
            const isForMe = isAdmin 
              ? (newNotif.targetRole === 'admin' || !newNotif.targetRole)
              : (newNotif.userId === userId && newNotif.targetRole !== 'admin');

            if (isForMe) {
              // Play sound
              if (newNotif.orderId) {
                playOrderUpdateSound();
              } else {
                playNotificationSound();
              }

              // Show Toast — usamos showToastRef para evitar closure stale (fix C1)
              showToastRef.current?.(
                newNotif.message || 'Nueva notificación', 
                newNotif.orderId ? 'order' : (newNotif.type || 'info'),
                newNotif.title || (isAdmin ? 'Aviso Admin' : 'Sávit')
              );
            }
          }
        });
      }
      if (isFirstLoad.current) isFirstLoad.current = false;

      setNotifications(docs);
    }, (err) => {
      console.error('Error syncing notifications:', err);
    });

    return unsub;
  }, [userId, isAdmin, isAdminAuthenticated, currentRole]);

  // --- CHECK SUBSCRIPTIONS LOGIC ---
  useEffect(() => {
    // Guard: only run subscription checks when admin is fully authenticated
    if (isAdminAuthenticated && isFirebaseConfigured()) {
      const checkSubscriptions = async () => {
        try {
          const now = new Date();
          const currentDay = now.getDate();
          const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
          
          const q = query(collection(db, 'subscriptions'), where('active', '==', true));
          const snap = await getDocs(q);
          
          // M5 FIX: Usar Promise.all con map en lugar de forEach(async)
          // para garantizar que cada subscripción se procesa en serie y que
          // updateDoc (lastNotifiedMonth) se ejecuta antes de pasar a la siguiente.
          await Promise.all(snap.docs.map(async (d) => {
            const sub = d.data();
            const subId = d.id;
            
            if (!sub || !sub.name) return;
            
            // Si ya está pagado este mes, no notificar recordatorios de pago
            if (checkIsPaidThisMonth(sub.lastPaidMonth, now)) return;

            // Si ya notificamos este mes, saltar
            if (sub.lastNotifiedMonth === currentMonthKey) return;

            const daysUntilDue = sub.dayOfMonth - currentDay;
            const amount = Number(sub.amount) || 0;
            
            // Condición para notificar: 
            // 1. Falta poco (0-3 días)
            // 2. YA PASÓ el día este mes y no se notificó (importante!)
            const isSoon = daysUntilDue >= 0 && daysUntilDue <= 3;
            const isOverdue = daysUntilDue < 0; // Ya pasó el día del mes

            if (isSoon || isOverdue) {
              let label = '';
              let type = 'info';
              
              if (daysUntilDue === 0) {
                label = 'VENCE HOY ⚠️';
                type = 'danger';
              } else if (daysUntilDue === 1) {
                label = 'Vence mañana';
                type = 'warning';
              } else if (isOverdue) {
                label = `VENCIDO (hace ${Math.abs(daysUntilDue)} días) 🛑`;
                type = 'danger';
              } else {
                label = `Vence en ${daysUntilDue} días`;
                type = 'info';
              }

              await addNotification({
                title: 'Recordatorio de Pago',
                message: `El servicio "${sub.name}" (${sub.category}) por ${formatCOP(amount)} ${label}.`,
                type: type,
                targetRole: 'admin',
                subscriptionId: subId,
                category: 'subscription'
              });

              // Actualizar para no repetir este mes — garantizado que ocurre SIEMPRE
              await updateDoc(doc(db, 'subscriptions', subId), {
                lastNotifiedMonth: currentMonthKey
              });
            }
          }));
        } catch (err) {
          console.error('Error checking subscriptions:', err);
        }
      };
      
      // Delay initial check slightly to avoid CPU spike on mount
      const timeout = setTimeout(checkSubscriptions, 3000);
      const interval = setInterval(checkSubscriptions, 1000 * 60 * 60 * 6); // Cada 6 horas
      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }
  }, [isAdminAuthenticated]);

  const addNotification = async (notif) => {
    const newNotif = {
      timestamp: isFirebaseConfigured() ? serverTimestamp() : new Date().toISOString(),
      read: false,
      userId: userId || 'anonymous',
      customerName: notif.customerName || '',
      ...notif,
    };

    if (isFirebaseConfigured()) {
      try {
        await addDoc(collection(db, 'notifications'), newNotif);
      } catch (err) {
        console.error('Error adding notification to Firebase:', err);
      }
    } else {
      const saved = JSON.parse(localStorage.getItem('savit_notifications') || '[]');
      const localNotif = { ...newNotif, id: `notif_${Date.now()}` };
      const updated = [localNotif, ...saved];
      localStorage.setItem('savit_notifications', JSON.stringify(updated.slice(0, 50)));
      window.dispatchEvent(new Event('savit_notifications_changed'));
      setNotifications(updated);
      
      // Local toast triggers
      showToast(notif.message, notif.type, notif.title);
    }
  };

  const markAsRead = async (id) => {
    if (isFirebaseConfigured() && !id.startsWith('notif_')) {
      try {
        await updateDoc(doc(db, 'notifications', id), { read: true });
      } catch (err) {
        console.error('Error marking as read in Firebase:', err);
      }
    } else {
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('savit_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('savit_notifications_changed'));
      setNotifications(updated);
    }
  };

  const markAllAsRead = async () => {
    const unreadFiltered = userNotifications.filter(n => !n.read);
    
    if (isFirebaseConfigured()) {
      try {
        await Promise.all(unreadFiltered.map(n => 
          updateDoc(doc(db, 'notifications', n.id), { read: true })
        ));
      } catch (err) {
        console.error('Error marking all as read in Firebase:', err);
      }
    } else {
      const updated = notifications.map(n => 
        (n.targetRole === currentRole || !n.targetRole) ? { ...n, read: true } : n
      );
      localStorage.setItem('savit_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('savit_notifications_changed'));
      setNotifications(updated);
    }
  };

  const clearNotifications = async () => {
    if (isFirebaseConfigured()) {
      try {
        await Promise.all(userNotifications.map(n => 
          deleteDoc(doc(db, 'notifications', n.id))
        ));
      } catch (err) {
        console.error('Error clearing notifications in Firebase:', err);
      }
    } else {
      localStorage.setItem('savit_notifications', JSON.stringify([]));
      window.dispatchEvent(new Event('savit_notifications_changed'));
      setNotifications([]);
    }
  };

  const clearSubscriptionNotifications = async (subId) => {
    if (isFirebaseConfigured()) {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('subscriptionId', '==', subId)
        );
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'notifications', d.id))));
      } catch (err) {
        console.error('Error clearing subscription notifications in Firebase:', err);
      }
    } else {
      const saved = JSON.parse(localStorage.getItem('savit_notifications') || '[]');
      const updated = saved.filter(n => n.subscriptionId !== subId);
      localStorage.setItem('savit_notifications', JSON.stringify(updated));
      window.dispatchEvent(new Event('savit_notifications_changed'));
      setNotifications(updated);
    }
  };

  const userNotifications = notifications.filter(n => {
    if (currentRole === 'admin') {
      return n.targetRole === 'admin' || !n.targetRole || n.targetRole === 'all';
    }
    if (n.targetRole === 'admin') return false;
    return n.userId === userId || !n.userId || n.userId === 'anonymous';
  });

  const unreadCount = userNotifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications: userNotifications, 
      toasts,
      showToast,
      removeToast,
      addNotification, 
      markAsRead, 
      markAllAsRead,
      clearNotifications,
      clearSubscriptionNotifications,
      unreadCount,
      isOpen,
      setIsOpen
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
