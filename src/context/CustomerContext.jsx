// src/context/CustomerContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const CustomerContext = createContext(null);

const KEYS = {
  phone: 'savit_customer_phone',
  name:  'savit_customer_name',
};



function loadFromStorage() {
  const phone = localStorage.getItem(KEYS.phone);
  const name  = localStorage.getItem(KEYS.name);
  if (phone && name) return { phone, name };
  return null;
}

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(() => loadFromStorage());
  const [loading, setLoading]   = useState(false);
  const [isSyncing, setIsSyncing] = useState(!!customer?.phone);

  const isIdentified = !!customer?.phone && !!customer?.name;

  // Sync customer data with Firestore whenever the phone changes
  useEffect(() => {
    if (!customer?.phone) {
      setIsSyncing(false);
      return;
    }
    
    const ref = doc(db, 'customers', customer.phone);

    // Actualizar lastSeen silenciosamente al iniciar la sesión
    updateDoc(ref, { lastSeen: new Date().toISOString() }).catch(() => {});

    // Escucha activa en tiempo real
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomer(prev => {
          const merged = { ...prev, ...data };
          // Sincronizar el localStorage con la nube
          if (data.name) localStorage.setItem(KEYS.name, data.name);
          return merged;
        });
        console.log('CustomerContext: Perfil sincronizado en tiempo real.');
      }
      setIsSyncing(false);
    }, (error) => {
      console.warn('CustomerContext: Firestore sync error', error);
      setIsSyncing(false);
    });

    // Limpiar el listener cuando el componente se desmonte o cambie el teléfono
    return () => unsubscribe();
  }, [customer?.phone]);

  /**
   * Look up a phone number in Firestore.
   * Returns the customer profile if found, null otherwise.
   * @param {string} phone – normalized phone (digits only, no +)
   */
  const checkCustomer = useCallback(async (phone) => {
    const normalized = phone.replace(/\D/g, '');
    try {
      const ref  = doc(db, 'customers', normalized);
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data();
      return null;
    } catch (e) {
      console.warn('CustomerContext: checkCustomer error', e);
      return null;
    }
  }, []);

  /**
   * Save / update customer profile in Firestore + localStorage.
   * @param {object} profile – { name, phone }
   */
  const identifyCustomer = useCallback(async ({ name, phone }) => {
    console.log('CustomerContext: Iniciando identifyCustomer con:', { name, phone });
    setLoading(true);
    const normalized = phone.replace(/\D/g, '');
    let finalProfile = { name, phone: normalized };

    try {
      console.log('CustomerContext: Buscando documento en customers:', normalized);
      const ref  = doc(db, 'customers', normalized);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        console.log('CustomerContext: El cliente ya existe. Actualizando nombre y lastSeen...');
        const existingData = snap.data();
        await updateDoc(ref, { name, lastSeen: new Date().toISOString() });
        console.log('CustomerContext: updateDoc exitoso.');
        finalProfile = { ...existingData, ...finalProfile, lastSeen: new Date().toISOString() };
      } else {
        console.log('CustomerContext: El cliente no existe. Creando nuevo documento...');
        const newData = {
          name,
          phone: normalized,
          createdAt:  new Date().toISOString(),
          lastSeen:   new Date().toISOString(),
        };
        await setDoc(ref, newData);
        console.log('CustomerContext: setDoc exitoso. Documento creado:', newData);
        finalProfile = newData;
      }
    } catch (e) {
      console.error('CustomerContext: Error crítico al guardar en Firestore:', e);
      console.error('CustomerContext: Código de error:', e.code);
      console.error('CustomerContext: Mensaje de error:', e.message);
    } finally {
      setLoading(false);
    }

    console.log('CustomerContext: Guardando en localStorage y actualizando estado local:', finalProfile);
    localStorage.setItem(KEYS.phone, normalized);
    localStorage.setItem(KEYS.name, name);
    setCustomer(finalProfile);
  }, []);

  /**
   * Set customer directly in state and localStorage without writing to Firestore.
   * Useful when sync-loading from AuthContext user profile.
   */
  const setCustomerDirectly = useCallback(({ name, phone }) => {
    if (!phone || !name) return;
    const normalized = phone.replace(/\D/g, '');
    localStorage.setItem(KEYS.phone, normalized);
    localStorage.setItem(KEYS.name, name);
    setCustomer(prev => {
      // Evitar actualizaciones de estado si son idénticas
      if (prev?.phone === normalized && prev?.name === name) return prev;
      return { ...prev, name, phone: normalized };
    });
  }, []);

  /**
   * Clear customer session.
   */
  const logoutCustomer = useCallback(() => {
    localStorage.removeItem(KEYS.phone);
    localStorage.removeItem(KEYS.name);
    setCustomer(null);
  }, []);

  return (
    <CustomerContext.Provider value={{
      customer,
      isIdentified,
      isSyncing,
      loading,
      checkCustomer,
      identifyCustomer,
      setCustomerDirectly,
      logoutCustomer,
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider');
  return ctx;
}
