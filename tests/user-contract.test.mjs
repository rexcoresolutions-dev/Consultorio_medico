import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUserActive, userStatusLabel, userApiError } from '../src/utils/user-contract.utils.ts';

test('distingue activo, inactivo y estado ausente', () => {
  for (const value of [true, 1, '1', 'true']) assert.equal(normalizeUserActive(value), true);
  for (const value of [false, 0, '0', 'false']) assert.equal(normalizeUserActive(value), false);
  for (const value of [undefined, null, '', 'unknown']) assert.equal(normalizeUserActive(value), undefined);
  assert.equal(userStatusLabel(undefined), 'Sin información');
});
test('muestra el detalle de validación devuelto por Nest', () => {
  assert.equal(userApiError({ message: 'Validation failed', details: ['property activo should not exist'] }, 'Error'), 'property activo should not exist');
  assert.equal(userApiError({ message: ['correo must be an email'] }, 'Error'), 'correo must be an email');
  assert.equal(userApiError({ message: 'Sin permisos' }, 'Error'), 'Sin permisos');
});
