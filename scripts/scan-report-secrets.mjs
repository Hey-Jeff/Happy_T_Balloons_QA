#!/usr/bin/env node
// Revisa que el reporte de Playwright no contenga contraseñas ni tokens antes de publicarlo.
// Busca en archivos planos, en ZIP (blobs, trazas) y en ZIP embebidos en base64 (index.html).
// Uso: node scripts/scan-report-secrets.mjs <carpeta> [<carpeta> ...]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SECRET_NAME = /PASSWORD|TOKEN|SECRET/;

export function secretValues(env = process.env) {
  return Object.entries(env)
    .filter(([name, value]) => SECRET_NAME.test(name) && typeof value === 'string' && value.length >= 6)
    .map(([name, value]) => ({ name, value: Buffer.from(value) }));
}

// Lector ZIP mínimo basado en el directorio central (soporta descriptores de datos).
export function zipEntries(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > buf.length) return [];
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let k = 0; k < total && p + 46 <= buf.length && buf.readUInt32LE(p) === 0x02014b50; k++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString();
    if (local + 30 <= buf.length) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      try { out.push({ name, data: method === 8 ? zlib.inflateRawSync(data) : data }); }
      catch { out.push({ name, data }); }
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function* expand(label, buf, depth = 0) {
  yield [label, buf];
  if (depth > 3) return;
  for (const { name, data } of zipEntries(buf)) yield* expand(`${label}!${name}`, data, depth + 1);
  const text = buf.toString('latin1');
  for (const m of text.matchAll(/base64,([A-Za-z0-9+/=]{100,})/g)) {
    yield* expand(`${label}#base64`, Buffer.from(m[1], 'base64'), depth + 1);
  }
}

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : [p];
  });
}

export function scan(dirs, secrets = secretValues()) {
  const findings = [];
  for (const file of dirs.flatMap(files)) {
    for (const [label, buf] of expand(file, fs.readFileSync(file))) {
      for (const s of secrets) if (buf.includes(s.value)) findings.push({ name: s.name, where: label });
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dirs = process.argv.slice(2);
  const secrets = secretValues();
  const findings = scan(dirs, secrets);
  if (findings.length) {
    // Solo se informa el nombre de la variable, nunca su valor.
    for (const f of findings) console.error(`SECRETO EN REPORTE: ${f.name} en ${f.where}`);
    console.error('El reporte NO se publica.');
    process.exitCode = 1;
  } else {
    console.log(`Reporte revisado: ${secrets.length} valores secretos buscados, ninguno encontrado.`);
  }
}
