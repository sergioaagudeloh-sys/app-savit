// src/context/StoreContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

const StoreContext = createContext();

const DEFAULT_CONFIG = {
  isOpen: true,
  whatsappNumber: '573216513171',
  storeName: 'Savit - Mercado Saludable',
  googleDriveLink: '',
  paymentAccount: '', // Número Nequi/Bancolombia para instrucciones de pago
  scheduleEnabled: false,
  openTime: '09:00',
  closeTime: '18:00',
  promo: {
    active: true,
    title: '¡Combo Desayuno Fit al 20% de Dcto!',
    description: 'Aprovecha nuestros nuevos bowls de acai con granola artesanal, exclusivo por hoy.',
    imageUrl: '',
    price: ''
  }
};

export function StoreProvider({ children }) {
  // Inicializamos con localStorage para que los cambios locales del admin se vean en el cliente sin Firebase
  const [config, setConfig] = useState(() => {
    try {
      const local = localStorage.getItem('savit_store_config');
      if (local) {
        const parsed = JSON.parse(local);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          isOpen: parsed.isOpen === true // Force boolean
        };
      }
    } catch (e) {}
    return DEFAULT_CONFIG;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('savit_store_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'savit_store_config' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return () => window.removeEventListener('storage', handleStorage);
    }

    const unsub = onSnapshot(doc(db, 'config', 'store'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig(prev => ({ ...prev, ...data }));
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching store config:', error);
      setLoading(false);
    });
    
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Automatic Schedule Check logic
  useEffect(() => {
    if (!config.scheduleEnabled) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMins.toString().padStart(2, '0')}`;

      const shouldBeOpen = currentTimeStr >= config.openTime && currentTimeStr < config.closeTime;
      
      if (shouldBeOpen !== config.isOpen) {
        updateStoreConfig({ isOpen: shouldBeOpen });
      }
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Run immediately

    return () => clearInterval(interval);
  }, [config.scheduleEnabled, config.openTime, config.closeTime, config.isOpen]);

  const updateStoreConfig = async (newData) => {
    setConfig(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('savit_store_config', JSON.stringify(updated));
      return updated;
    });

    if (isFirebaseConfigured()) {
      try {
        await updateDoc(doc(db, 'config', 'store'), newData);
      } catch (e) {
        console.error('Error updating store config in Firebase:', e);
      }
    }
  };

  return (
    <StoreContext.Provider value={{ config, updateStoreConfig, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStoreContext must be used within StoreProvider');
  return context;
}
