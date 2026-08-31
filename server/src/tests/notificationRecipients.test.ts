import test from 'node:test';
import assert from 'node:assert/strict';
import { isDifferentUser, selectNotificationRecipientIds } from '../domain/notificationRecipients';

test('excluye al usuario que originó la notificación', () => {
  const recipients = selectNotificationRecipientIds([{ id: 15 }, { id: 17 }, { id: 28 }], 15);
  assert.deepEqual(recipients, [17, 28]);
});

test('elimina destinatarios duplicados', () => {
  const recipients = selectNotificationRecipientIds([{ id: 17 }, { id: 17 }, { id: 28 }]);
  assert.deepEqual(recipients, [17, 28]);
});

test('una notificación directa nunca vuelve al actor', () => {
  assert.equal(isDifferentUser(15, 15), false);
  assert.equal(isDifferentUser(17, 15), true);
});
