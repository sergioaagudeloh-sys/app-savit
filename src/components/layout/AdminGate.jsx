// src/components/layout/AdminGate.jsx
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../firebase';
import './AdminGate.css';

const ADMIN_EMAIL    = 'admin@savit.com';
const ADMIN_PASSWORD = 'admin123';

/**
 * AdminGate
 *
 * Two-layer authentication:
 *  1. Local credential check (email + password match constants)
 *  2. Firebase Auth sign-in (enables Storage write access)
 *
 * On first ever login the Firebase Auth account is auto-created
 * so no manual setup in Firebase Console is required.
 */
export default function AdminGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem('savit_admin_auth') === 'true'
  );
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
          // If creation also fails (e.g. weak password policy), continue anyway —
          // the app still works; only image uploads to Storage will require auth.
          console.warn('Could not create Firebase admin account:', createErr.message);
        }
      }
      // Other errors (network, etc.) are non-blocking — skip silently.
    }

    // ── 3. Persist session & grant access ─────────────────────
    localStorage.setItem('savit_admin_auth', 'true');
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
