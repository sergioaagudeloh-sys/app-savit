// src/firebase.js
// Reemplaza los valores de .env con tus credenciales reales de Firebase
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios con Persistencia Offline Habilitada
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const isFirebaseConfigured = () => {
  const key = firebaseConfig.apiKey;
  if (!key) return false;
  // Reject any placeholder value (Spanish or English)
  const placeholders = ['TU_API_KEY', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (placeholders.includes(key)) return false;
  if (key.length < 10) return false;
  return true;
};

export default app;
