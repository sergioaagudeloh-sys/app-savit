// src/pages/Rewards.jsx
import { useState } from 'react';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import Mascot from '../components/ui/Mascot';
import { useCustomer } from '../context/CustomerContext';
import { useAwards } from '../hooks/useAwards';
import { useNotifications } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';
import { useStoreConfig } from '../hooks/useOrders';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import './Rewards.css';

// ── Official Sávit Coin Mascot (Elite Metallic Edition)
const SávitCoin = ({ size = 120 }) => (
  <div className="rewards-mascot-container">
    <div className="mascot-glow" />
    <svg viewBox="0 0 64 64" width={size} height={size} className="savit-coin-svg">
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5C842" />
          <stop offset="50%" stopColor="#FBDF83" />
          <stop offset="100%" stopColor="#E0A800" />
        </linearGradient>
        <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="2" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#goldGradient)" stroke="#8B6914" strokeWidth="1.5" filter="url(#coinShadow)" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      <text x="32" y="44" textAnchor="middle" fill="#6B4F00" fontSize="36" fontWeight="1000" style={{ fontFamily: 'system-ui' }}>S</text>
    </svg>
  </div>
);

export default function Rewards() {
  const { customer } = useCustomer();
  const { awards, loading: awardsLoading } = useAwards();
  const { totalPrice } = useCart();
  const { config } = useStoreConfig();
  const { showToast } = useNotifications();
  const [redeeming, setRedeeming] = useState(null); // Award being redeemed
  const [processing, setProcessing] = useState(false);

  // Lógica de Puntos
  const userPoints = customer?.savitPoints || 0;
  const conversionRate = config?.pointsConfig?.pointsPer1000 || 10;
  const pendingPoints = totalPrice > 0 ? Math.floor(totalPrice / 1000) * conversionRate : 0;
  
  const activeAwards = awards.filter(a => a.isActive !== false);

  // Niveles Gamificados (Umbrales)
  const levels = [
    { name: 'Bronce', min: 0, max: 2000, next: 'Plata' },
    { name: 'Plata', min: 2000, max: 5000, next: 'Oro' },
    { name: 'Elite', min: 5000, max: 10000, next: 'Max' }
  ];

  const currentLevel = levels.find(l => userPoints < l.max) || levels[levels.length - 1];
  const progressPercent = Math.min(((userPoints - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100, 100);

  const handleRedeem = async (award) => {
    if (userPoints < award.pointsCost) {
      showToast('No tienes suficientes puntos', 'error');
      return;
    }
    setRedeeming(award);
  };

  const confirmRedemption = async () => {
    if (!customer?.id || !redeeming) return;
    setProcessing(true);
    try {
      // 1. Create redemption record
      await addDoc(collection(db, 'redemptions'), {
        customerId: customer.id,
        customerName: customer.name || 'Cliente Savit',
        customerPhone: customer.phone || '',
        awardId: redeeming.id,
        awardName: redeeming.name,
        pointsCost: redeeming.pointsCost,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 2. Deduct points from customer
      await updateDoc(doc(db, 'customers', customer.id), {
        savitPoints: increment(-redeeming.pointsCost)
      });

      showToast('¡Canje solicitado con éxito! 🎁', 'success');
      setRedeeming(null);
    } catch (error) {
      console.error('Redemption error:', error);
      showToast('Error al procesar el canje', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="app-container rewards-page">
      <Header title="Sávit Rewards" />
      
        {/* Elite Hero Section (Full Bleed) */}
        <section className="rewards-hero">
          <SávitCoin size={100} />
          <div className="rewards-hero-text">
            <h1 className="hero-elite-title">Tus Sávit Points</h1>
            <p className="hero-elite-subtitle">Cada compra te acerca a un nuevo premio</p>
          </div>
        </section>

      <main className="page-content rewards-content">
        {/* Balance Card (Horizontal Integrated Design) */}
        <section className="rewards-balance-card animate-slide-up">
          <div className="balance-left">
            <span className="balance-label">Balance actual</span>
            <div className="balance-amount">
              <span className="amount-sparkle">✨</span>
              {userPoints.toLocaleString()}
            </div>
          </div>

          <div className="rewards-level-section">
            <div className="rewards-level-info">
              <span className="current-level-badge">Nivel {currentLevel.name}</span>
              <span className="next-level-target">
                {currentLevel.next ? `Próximo: ${currentLevel.max.toLocaleString()} pts` : 'Nivel Máximo'}
              </span>
            </div>
            <div className="rewards-progress-bar">
              <div 
                className="rewards-progress-fill" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        </section>

        {/* Info Strip */}
        {pendingPoints > 0 && (
          <div className="pending-section animate-fade-in">
            <div className="pending-points-chip">
              <i className="fas fa-clock"></i>
              <span>+{pendingPoints.toLocaleString()} pts por asegurar</span>
            </div>
          </div>
        )}

        <div className="rewards-info-strip">
          <div className="info-item">
            <i className="fas fa-shopping-basket"></i>
            <span>Gana</span>
          </div>
          <div className="info-item">
            <i className="fas fa-gift"></i>
            <span>Canjea</span>
          </div>
          <div className="info-item">
            <i className="fas fa-crown"></i>
            <span>Elite</span>
          </div>
        </div>

        {/* Catalog Section */}
        <section className="rewards-catalog">
          <div className="rewards-catalog-header">
            <h2 className="rewards-catalog-title">
              <span className="icon">🏆</span> Premios Disponibles
            </h2>
          </div>

          {awardsLoading ? (
            <div className="flex-center p-xl"><span className="spinner spinner-dark" /></div>
          ) : activeAwards.length === 0 ? (
            <div className="empty-state-card">
               <p>Próximamente tendremos premios increíbles para ti.</p>
            </div>
          ) : (
            <div className="rewards-awards-grid">
              {activeAwards.map(award => {
                const isAvailable = userPoints >= award.pointsCost;
                return (
                  <div key={award.id} className={`rewards-award-card ${isAvailable ? 'available' : 'locked'}`}>
                    <div className="rewards-award-icon">
                      {award.icon || '🎁'}
                    </div>
                    <div className="rewards-award-body">
                      <h3 className="rewards-award-name">{award.name}</h3>
                      <p className="rewards-award-desc">{award.description}</p>
                      <div className="rewards-award-cost">
                        <span>🪙</span> {award.pointsCost.toLocaleString()} Pts
                      </div>
                    </div>
                    {isAvailable ? (
                      <button className="btn-redeem" onClick={() => handleRedeem(award)}>
                        Canjear
                      </button>
                    ) : (
                      <div className="rewards-missing">
                        Faltan {(award.pointsCost - userPoints).toLocaleString()} pts
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Confirmation Modal */}
      {redeeming && (
        <>
          <div className="overlay animate-fade-in" onClick={() => !processing && setRedeeming(null)} />
          <div className="modal-dialog animate-slide-up">
            <div className="rewards-confirm-card">
              <button className="modal-close-btn" onClick={() => setRedeeming(null)} disabled={processing}>✕</button>
              <div className="modal-icon">🎁</div>
              <h3 className="rewards-confirm-name">{redeeming.name}</h3>
              <p className="text-center text-stone">¿Seguro que quieres canjear tus puntos por este premio?</p>
              
              <div className="rewards-confirm-math">
                <div className="rewards-confirm-row">
                  <span>Tu balance actual:</span>
                  <span>{userPoints.toLocaleString()} pts</span>
                </div>
                <div className="rewards-confirm-row">
                  <span>Costo del premio:</span>
                  <span className="text-error">-{redeeming.pointsCost.toLocaleString()} pts</span>
                </div>
                <div className="rewards-confirm-row total">
                  <span>Balance final:</span>
                  <strong>{(userPoints - redeeming.pointsCost).toLocaleString()} pts</strong>
                </div>
              </div>

              <div className="modal-actions mt-xl">
                <button className="btn btn-ghost flex-1" onClick={() => setRedeeming(null)} disabled={processing}>
                  Cancelar
                </button>
                <button className="btn btn-primary flex-1" onClick={confirmRedemption} disabled={processing}>
                  {processing ? <span className="spinner" /> : 'Confirmar Canje'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Mascot page="rewards" />
      <BottomNav />
    </div>
  );
}
