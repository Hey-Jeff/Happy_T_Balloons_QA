import { expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

// QA02: consulta GET autenticada sin necesidad de pedido sembrado.
// Si la aplicacion devuelve una pagina de login o HTML, NO cuenta como PASS.
export const safeHttpFlows = {
  'ENV-006': async ({ page }) => {
    await loginAsAdmin(page);
    const url = '/ProgramacionEntrega/HorariosDisponibles?fecha=2000-01-01';
    const response = await page.request.get(url);
    expect(response.status(), 'El endpoint de horarios debe responder HTTP 200').toBe(200);
    expect(response.headers()['content-type'] || '', 'Respuesta JSON de horarios').toMatch(/application\/json/i);
    const data = await response.json();
    expect(data, 'El servidor debe responder un objeto de error').not.toBeNull();
    expect(Array.isArray(data), 'Una fecha antigua no debe devolver horarios').toBe(false);
    expect(typeof data.error, 'Una fecha antigua debe rechazarse').toBe('string');
    expect(data.error.trim().length, 'La respuesta debe explicar el rechazo').toBeGreaterThan(0);
  },
};
