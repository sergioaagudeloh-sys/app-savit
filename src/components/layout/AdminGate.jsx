// src/components/layout/AdminGate.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import './AdminGate.css';

/** Detect browser name */
function detectBrowser(ua) {
  if (/edg/i.test(ua))     return 'Microsoft Edge';
  if (/chrome/i.test(ua))  return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua))  return 'Safari';
  if (/opr/i.test(ua))     return 'Opera';
  return 'Desconocido';
}

/** Detect OS */
function detectOS(ua) {
  if (/windows/i.test(ua))     return 'Windows';
  if (/android/i.test(ua))     return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iOS';
  if (/mac/i.test(ua))         return 'macOS';
  if (/linux/i.test(ua))       return 'Linux';
  return 'Desconocido';
}

export default function AdminGate({ children }) {
  // Estado fundamental de autenticación (Fuente de verdad: Firebase Auth)
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  
  // Estados del formulario y registro
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [adminExists, setAdminExists] = useState(null); // null means checking, avoids flickering
  
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Verificar si ya existe un administrador en el sistema
  useEffect(() => {
    const checkAdminExistence = async () => {
      if (!isFirebaseConfigured()) {
        setCheckingAuth(false);
        return;
      }
      try {
        const adminDocRef = doc(db, 'config', 'adminStatus');
        const adminSnap = await getDoc(adminDocRef);
        if (adminSnap.exists() && adminSnap.data().hasAdmin) {
          setAdminExists(true);
        } else {
          setAdminExists(false);
        }
      } catch (err) {
        console.error("Error al consultar estado de administrador", err);
        setAdminExists(true);
      } finally {
        // Solo quitamos el spinner cuando ya sabemos si el admin existe o no
        setCheckingAuth(false);
      }
    };
    checkAdminExistence();
  }, []);

  // Sincronizar con Firebase Auth (La única fuente de verdad)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // FIX: Sincronizar la bandera local para que NotificationContext pueda abrir el listener
        localStorage.setItem('savit_admin_auth', 'true');
        localStorage.setItem('savit_admin_auth_time', Date.now().toString());
      } else {
        setCurrentUser(null);
        localStorage.removeItem('savit_admin_auth');
        localStorage.removeItem('savit_admin_auth_time');
      }
      // No seteamos checkingAuth a false aquí, lo dejamos para el check de adminExistence
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Bloquear si se intenta registrar pero ya existe un administrador
        if (adminExists) {
          setError("Ya existe un administrador registrado en el sistema. Creación bloqueada.");
          setLoading(false);
          return;
        }

        // Crear el usuario admin
        await createUserWithEmailAndPassword(auth, email, password);
        
        // Marcar en la base de datos que ya hay un administrador
        if (isFirebaseConfigured()) {
          const adminDocRef = doc(db, 'config', 'adminStatus');
          await setDoc(adminDocRef, { 
            hasAdmin: true, 
            registeredAt: serverTimestamp(),
            email: email 
          });
        }
        
        setAdminExists(true);
        setIsRegisterMode(false);
        // El login ocurrirá automáticamente gracias a onAuthStateChanged
      } else {
        // Modo login
        await signInWithEmailAndPassword(auth, email, password);
        
        // Loggear el acceso exitoso
        if (isFirebaseConfigured()) {
          try {
            const ua = navigator.userAgent;
            await addDoc(collection(db, 'adminLogs'), {
              loginAt:   serverTimestamp(),
              email:     email,
              browser:   detectBrowser(ua),
              os:        detectOS(ua),
              userAgent: ua.slice(0, 200),
            });
          } catch (logErr) {
            console.warn('No se pudo guardar el log de acceso:', logErr.message);
          }
        }
      }
    } catch (firebaseErr) {
      console.error("Auth error:", firebaseErr.code);
      let msg = isRegisterMode ? 'Error al crear la cuenta.' : 'Credenciales inválidas.';
      if (firebaseErr.code === 'auth/too-many-requests') {
        msg = 'Demasiados intentos fallidos. Intenta más tarde.';
      } else if (firebaseErr.code === 'auth/network-request-failed') {
        msg = 'Error de red. Revisa tu conexión.';
      } else if (firebaseErr.code === 'auth/email-already-in-use') {
        msg = 'El correo ya está registrado.';
      } else if (firebaseErr.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else if (firebaseErr.code === 'auth/invalid-credential' || firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/user-not-found') {
        msg = 'Correo o contraseña incorrectos.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  if (checkingAuth) {
    return (
      <div className="admin-gate-overlay">
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  // Si está autenticado, mostramos el contenido protegido
  if (currentUser) {
    return (
      <>
        {/* Agregamos un botón flotante de logout o similar si fuera necesario, 
            pero por ahora dejamos que el sidebar maneje el cierre de sesión si existe */}
        {children}
      </>
    );
  }

  // Si no está autenticado, mostramos el formulario de acceso o registro
  return (
    <div className="admin-gate-overlay">
      <div className="admin-gate-modal">
        <div className="admin-gate-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <rect x="9" y="10" width="6" height="4" rx="1"/>
            <path d="M12 14v2"/>
          </svg>
        </div>
        
        <h2 className="admin-gate-title">
          {isRegisterMode ? 'Configuración Maestra' : 'Acceso Administrativo'}
        </h2>
        <p className="admin-gate-desc">
          {isRegisterMode 
            ? 'Crea tu superusuario de acceso seguro a Sávit.' 
            : 'Módulo reservado para directivos Sávit.'}
        </p>

        <form onSubmit={handleSubmit} className="admin-gate-form">
          <div className="admin-input-group">
            <input
              type="email"
              placeholder="Correo Administrativo"
              className="admin-input-elite"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          
          <div className="admin-input-group">
            <input
              type="password"
              placeholder="Clave de seguridad"
              className="admin-input-elite"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
              minLength={isRegisterMode ? 6 : undefined}
            />
          </div>
          
          {error && <p className="admin-gate-error">{error}</p>}
          
          <button
            type="submit"
            className="admin-btn-elite"
            disabled={loading}
          >
            {loading ? <span className="spinner elite-spinner" /> : (isRegisterMode ? 'CREAR PERFIL MAESTRO' : 'VERIFICAR IDENTIDAD')}
          </button>
        </form>

        {adminExists === false && !isRegisterMode && (
          <button
            className="admin-btn-text"
            onClick={() => {
              setIsRegisterMode(true);
              setError('');
            }}
          >
            Aún no hay Superusuarios. <strong>Regístrate</strong>
          </button>
        )}

        {isRegisterMode && (
          <button
            className="admin-btn-text"
            onClick={() => {
              setIsRegisterMode(false);
              setError('');
            }}
          >
            Volver a inicio de sesión seguro
          </button>
        )}

        {!isRegisterMode && (
          <button
            className="admin-btn-text minimal mt-auto"
            onClick={() => navigate('/')}
          >
            Regresar a la tienda
          </button>
        )}
      </div>
    </div>
  );
}
