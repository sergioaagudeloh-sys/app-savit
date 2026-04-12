import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal or drawer is open.
 * @param {boolean} locked - Whether the scroll should be locked.
 */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (locked) {
      document.body.classList.add('no-scroll');
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    };
  }, [locked]);
}
