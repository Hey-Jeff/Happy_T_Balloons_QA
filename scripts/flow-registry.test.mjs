// Auditoría 06/11/2026: los 9 archivos de flujos se combinan y el último gana. Esta prueba fija qué
// archivo aporta cada caso para que ninguna sobrescritura vuelva a ser accidental o silenciosa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cases, implemented } from './qa-core.mjs';
import { allFlows, flowSource } from '../tests/flows/registry.js';
import { parseMovement, expectContainsBaseline } from '../tests/flows/qa02-datos-ui.js';

// Únicos casos que NO provienen de qa02-datos-ui.js. Cambiar esta lista exige revisar el flujo.
const NOT_FROM_DATOS_UI = { 'AUT-001': 'index.js', 'PED-005': 'wave2-72h.js', 'CATE-012': 'wave4-72h.js' };

test('Cada uno de los 58 casos tiene exactamente un flujo efectivo y conocido', () => {
  assert.equal(cases.length, 58);
  for (const tc of cases) {
    assert.equal(typeof allFlows[tc.id], 'function', `Sin flujo: ${tc.id}`);
    assert.ok(implemented.has(tc.id), `No registrado en qa-core: ${tc.id}`);
    assert.equal(flowSource[tc.id], NOT_FROM_DATOS_UI[tc.id] ?? 'qa02-datos-ui.js', `Origen inesperado de ${tc.id}`);
  }
  assert.deepEqual(Object.keys(allFlows).sort(), cases.map(c => c.id).sort(), 'No hay flujos huérfanos');
});

test('AUT-002 resuelve al flujo BLOCKED que nunca intenta iniciar sesión', () => {
  assert.equal(flowSource['AUT-002'], 'qa02-datos-ui.js');
  const src = allFlows['AUT-002'].toString();
  assert.match(src, /testInfo\.skip\(true/);
  assert.doesNotMatch(src, /\blogin(AsAdmin)?\(|\.fill\(|process\.env\.QA_INVALID_PASSWORD/);
});

test('El historial rediseñado se interpreta con signo y stock anterior → nuevo', () => {
  assert.deepEqual(parseMovement(['05/10/2026 22:37', 'Entrada', '+ 5 uds', '20 25', 'Reposición QA', 'admin@happytimes.com']),
    { fecha: '05/10/2026 22:37', tipo: 'Entrada', cantidad: 5, antes: 20, despues: 25, motivo: 'Reposición QA', usuario: 'admin@happytimes.com' });
  // La UI usa el signo menos tipográfico U+2212.
  assert.equal(parseMovement(['x', 'Salida', '− 17 uds', '22 5', 'm', 'u']).cantidad, -17);
  assert.deepEqual(parseMovement(['x', 'Salida', '-3', '25 22', 'm', 'u']).antes, 25);
});

test('La línea base exige cada aparición (duplicados incluidos) y tolera datos ajenos', () => {
  assert.doesNotThrow(() => expectContainsBaseline(['A', 'Prueba1', 'B', 'A'], ['A', 'A', 'B'], 'ok'));
  assert.throws(() => expectContainsBaseline(['A', 'B'], ['A', 'A', 'B'], 'falta duplicado'));
  assert.throws(() => expectContainsBaseline(['A'], ['A', 'C'], 'falta C'));
});
