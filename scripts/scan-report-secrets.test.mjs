import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scan, secretValues } from './scan-report-secrets.mjs';

const env = { QA_ADMIN_PASSWORD: 'Secreto#QA2026', QA_ADMIN_EMAIL: 'admin@happytimes.com', QA_SHORT_TOKEN: 'abc' };

test('solo se buscan variables de contraseña/token con valor suficiente', () => {
  assert.deepEqual(secretValues(env).map(s => s.name), ['QA_ADMIN_PASSWORD']);
});
test('detecta el secreto en texto plano y embebido en base64; un reporte limpio pasa', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa02-scan-'));
  try {
    fs.writeFileSync(path.join(dir, 'limpio.html'), '<html>Fill "admin@happytimes.com"</html>');
    assert.deepEqual(scan([dir], secretValues(env)), []);
    const step = JSON.stringify({ title: `Fill "${env.QA_ADMIN_PASSWORD}"` }).repeat(5);
    fs.writeFileSync(path.join(dir, 'report.jsonl'), step);
    fs.writeFileSync(path.join(dir, 'index.html'), `data:application/zip;base64,${Buffer.from(step).toString('base64')}`);
    const where = scan([dir], secretValues(env)).map(f => path.basename(f.where));
    assert.ok(where.includes('report.jsonl'), where.join());
    assert.ok(where.includes('index.html#base64'), where.join());
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
