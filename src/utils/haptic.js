/**
 * Utility for Haptic Feedback (Vibration API)
 * Makes the PWA feel more like a native app.
 */

export const haptic = {
  /** Subtle tap for interactions like buttons */
  light: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  
  /** Standard tap for selection / opening items */
  medium: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },
  
  /** Success feedback (double tap) */
  success: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }
  },
  
  /** Error feedback (triple tap or longer) */
  error: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  },
  
  /** Warning / Long press feedback */
  warning: () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
};
