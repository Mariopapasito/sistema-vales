import test from 'node:test';
import assert from 'node:assert/strict';
import * as models from '../models/Attendance';

test('attendance: cada atributo conserva su columna sin compartir definiciones mutables', () => {
  for (const model of Object.values(models)) {
    const fields = new Set<string>();
    for (const [name, attribute] of Object.entries(model.rawAttributes)) {
      assert.equal(attribute.field, name, `${model.tableName}.${name}`);
      assert.ok(!fields.has(attribute.field!), `Columna duplicada: ${model.tableName}.${attribute.field}`);
      fields.add(attribute.field!);
    }
    for (const index of model.options.indexes || []) {
      for (const field of index.fields || []) {
        if (typeof field === 'string') assert.ok(fields.has(field), `Índice sin columna: ${model.tableName}.${field}`);
      }
    }
  }
});
