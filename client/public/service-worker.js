self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.mensaje || 'Nueva notificacion',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: 'orden-' + (data.orden_id || Date.now()),
    requireInteraction: data.prioridad === 'PARO',
    data: {
      orden_id: data.orden_id,
      folio: data.folio
    }
  };

  if (data.prioridad === 'PARO') {
    options.vibrate = [200, 100, 200];
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Orden de Trabajo', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
