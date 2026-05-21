const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker no soportado');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registrado:', registration);
    return registration;
  } catch (error) {
    console.error('Error registrando Service Worker:', error);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Notificaciones no soportadas en este dispositivo');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    console.warn('Permiso de notificaciones denegado por el usuario');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications no soportadas');
    return;
  }

  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('Push: esperando autenticación');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('VAPID_PUBLIC_KEY no configurada');
      return;
    }

    // Only subscribe if permission already granted — don't prompt automatically
    // (browser requires a user gesture to request permission)
    if (Notification.permission !== 'granted') {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    // Always re-sync with server so the DB stays current (handles DB resets / redeployments)
    const subscriptionToSave = existingSubscription ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscriptionToSave)
    });

    console.log('Push subscription sincronizada con servidor ✓');
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
      const token = localStorage.getItem('accessToken');
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });

      await subscription.unsubscribe();
      console.log('Desuscrito de push notifications');
    }
  } catch (error) {
    console.error('Error desuscribiendo:', error);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
