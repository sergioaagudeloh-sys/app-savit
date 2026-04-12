// src/pages/Welcome.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import CustomerWizard from '../components/ui/CustomerWizard';
import './Welcome.css';

export default function Welcome() {
  const navigate  = useNavigate();
  const { isIdentified } = useCustomer();
  const [showWizard, setShowWizard] = useState(false);

  const handleStart = () => {
    if (isIdentified) {
      navigate('/home');
    } else {
      setShowWizard(true);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    navigate('/home');
  };

  return (
    <div className="welcome-container">
      {/* Admin access */}
      <button
        className="admin-access-btn"
        onClick={() => navigate('/admin')}
        aria-label="Acceso Administrativo"
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 100,
          background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px',
          padding: '8px 12px', color: 'white', fontWeight: 'bold', fontSize: '1.2rem',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        ⚙️
      </button>

      {/* Hero banner */}
      <div className="welcome-image">
        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"
          alt="Mercado Saludable"
          loading="eager"
        />
      </div>

      {/* Content card */}
      <div className="welcome-content">
        <h1 className="welcome-title">Cuidamos Tu Bienestar</h1>
        <p className="welcome-desc">
          Alimentamos tu vida con lo mejor de la naturaleza.
        </p>

        <div className="welcome-actions">
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleStart}
            style={{ height: '60px', fontSize: '1.2rem', fontWeight: '800' }}
          >
            {isIdentified ? 'Ir al Inicio 🏠' : 'Ver Catálogo 🛒'}
          </button>
        </div>

        <div className="welcome-footer" style={{ marginTop: '24px', opacity: 0.7, fontSize: '0.85rem' }}>
          Sávit — Mercado Saludable
        </div>
      </div>

      {/* Registration wizard */}
      {showWizard && <CustomerWizard onClose={handleWizardClose} />}
    </div>
  );
}
