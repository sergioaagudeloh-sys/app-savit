import React, { useState, useEffect } from 'react';
import './HealthyTip.css';

const healthyTips = [
  { label: "Hidratación", text: "Empezar el día con agua tibia y limón ayuda a alcalinizar tu cuerpo y despertar tu metabolismo.", icon: "💧" },
  { label: "Orgánico", text: "Elige productos orgánicos para reducir la exposición a pesticidas químicos y mejorar el sabor.", icon: "🌱" },
  { label: "Keto & Fats", text: "Incorpora grasas saludables como aguacate o aceite de coco para obtener energía constante.", icon: "🥑" },
  { label: "Fibra", text: "Aumentar el consumo de frutos secos y semillas mejora tu digestión y salud intestinal significativamente.", icon: "🥜" },
  { label: "Temporada", text: "Prefiere las frutas de temporada; tienen más nutrientes y apoyas el comercio local.", icon: "🍎" },
  { label: "Lectura", text: "Evita alimentos con más de 5 ingredientes. Si no puedes pronunciarlos, mejor no los comas.", icon: "🧐" },
  { label: "Sin Refinados", text: "Sustituye el azúcar refinado por opciones naturales como stevia pura o miel orgánica.", icon: "🍯" },
  { label: "Verdes", text: "Incluye al menos una porción de vegetales verdes en cada una de tus comidas principales.", icon: "🥬" },
  { label: "Consciencia", text: "Comer despacio y masticar bien mejora la absorción de nutrientes y previene la pesadez.", icon: "🧘" },
  { label: "Variedad", text: "Varía tus fuentes de proteína vegetal para obtener todos los aminoácidos esenciales que tu cuerpo necesita.", icon: "🥙" }
];

const HealthyTip = () => {
  const [index, setIndex] = useState(0);

  // Auto-play interval (5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % healthyTips.length);
    }, 300000); // 300,000 ms = 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const nextTip = () => {
    setIndex((prev) => (prev + 1) % healthyTips.length);
  };
  
  const prevTip = () => {
    setIndex((prev) => (prev - 1 + healthyTips.length) % healthyTips.length);
  };

  const currentTip = healthyTips[index];

  return (
    <div className="healthy-tip-banner">
      <div className="tip-banner-background">
        <div className="tip-banner-blob blob-1"></div>
        <div className="tip-banner-blob blob-2"></div>
      </div>

      <button className="banner-nav-btn prev" onClick={prevTip} aria-label="Anterior">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <div className="tip-banner-content animate-slide-up" key={index}>
        <div className="tip-banner-icon-area">
          <span className="tip-banner-emoji">{currentTip.icon}</span>
        </div>
        <div className="tip-banner-text-area">
          <div className="tip-banner-header">
            <span className="tip-banner-label">CONSEJO SALUDABLE: {currentTip.label}</span>
          </div>
          <p className="tip-banner-quote">"{currentTip.text}"</p>
        </div>
      </div>

      <div className="banner-progress-container">
        {healthyTips.map((_, i) => (
          <div 
            key={i} 
            className={`banner-progress-dot ${i === index ? 'active' : ''}`}
          />
        ))}
      </div>

      <button className="banner-nav-btn next" onClick={nextTip} aria-label="Siguiente">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
};

export default HealthyTip;
