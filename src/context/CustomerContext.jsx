// src/context/CustomerContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const CustomerContext = createContext(null);

const KEYS = {
  phone: 'savit_customer_phone',
  name:  'savit_customer_name',
};

// Simple deterministic hash for the 4-digit PIN
// We use a lightweight approach without crypto libs for PWA compatibility
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`savit_pin_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  // true when the customer has already set a security PIN
  const hasPin = !!customer?.securityPin;

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
   * Hash and save a 4-digit PIN for the current customer.
   * Stores the hashed PIN in Firestore under `securityPin`.
   * @param {string} pin – 4 digit string
   */
  const savePin = useCallback(async (pin) => {
    if (!customer?.phone) return false;
    try {
      const hashed = await hashPin(pin);
      const ref = doc(db, 'customers', customer.phone);
      await updateDoc(ref, { securityPin: hashed });
      setCustomer(prev => ({ ...prev, securityPin: hashed }));
      return true;
    } catch (e) {
      console.warn('CustomerContext: Error saving PIN', e);
      return false;
    }
  }, [customer]);

  /**
   * Verify a PIN attempt against the stored hash.
   * @param {string} pin – 4 digit string entered by the user
   * @returns {Promise<boolean>}
   */
  const verifyPin = useCallback(async (pin) => {
    if (!customer?.securityPin) return false;
    try {
      const hashed = await hashPin(pin);
      return hashed === customer.securityPin;
    } catch (e) {
      console.warn('CustomerContext: Error verifying PIN', e);
      return false;
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
      hasPin,
      loading,
      checkCustomer,
      identifyCustomer,
      logoutCustomer,
      savePin,
      verifyPin,
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
