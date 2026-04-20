// src/pages/Welcome.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import { motion, AnimatePresence } from 'framer-motion';
import CustomerWizard from '../components/ui/CustomerWizard';
import SEO from '../components/common/SEO';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const { isIdentified, hasPin } = useCustomer();
  const [showWizard, setShowWizard] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Experience redirection sync - IMMERSIVE TIMING
  useEffect(() => {
    // Experiencia de Redirección: Solo si NO estamos en el Wizard
    if (isEntering && !showWizard) {
      const timer = setTimeout(() => {
        if (isIdentified && hasPin) {
          navigate('/home');
        } else {
          setShowWizard(true);
        }
      }, 950); 
      return () => clearTimeout(timer);
    }
  }, [isEntering, isIdentified, hasPin, navigate, showWizard]);

  const onDrag = (event, info) => {
    if (isEntering) return;

    // Trigger Activation
    if (info.offset.y < -75) {
      setIsEntering(true);
    }
  };

  const onDragEnd = () => {
    // removed audio references
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    navigate('/home');
  };

  return (
    <div className={`welcome-container ${isEntering ? 'entering-flow' : ''}`}>
      <SEO 
        title="Bienvenidos a Sávit - Mercado Saludable"
        description="Vive saludable con Sávit. Productos naturales, keto y sin gluten. ¡Entra y descubre una forma más sana de alimentarte!"
      />
      {/* ⚙️ Secret Admin Control */}
      {!isEntering && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="admin-touch-btn"
          onClick={() => navigate('/admin')}
          aria-label="Admin"
        >
          ⚙️
        </motion.button>
      )}

      {/* 1. TOP SECTION: THE FACADE IMAGE */}
      <div className="welcome-top-section">
        <motion.img
          src="/facade_v_final_v2.jpg?v=2" 
          key="facade_v2_final"
          alt="Sávit Facade"
          initial={{ scale: 1 }}
          animate={{
            scale: isEntering ? 5 : 1, 
          }}
          transition={{
            duration: 0.85, 
            ease: "easeIn",
          }}
          onError={(e) => {
            e.target.src = "/facade.jpg";
          }}
        />
      </div>

      {/* 2. BOTTOM SECTION: CURVED MODAL */}
      <motion.div 
        className="welcome-bottom-section"
        animate={{
          y: isEntering ? '110%' : 0, 
        }}
        transition={{ duration: 0.8, ease: "easeIn" }}
      >
        <div className="welcome-badge-trigger-wrap">
          <motion.div 
            className="swipe-hint"
            animate={{ y: [0, -6, 0] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <span className="swipe-arrow">↑</span>
            <span className="swipe-text">Desliza para entrar</span>
          </motion.div>

          <motion.div
            drag="y"
            dragConstraints={{ top: -100, bottom: 0 }}
            dragElastic={0.2}
            dragMomentum={false}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            whileDrag={{ scale: 1.15 }}
            onClick={() => setIsEntering(true)} // Desktop fallback
            className="welcome-brand-badge interactive-badge"
          >
            <div className="badge-pulse-ring"></div>
            <div className="badge-inner-clipping">
              <div className="badge-shimmer"></div>
              <img 
                src="/logo.png" 
                alt="Sávit Logo" 
                className="welcome-logo-img"
                draggable={false} // Prevent browser image drag interference
              />
            </div>
          </motion.div>
        </div>

        <main className="welcome-content-wrap">
          <h1 className="welcome-title-split">Cuidamos Tu Bienestar</h1>
          <p className="welcome-subtitle-split">
            Alimentamos tu vida con lo mejor de la naturaleza, fresco y directo a tu hogar.
          </p>
        </main>

        <footer className="welcome-footer-tag">
          Sávit — Mercado Saludable
        </footer>
      </motion.div>

      {/* 3. PERSISTENT FLASH COVER (Premium Transition) */}
      <AnimatePresence>
        {isEntering && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(15px)' }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="entry-flash-overlay premium-fade"
          />
        )}
      </AnimatePresence>

      {/* Customer Wizard */}
      {showWizard && <CustomerWizard onClose={handleWizardClose} />}
    </div>
  );
}
