#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { cases, coverage, root } from './qa-core.mjs';

const mode = process.env.QA_MODO || 'validar';
const selector = mode === 'caso' ? process.env.QA_CASE_ID : mode === 'modulo' ? process.env.QA_MODULO : '';
const chosen = mode === 'conexion' ? [] : mode === 'caso' ? cases.filter(t => t.id === selector)
  : mode === 'modulo' ? cases.filter(t => t.module === selector) : cases;
const c = coverage(chosen);
const reportFile = path.join(root, 'qa/results/playwright.json');
let report = null;
if (fs.existsSync(reportFile)) {
  try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); }
  catch (err) { console.error(`Reporte no legible: ${err.message}`); }
}
const s = report?.stats;
const rows = [
  '# QA02 — Resultado de GitHub Actions',
  '',
  `- **Modo solicitado:** ${mode}${selector ? ` (${selector})` : ''}`,
  `- **Casos seleccionados (del Excel):** ${c.total}`,
  `- **Automatizados y verificados contra la aplicación:** ${c.ready}`,
  `- **Borradores sin verificar:** ${c.draft}`,
  `- **Pendientes de implementar:** ${c.pending}`,
  `- **No aplicables / bloqueados en QA02:** ${c.not_applicable}`,
  '',
];
if (s) {
  rows.push('## Ejecución de Playwright', '',
    `- **PASS (ejecutados):** ${s.expected ?? 0}`,
    `- **FAIL (ejecutados):** ${s.unexpected ?? 0}`,
    `- **Flaky (tras reintentos):** ${s.flaky ?? 0}`,
    `- **SKIPPED (no ejecutados):** ${s.skipped ?? 0}`,
    '', 'Los PASS de borradores son resultados exploratorios, **no acreditan cobertura verificada**.', '');
} else {
  rows.push('**No existe un reporte de Playwright para esta ejecución.** En modo `validar` o `conexion` es normal; no se abrió navegador.', '');
}
rows.push('Revisa el artefacto `qa02-evidencias-*` en la pestaña de la ejecución para obtener el reporte HTML y capturas (si se ejecutaron pruebas).', '');
const markdown = rows.join('\n');
console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
