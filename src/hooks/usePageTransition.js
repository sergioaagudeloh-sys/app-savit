// src/hooks/usePageTransition.js
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * usePageTransition — Wraps react-router navigate() with the View Transitions API.
 * Falls back gracefully to plain navigation on unsupported browsers (Firefox, old Safari).
 */
export function usePageTransition() {
  const navigate = useNavigate();

  const transitionTo = useCallback(
    (to, options) => {
      // Disabled View Transitions API because it causes severe layout glitches (shrinking/margins)
      // upon native back gestures / history navigation in PWA.
      navigate(to, options);
    },
    [navigate]
  );

  return transitionTo;
}
