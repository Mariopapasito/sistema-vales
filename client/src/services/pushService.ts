const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGI03HeR6D59Q5j9LovsymcUxO5ZrjcL9607fbOpacXtGUXB3IsFk8MIj--Bo-G5FqNcCZhdE_Y5SM4Tz9o5Prk';

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    // En producción se reutiliza el worker PWA (incluye push y control de caché).
    // Mantener dos workers para el mismo scope hacía que uno reemplazara al otro.
    const workerUrl = import.meta.env.PROD ? '/sw.js' : '/service-worker.js';
    return await navigator.serviceWorker.register(workerUrl, { scope: '/' });
  } catch (error) {
    console.error('Error registrando Service Worker:', error);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const token = localStorage.getItem('accessToken');
    if (!token || !VAPID_PUBLIC_KEY) return;

    // Request permission if not yet decided
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    const subscriptionToSave = existingSubscription ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Usar la misma URL configurada que el resto de la API. En desarrollo, un
    // fetch relativo apuntaba a Vite y dejaba el navegador ligado al usuario anterior.
    await api.post('/push/subscribe', subscriptionToSave.toJSON());

    return subscriptionToSave;
  } catch (error) {
    console.error('Error en push notifications:', error);
  }
};

export const unsubscribeFromPushNotifications = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      } finally {
        // Aunque la red falle, el navegador no debe seguir recibiendo avisos
        // después de cerrar la sesión en un equipo compartido.
        await subscription.unsubscribe();
      }
    }
  } catch (error) {
    console.error('Error desuscribiendo:', error);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
import api from './api';
