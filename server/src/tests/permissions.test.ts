import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditBitacora, canUseBitacoras, validateOrderForward } from '../domain/permissions';

test('solo jefe y estacion pueden usar bitacoras', () => {
  assert.equal(canUseBitacoras('jefe'), true);
  assert.equal(canUseBitacoras('estacion'), true);
  assert.equal(canUseBitacoras('sistemas'), false);
  assert.equal(canUseBitacoras(undefined), false);
});

test('una estacion solo puede editar su propia bitacora', () => {
  assert.equal(canEditBitacora('estacion', 12, 12), true);
  assert.equal(canEditBitacora('estacion', 12, 13), false);
  assert.equal(canEditBitacora('jefe', 1, 13), true);
  assert.equal(canEditBitacora('compras', 1, 1), false);
});

test('sistemas puede reenviar su vale a compras conservando la regla de bandeja', () => {
  assert.deepEqual(validateOrderForward('sistemas', 'sistemas', 'compras'), { allowed: true });
  assert.equal(validateOrderForward('sistemas', 'compras', 'sistemas').status, 403);
});

test('compras puede reenviar su vale a sistemas', () => {
  assert.deepEqual(validateOrderForward('compras', 'compras', 'sistemas'), { allowed: true });
});

test('el reenvio rechaza roles y destinos invalidos o el mismo destino', () => {
  assert.equal(validateOrderForward('jefe', 'sistemas', 'compras').status, 403);
  assert.equal(validateOrderForward('sistemas', 'sistemas', 'almacen').status, 400);
  assert.equal(validateOrderForward('sistemas', 'sistemas', 'sistemas').status, 400);
});
