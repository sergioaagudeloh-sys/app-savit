// src/utils/audio.js
let sharedAudioCtx = null;

export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || !navigator.vibrate) return;
  try {
    switch (type) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(25); break;
      case 'heavy': navigator.vibrate([40, 20, 40]); break;
      default: navigator.vibrate(10);
    }
  } catch (e) {
    // Ignore vibrate errors when blocked by OS
  }
};

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    try {
      sharedAudioCtx = new AudioContext();
    } catch (e) {
      return null;
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export const playPopSound = (increase = true) => {
  triggerHaptic(increase ? 'medium' : 'light'); // Dispara vibración junto al sonido
  
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = increase ? 600 : 400;
    const endFreq = increase ? 800 : 250;
    
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    // Ignore safely
  }
};

export const playPromoSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 (A major arpeggio)
    const now = ctx.currentTime;
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.05);
      
      gain.gain.setValueAtTime(0, now + index * 0.05);
      gain.gain.linearRampToValueAtTime(0.1, now + index * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.05);
      osc.stop(now + index * 0.05 + 0.3);
    });
  } catch (err) {
    // Ignore safely
  }
};

export const playMascotSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [600, 800, 1000]; // Arpegio agudo y rápido
    const now = ctx.currentTime;
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.03);
      
      gain.gain.setValueAtTime(0, now + index * 0.03);
      gain.gain.linearRampToValueAtTime(0.05, now + index * 0.03 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.03 + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.03);
      osc.stop(now + index * 0.03 + 0.15);
    });
  } catch (err) {
    // Ignore safely
  }
};

export const playFavoriteSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Acorde luminoso ascendente (C5, E5, G5)
    const notes = [523.25, 659.25, 783.99]; 
    const now = ctx.currentTime;
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle'; // 'triangle' da un tono más de campana/timbre suave
      osc.frequency.setValueAtTime(freq, now + index * 0.04);
      
      gain.gain.setValueAtTime(0, now + index * 0.04);
      gain.gain.linearRampToValueAtTime(0.08, now + index * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.04 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.04);
      osc.stop(now + index * 0.04 + 0.4);
    });
  } catch (err) {
    // Ignore safely
  }
};

// Warm "message received" chime — G5 → B5 → D6 (G major triad)
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // G major triad ascending — friendly and warm
    const notes = [
      { freq: 783.99, time: 0 },      // G5
      { freq: 987.77, time: 0.09 },   // B5
      { freq: 1174.66, time: 0.18 },  // D6
    ];
    const now = ctx.currentTime;

    notes.forEach(({ freq, time }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Softer / bell-like timbre
      osc.frequency.setValueAtTime(freq, now + time);

      // Attack → long natural decay (reverb feel)
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.12, now + time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + 0.6);
    });
  } catch (err) {
    // Ignore safely
  }
};

// Prominent ascending fanfare for high-priority order status changes
// (used when admin approves / dispatches / delivers an order)
export const playOrderUpdateSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // C5 → E5 → G5 → C6 — confident major fanfare
    const notes = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.08 },   // E5
      { freq: 783.99, time: 0.16 },   // G5
      { freq: 1046.50, time: 0.27 },  // C6
    ];
    const now = ctx.currentTime;

    notes.forEach(({ freq, time }, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === 3 ? 'sine' : 'triangle'; // Final note rounder
      osc.frequency.setValueAtTime(freq, now + time);

      const vol = i === 3 ? 0.14 : 0.09; // Final note slightly louder
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + (i === 3 ? 0.7 : 0.35));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + 0.8);
    });
  } catch (err) {
    // Ignore safely
  }
};
