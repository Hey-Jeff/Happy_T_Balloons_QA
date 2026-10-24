import { expect } from '@playwright/test';
import { login, loginAsAdmin } from './helpers.js';

// Cinco lecturas HTTP nuevas. Datos actuales; no se crean pedidos ni se cambia la BD.
// Si falta una precondicion, SKIP / BLOCKED; NUNCA false PASS.
async function adminPage(page, route) {
  await loginAsAdmin(page);
  const response = await page.goto(route);
  expect(response?.status(), `GET ${route} debe responder HTTP 200`).toBe(200);
  expect(new URL(page.url()).pathname).toMatch(new RegExp('^' + route + '(?:/Index)?$', 'i'));
}
async function go(page, url) {
  const response = await page.goto(url);
  expect(response?.status(), `GET ${url} debe responder HTTP 200`).toBe(200);
}
function skipMissing(testInfo, reason) {
  testInfo.skip(true, `PRECONDICION QA NO DISPONIBLE / BLOCKED: ${reason}`);
}
function adminRow(page, stateColumn, state) {
  return page.locator('table.table-hover tbody tr').filter({
    has: page.locator(`td:nth-child(${stateColumn}) .badge:has-text("${state}")`),
  }).first();
}

export const qa02ReadOnlyWave5 = {
  'ENV-002': async ({ page, testInfo }) => {
    await adminPage(page, '/ZonasEntrega');
    const row = adminRow(page, 4, 'No disponible');
    if (!(await row.count())) skipMissing(testInfo, 'No hay zona de entrega deshabilitada que contrastar con checkout');
    const name = (await row.locator('td').first().innerText()).trim();
    expect(name).not.toBe('');
    await go(page, '/');
    const card = page.locator('.card.h-100').filter({
      has: page.locator('form[action*="AgregarAlCarrito"] button[type="submit"]:not([disabled])'),
    }).first();
    if (!(await card.count())) skipMissing(testInfo, 'No hay producto activo con stock para llenar carrito de sesion');
    await card.locator('form[action*="AgregarAlCarrito"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Pedido\/Carrito/i);
    await go(page, '/Pedido/Checkout');
    await expect(page.locator('#formCheckout')).toBeVisible();
    await expect(page.locator('label.zona-card').filter({hasText:name})).toHaveCount(0);
  },
  'CLI-004': async ({ page, testInfo }) => {
    const email=process.env.QA_CLIENT_EMAIL, password=process.env.QA_CLIENT_PASSWORD;
    if (!email || !password) skipMissing(testInfo, 'Faltan credenciales de cliente QA');
    await login(page, email, password);
    await go(page, '/Pedido/MisPedidos');
    await expect(page.getByRole('heading', {name:/mis pedidos/i})).toBeVisible();
    const rows = page.locator('table tbody tr');
    if (!(await rows.count())) skipMissing(testInfo, 'Cliente QA no tiene pedidos; necesita fixture con al menos un pedido');
    await expect(page.locator('table thead')).toContainText(/n[uú]mero/i);
    await expect(rows.first().getByRole('link', {name:/ver/i})).toBeVisible();
  },
  'CLI-005': async ({ page, testInfo }) => {
    const email=process.env.QA_EMPTY_CLIENT_EMAIL, password=process.env.QA_EMPTY_CLIENT_PASSWORD;
    if (!email || !password) skipMissing(testInfo, 'Configurar secrets QA_EMPTY_CLIENT_EMAIL y QA_EMPTY_CLIENT_PASSWORD de cuenta QA sin pedidos');
    await login(page,email,password);
    await go(page, '/Pedido/MisPedidos');
    await expect(page.getByRole('heading', {name:/mis pedidos/i})).toBeVisible();
    await expect(page.getByText(/a[uú]n no tienes pedidos/i)).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
  },
};
