import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { validateLocalDatabase } from '../config/localEnvironment';

test('modo local exige loopback y una base marcada local/test', () => {
  validateLocalDatabase({ DB_HOST: '127.0.0.1', DB_NAME: 'sistema_vales_local', DB_PORT: '3307' });
  validateLocalDatabase({ DB_HOST: 'localhost', DB_NAME: 'attendance_test' });
  assert.throws(() => validateLocalDatabase({ DB_HOST: 'remote.example', DB_NAME: 'sistema_vales_local' }));
  assert.throws(() => validateLocalDatabase({ DB_HOST: '127.0.0.1', DB_NAME: 'railway' }));
  assert.throws(() => validateLocalDatabase({ DB_HOST: '127.0.0.1', DB_NAME: 'test_local', DB_PORT: 'NaN' }));
  assert.throws(() => validateLocalDatabase({}));
});

test('modo local ignora URLs remotas heredadas sin abrir ninguna conexión', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const db = require(${JSON.stringify(path.resolve(__dirname, '../config/database.js'))}).default;
    assert.equal(db.config.host, '127.0.0.1');
    assert.equal(db.config.port, 3307);
    assert.equal(db.config.database, 'sistema_vales_test');
    assert.equal(db.config.username, 'local_test');
    db.close();
  `], {
    env: { ...process.env, VALES_LOCAL_ONLY: '1', DB_HOST: '127.0.0.1', DB_PORT: '3307',
      DB_NAME: 'sistema_vales_test', DB_USER: 'local_test', DB_PASSWORD: '',
      MYSQL_URL: 'mysql://unused:unused@remote.invalid/production',
      MYSQL_PUBLIC_URL: 'mysql://unused:unused@remote.invalid/production',
      DATABASE_URL: 'mysql://unused:unused@remote.invalid/production' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
