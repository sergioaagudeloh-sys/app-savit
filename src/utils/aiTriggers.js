// src/utils/aiTriggers.js

/**
 * AI Triggers Utility
 * Manages the "interest memory" of the client to feed the AI Assistant
 * and the smart sorting of the catalog.
 */

const STORAGE_KEY = 'savit_ai_interest';
const MAX_INTERESTS = 10;

/**
 * Tracks an interaction with a product
 * @param {string} productId - The unique ID of the product
 * @param {string} type - 'view', 'detail', 'cart'
 */
export const trackProductInterest = (productId, type = 'view') => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    let interests = rawData ? JSON.parse(rawData) : [];

    // Prioritize by importance: cart > detail > view
    const weight = { cart: 10, detail: 5, view: 1 };
    
    // Find if already exists
    const existingIndex = interests.findIndex(i => i.id === productId);
    
    if (existingIndex > -1) {
      // Update score and timestamp
      interests[existingIndex].score += weight[type] || 1;
      interests[existingIndex].lastSeen = Date.now();
      // Move to front (most recent)
      const [item] = interests.splice(existingIndex, 1);
      interests.unshift(item);
    } else {
      // New interest
      interests.unshift({
        id: productId,
        score: weight[type] || 1,
        lastSeen: Date.now()
      });
    }

    // Keep only top N
    if (interests.length > MAX_INTERESTS) {
      interests = interests.slice(0, MAX_INTERESTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(interests));
    
    // Dispatch a custom event so the Assistant can "notice" the change
    window.dispatchEvent(new CustomEvent('savit_ai_update', { 
      detail: { productId, type } 
    }));
  } catch (err) {
    console.warn('Sávit AI Tracker Error:', err);
  }
};

/**
 * Gets the list of interesting product IDs sorted by score/recency
 */
export const getProductInterests = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return [];
    const interests = JSON.parse(rawData);
    return interests.map(i => i.id);
  } catch (err) {
    return [];
  }
};
