// src/components/layout/AdminGate.jsx
import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './AdminGate.css';

const ADMIN_EMAIL    = 'admin@savit.com';
const ADMIN_PASSWORD = 'admin123';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Detect browser name from userAgent */
function detectBrowser(ua) {
  if (/edg/i.test(ua))     return 'Microsoft Edge';
  if (/chrome/i.test(ua))  return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua))  return 'Safari';
  if (/opr/i.test(ua))     return 'Opera';
  return 'Desconocido';
}

/** Detect OS from userAgent */
function detectOS(ua) {
  if (/windows/i.test(ua))  return 'Windows';
  if (/android/i.test(ua))  return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iOS';
  if (/mac/i.test(ua))      return 'macOS';
  if (/linux/i.test(ua))    return 'Linux';
  return 'Desconocido';
}

/**
 * AdminGate
 *
 * Three-layer protection:
 *  1. Local credential check (email + password match constants)
 *  2. Firebase Auth sign-in (enables Storage write access)
 *  3. 24h automatic session expiry
 *
 * Also logs each login device/browser to Firestore (adminLogs).
 */
export default function AdminGate({ children }) {

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const flag = localStorage.getItem('savit_admin_auth') === 'true';
    const ts   = parseInt(localStorage.getItem('savit_admin_auth_time') || '0', 10);
    // Invalidate if older than 24h
    if (flag && Date.now() - ts > SESSION_TTL_MS) {
      localStorage.removeItem('savit_admin_auth');
      localStorage.removeItem('savit_admin_auth_time');
      return false;
    }
    return flag;
  });

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [expired,  setExpired]  = useState(false);

  // Periodic 24h expiry check (every 5 minutes while tab is open)
  useEffect(() => {
    const checkExpiry = () => {
      const flag = localStorage.getItem('savit_admin_auth') === 'true';
      const ts   = parseInt(localStorage.getItem('savit_admin_auth_time') || '0', 10);
      if (flag && Date.now() - ts > SESSION_TTL_MS) {
        localStorage.removeItem('savit_admin_auth');
        localStorage.removeItem('savit_admin_auth_time');
        setIsAuthenticated(false);
        setExpired(true);
      }
    };
    const interval = setInterval(checkExpiry, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExpired(false);

    // ── 1. Local credential check ──────────────────────────────
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      return;
    }

    setLoading(true);

    // ── 2. Firebase Auth sign-in (for Storage write access) ────
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    } catch (firebaseErr) {
      const code = firebaseErr.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        // First-time setup: create the admin account in Firebase Auth
        try {
          await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        } catch (createErr) {
          console.warn('Could not create Firebase admin account:', createErr.message);
        }
      }
      // Other errors (network, etc.) are non-blocking — skip silently.
    }

    // ── 3. Log device to Firestore ────────────────────────────
    if (isFirebaseConfigured()) {
      try {
        const ua = navigator.userAgent;
        await addDoc(collection(db, 'adminLogs'), {
          loginAt:  serverTimestamp(),
          browser:  detectBrowser(ua),
          os:       detectOS(ua),
          userAgent: ua.slice(0, 200), // truncate for storage
        });
      } catch (logErr) {
        console.warn('Could not save admin login log:', logErr.message);
      }
    }

    // ── 4. Persist session with timestamp & grant access ──────
    localStorage.setItem('savit_admin_auth', 'true');
    localStorage.setItem('savit_admin_auth_time', String(Date.now()));
    setIsAuthenticated(true);
    setLoading(false);
  };

  if (isAuthenticated) return children;

  return (
    <div className="admin-gate-overlay">
      <div className="admin-gate-modal">
        <div className="admin-gate-icon">🛡️</div>
        <h2 className="admin-gate-title">Acceso Administrativo</h2>
        <p className="admin-gate-desc">
          Introduce tus credenciales para gestionar la tienda.
        </p>

        {expired && (
          <div className="admin-gate-expired-notice">
            🕒 Tu sesión expiró por seguridad (24h). Por favor, vuelve a ingresar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-gate-form">
          <input
            type="email"
            placeholder="Correo Electrónico"
            className="input-field"
            style={{ marginBottom: '12px' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="admin-gate-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary w-full mt-md"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Ingresar al Panel'}
          </button>
        </form>

        <button
          className="btn btn-ghost w-full mt-sm text-sm"
          onClick={() => (window.location.href = '/')}
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}
