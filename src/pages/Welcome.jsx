// src/pages/Welcome.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import { motion, AnimatePresence } from 'framer-motion';
import CustomerWizard from '../components/ui/CustomerWizard';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const { isIdentified } = useCustomer();
  const [showWizard, setShowWizard] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Experience redirection sync - IMMERSIVE TIMING
  useEffect(() => {
    if (isEntering) {
      const timer = setTimeout(() => {
        if (isIdentified) {
          navigate('/home');
        } else {
          setShowWizard(true);
        }
      }, 950); 
      return () => clearTimeout(timer);
    }
  }, [isEntering, isIdentified, navigate]);

  const onDrag = (event, info) => {
    // Detect movement in real time
    if (!isEntering && info.offset.y < -40) {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50); // Small tactile click
      }
      setIsEntering(true);
      // The useEffect will handle the navigation/wizard logic
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    navigate('/home');
  };

  return (
    <div className={`welcome-container ${isEntering ? 'entering-flow' : ''}`}>
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

      {/* 1. TOP SECTION: THE FACADE IMAGE (IMMERSIVE ENGINE) */}
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
            ease: "easeIn", // Immersive speed
          }}
          onError={(e) => {
            e.target.src = "/facade.jpg";
          }}
        />
      </div>

      {/* 2. BOTTOM SECTION: CURVED MODAL (Compact & Lowered) */}
      <motion.div 
        className="welcome-bottom-section"
        animate={{
          y: isEntering ? '110%' : 0, 
        }}
        transition={{ duration: 0.8, ease: "easeIn" }}
      >
        {/* INTERACTION BADGE (Now clearly inside the banner) */}
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
            onDrag={onDrag}
            whileDrag={{ scale: 1.1 }}
            className="welcome-brand-badge interactive-badge"
          >
            {/* The outer pulse ring expands outside without absolute transform trickery */}
            <div className="badge-pulse-ring"></div>
            
            {/* The inner clipping sphere for the shimmer and the logo */}
            <div className="badge-inner-clipping">
              <div className="badge-shimmer"></div>
              <img 
                src="/logo.png" 
                alt="Sávit Logo" 
                className="welcome-logo-img"
              />
            </div>
          </motion.div>
        </div>

        {/* TEXT CONTENT (Compact at the bottom) */}
        <div className="welcome-content-wrap">
          <h1 className="welcome-title-split">Cuidamos Tu Bienestar</h1>
          <p className="welcome-subtitle-split">
            Alimentamos tu vida con lo mejor de la naturaleza, fresco y directo a tu hogar.
          </p>
        </div>

        {/* FOOTER */}
        <footer className="welcome-footer-tag">
          Sávit — Mercado Saludable
        </footer>
      </motion.div>

      {/* 3. PERSISTENT FLASH COVER */}
      <AnimatePresence>
        {isEntering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.3 }}
            className="entry-flash-overlay"
          />
        )}
      </AnimatePresence>

      {/* Customer Wizard */}
      {showWizard && <CustomerWizard onClose={handleWizardClose} />}
    </div>
  );
}
