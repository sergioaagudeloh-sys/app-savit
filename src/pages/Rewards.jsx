// src/pages/Rewards.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useCustomer } from '../context/CustomerContext';
import { useAwards } from '../hooks/useAwards';
import { useUsers } from '../hooks/useUsers';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import './Rewards.css';

// ── Official Sávit Coin Mascot
const MascotIcon = () => (
  <div className="mascot-coin-wrapper">
    <svg viewBox="0 0 64 64" width="80" height="80">
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5C842" />
          <stop offset="50%" stopColor="#E0A800" />
          <stop offset="100%" stopColor="#A07800" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#goldGradient)" stroke="#8B6914" strokeWidth="2" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 2" />
      <text x="32" y="44" textAnchor="middle" fontSize="32" fontWeight="900" fill="#6B4F00" style={{ fontFamily: 'system-ui' }}>S</text>
    </svg>
  </div>
);

// ── Coin icon
const CoinIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="#F5C842" stroke="#E0A800" strokeWidth="1.5"/>
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#A07800">S</text>
  </svg>
);

export default function Rewards() {
  const navigate = useNavigate();
  const { customer, isIdentified } = useCustomer();
  const { awards, loading: awardsLoading } = useAwards();
  const { redeemAward, loading: redeeming } = useUsers();

  const [points, setPoints] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [selectedAward, setSelectedAward] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [redeemError, setRedeemError] = useState('');

  // ── Live points subscription
  useEffect(() => {
    if (!isIdentified || !customer?.phone) {
      setPointsLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setPoints(0);
      setPointsLoading(false);
      return;
    }

    const ref = doc(db, 'customers', customer.phone);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setPoints(snap.data().savitPoints || 0);
      }
      setPointsLoading(false);
    }, () => setPointsLoading(false));

    return () => unsub();
  }, [customer?.phone, isIdentified]);

  const handleRedeem = async (award) => {
    setRedeemError('');
    if (!isIdentified) {
      setRedeemError('Debes identificarte para canjear premios.');
      return;
    }
    if (points < award.pointsCost) {
      setRedeemError(`Necesitas ${award.pointsCost - points} puntos más para este premio.`);
      return;
    }
    setSelectedAward(award);
  };

  const confirmRedeem = async () => {
    if (!selectedAward) return;
    try {
      await redeemAward(customer.phone, selectedAward.pointsCost, selectedAward.name);
      setRedeemSuccess(selectedAward);
      setSelectedAward(null);
    } catch (err) {
      setRedeemError(err.message || 'Error al canjear el premio.');
      setSelectedAward(null);
    }
  };

  // ── Progress to next milestone
  const milestones = [100, 250, 500, 1000, 2500];
  const nextMilestone = milestones.find(m => m > points) || milestones[milestones.length - 1];
  const progress = Math.min((points / nextMilestone) * 100, 100);

  return (
    <div className="app-container rewards-page">
      <Header showBack title="Sávit Puntos" />

      <main className="page-content rewards-content">

        {/* ── Hero: Points balance */}
        <section className="rewards-hero">
          <div className="rewards-hero-bg" />
          <div className="rewards-mascot">
            <MascotIcon />
          </div>
          <div className="rewards-balance-card">
            <span className="rewards-balance-label">Tu saldo actual</span>
            <div className="rewards-balance-value">
              {pointsLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <CoinIcon size={28} />
                  <span>{points.toLocaleString()}</span>
                </>
              )}
            </div>
            <span className="rewards-balance-unit">Sávit Puntos</span>

            {/* Progress bar */}
            <div className="rewards-progress-wrapper">
              <div className="rewards-progress-bar">
                <div
                  className="rewards-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="rewards-progress-labels">
                <span>{points} pts</span>
                <span>Siguiente: {nextMilestone} pts 🎯</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works */}
        <section className="rewards-info-strip">
          <div className="rewards-info-item">
            <span className="rewards-info-icon">🛒</span>
            <div>
              <strong>Compra</strong>
              <p>Acumula puntos</p>
            </div>
          </div>
          <div className="rewards-info-divider" />
          <div className="rewards-info-item">
            <span className="rewards-info-icon">⭐</span>
            <div>
              <strong>Gana</strong>
              <p>Sin vencimiento</p>
            </div>
          </div>
          <div className="rewards-info-divider" />
          <div className="rewards-info-item">
            <span className="rewards-info-icon">🎁</span>
            <div>
              <strong>Canjea</strong>
              <p>Premios exclusivos</p>
            </div>
          </div>
        </section>

        {/* ── Guest prompt */}
        {!isIdentified && (
          <div className="rewards-guest-prompt">
            <div className="rewards-guest-icon">🪙</div>
            <h2>¡Identifícate para ver tus puntos!</h2>
            <p>Regístrate o inicia sesión para comenzar a acumular Sávit Puntos en cada compra.</p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>
              Comenzar ahora →
            </button>
          </div>
        )}

        {/* ── Awards catalog */}
        {isIdentified && (
          <section className="rewards-catalog">
            <div className="rewards-catalog-header">
              <h2 className="rewards-catalog-title">Catálogo de Premios</h2>
              <span className="rewards-catalog-count">{awards.length} disponibles</span>
            </div>

            {awardsLoading ? (
              <div className="rewards-loading">
                <span className="spinner spinner-dark" />
              </div>
            ) : awards.length === 0 ? (
              <div className="rewards-empty">
                <div className="rewards-empty-icon">🎭</div>
                <p>Próximamente nuevos premios</p>
              </div>
            ) : (
              <div className="rewards-awards-grid">
                {awards.map(award => {
                  const canRedeem = points >= award.pointsCost;
                  const missingPts = award.pointsCost - points;
                  return (
                    <div
                      key={award.id}
                      className={`rewards-award-card ${canRedeem ? 'available' : 'locked'}`}
                    >
                      <div className="rewards-award-icon">
                        {canRedeem ? '🎁' : '🔒'}
                      </div>
                      <div className="rewards-award-body">
                        <h3 className="rewards-award-name">{award.name}</h3>
                        <p className="rewards-award-desc">{award.description}</p>
                        <div className="rewards-award-cost">
                          <CoinIcon size={14} />
                          <span>{award.pointsCost.toLocaleString()} puntos</span>
                        </div>
                      </div>
                      <div className="rewards-award-action">
                        {canRedeem ? (
                          <button
                            className="btn-redeem"
                            onClick={() => handleRedeem(award)}
                          >
                            Canjear
                          </button>
                        ) : (
                          <span className="rewards-missing">
                            Te faltan {missingPts.toLocaleString()} pts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Error banner */}
        {redeemError && (
          <div className="rewards-error-banner" onClick={() => setRedeemError('')}>
            ⚠️ {redeemError}
          </div>
        )}

      </main>

      {/* ── Confirm redeem modal */}
      {selectedAward && (
        <>
          <div className="overlay" onClick={() => setSelectedAward(null)} />
          <div className="modal-responsive" style={{ maxWidth: '420px' }}>
            <div className="modal-responsive-header">
              <h2 className="modal-responsive-title">🎁 Canjear Premio</h2>
              <button className="modal-responsive-close" onClick={() => setSelectedAward(null)}>✕</button>
            </div>
            <div className="modal-responsive-body">
              <div className="rewards-confirm-card">
                <div className="rewards-confirm-name">{selectedAward.name}</div>
                <p className="rewards-confirm-desc">{selectedAward.description}</p>
                <div className="rewards-confirm-math">
                  <div className="rewards-confirm-row">
                    <span>Tu saldo</span>
                    <strong className="text-primary">{points} pts</strong>
                  </div>
                  <div className="rewards-confirm-row cost">
                    <span>Costo del premio</span>
                    <strong className="text-danger">−{selectedAward.pointsCost} pts</strong>
                  </div>
                  <div className="rewards-confirm-row total">
                    <span>Nuevo saldo</span>
                    <strong>{points - selectedAward.pointsCost} pts</strong>
                  </div>
                </div>
                <p className="rewards-confirm-note">
                  📱 El administrador recibirá tu solicitud de canje y te contactará para entregarte el premio.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button className="btn btn-soft flex-1" onClick={() => setSelectedAward(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={confirmRedeem}
                  disabled={redeeming}
                >
                  {redeeming ? <><span className="spinner" /> Procesando...</> : '✓ Confirmar Canje'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Success modal */}
      {redeemSuccess && (
        <>
          <div className="overlay" onClick={() => setRedeemSuccess(null)} />
          <div className="modal-responsive" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div className="modal-responsive-body" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ marginBottom: '8px', color: 'var(--color-primary)' }}>¡Canje Exitoso!</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                Tu premio <strong>"{redeemSuccess.name}"</strong> ha sido solicitado.
                El equipo de Sávit se pondrá en contacto contigo pronto. 🪙
              </p>
              <button className="btn btn-primary w-full" onClick={() => setRedeemSuccess(null)}>
                ¡Excelente!
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
