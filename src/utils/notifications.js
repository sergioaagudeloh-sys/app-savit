// src/utils/notifications.js

/**
 * Requests notification permission from the user.
 * @returns {Promise<boolean>} True if granted, false otherwise.
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("Este navegador no soporta notificaciones de escritorio.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Sends a local notification through the service worker.
 * @param {string} title 
 * @param {object} options 
 */
export async function sendLocalNotification(title, options = {}) {
  const hasPermission = Notification.permission === "granted";
  
  if (!hasPermission) return;

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      icon: '/logo-pwa.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      ...options
    });
  } else {
    // Fallback if no SW
    new Notification(title, options);
  }
}
