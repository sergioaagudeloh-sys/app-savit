// src/context/CustomerContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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

  const isIdentified = !!customer?.phone && !!customer?.name;

  // Sync lastSeen with Firestore on mount if already identified
  useEffect(() => {
    if (!customer?.phone) return;
    const syncLastSeen = async () => {
      try {
        const ref  = doc(db, 'customers', customer.phone);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, { lastSeen: new Date().toISOString() });
          const data   = snap.data();
          const merged = { ...customer, ...data };
          setCustomer(merged);
          localStorage.setItem(KEYS.name, merged.name || customer.name);
        }
      } catch (e) {
        console.warn('CustomerContext: Firestore sync error', e);
      }
    };
    syncLastSeen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setLoading(true);
    const normalized = phone.replace(/\D/g, '');
    try {
      const ref  = doc(db, 'customers', normalized);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { name, lastSeen: new Date().toISOString() });
      } else {
        await setDoc(ref, {
          name,
          phone: normalized,
          createdAt:  new Date().toISOString(),
          lastSeen:   new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('CustomerContext: Could not save to Firestore:', e);
    } finally {
      setLoading(false);
    }

    const profile = { name, phone: normalized };
    localStorage.setItem(KEYS.phone, normalized);
    localStorage.setItem(KEYS.name, name);
    setCustomer(profile);
  }, []);

  /**
   * Add points to the current customer's profile.
   * @param {number} pointsToAdd 
   */
  const addPoints = useCallback(async (pointsToAdd) => {
    if (!customer?.phone) return;
    
    const newPoints = (customer.savitPoints || 0) + pointsToAdd;
    const updatedCustomer = { ...customer, savitPoints: newPoints };
    
    // 1. Update Local State
    setCustomer(updatedCustomer);
    
    // 2. Update Firestore
    try {
      const ref = doc(db, 'customers', customer.phone);
      await updateDoc(ref, { 
        savitPoints: newPoints,
        lastSeen: new Date().toISOString()
      });
    } catch (e) {
      console.warn('CustomerContext: Error updating points in Firestore', e);
    }
  }, [customer]);

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
      loading,
      checkCustomer,
      identifyCustomer,
      logoutCustomer,
      addPoints,
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
