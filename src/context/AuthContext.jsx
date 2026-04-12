import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('savit_guest') === 'true');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurar persistencia local
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsGuest(false);
        localStorage.removeItem('savit_guest');
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            const actualWhatsapp = data.whatsapp || data.phone || '';
            
            // Sincronizar localStorage para el filtro de pedidos
            if (actualWhatsapp) {
              localStorage.setItem('savit_customer_phone', actualWhatsapp);
            }

            const needsSetup = !data.name || !actualWhatsapp;
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              displayName: firebaseUser.displayName, 
              photoURL: firebaseUser.photoURL, 
              name: data.name || firebaseUser.displayName || 'Healthy Friend',
              whatsapp: actualWhatsapp,
              isAdmin: data.role === 'admin',
              ...data, 
              isNewUser: needsSetup 
            });
          } else {
            // Primer login: construir perfil base
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              displayName: firebaseUser.displayName, 
              photoURL: firebaseUser.photoURL, 
              name: firebaseUser.displayName || 'Healthy Friend',
              isNewUser: true 
            });
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
          setUser({ 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            displayName: firebaseUser.displayName, 
            name: firebaseUser.displayName || 'Healthy Friend',
            isNewUser: true 
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- AUTH METHODS ---

  const loginAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('savit_guest', 'true');
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, extraData = {}) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', res.user.uid), {
      uid: res.user.uid,
      email,
      ...extraData,
      role: extraData.role || 'customer',
      createdAt: new Date().toISOString(),
    });
    return res;
  };

  // CAMBIADO: De signInWithRedirect a signInWithPopup (mucho más confiable)
  const googleLogin = () => signInWithPopup(auth, googleProvider);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('savit_guest');
    localStorage.removeItem('savit_customer_phone');
    localStorage.removeItem('savit_customer_name');
  };

  const updateProfile = async (data) => {
    if (!user?.uid) throw new Error('No user logged in');
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await updateDoc(userRef, { ...data, updatedAt: new Date().toISOString() });
    } else {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        ...data,
        createdAt: new Date().toISOString(),
      });
    }

    // Actualizar estado local inmediatamente
    if (data.whatsapp) {
      localStorage.setItem('savit_customer_phone', data.whatsapp);
    }
    setUser(prev => ({ ...prev, ...data, name: data.name || prev.name }));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isGuest, 
      isAdmin: user?.isAdmin || false,
      login, 
      register, 
      googleLogin, 
      logout, 
      updateProfile,
      loginAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
}
