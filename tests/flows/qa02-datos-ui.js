import { expect } from '@playwright/test';
import { login, loginAsAdmin, adminCredentials, clientCredentials } from './helpers.js';

// QA02 actualizado (22/10/2026): aserciones con los datos que muestra la UI de
// http://13.184.33.122. El Excel guia los escenarios, pero los valores se
// contrastaron con la interfaz. Solo lecturas, carrito de sesion y envios que la
// aplicacion debe rechazar; cada rechazo comprueba ademas que no se guardo nada.
// Nunca se ingresan contraseñas incorrectas para ninguna cuenta.

// 23/10/2026: hay dos productos activos "Agenda Planeador" (ID 3 y el nuevo ID 17, ₡1,000).
const ACTIVE_PRODUCTS = [
  '14 Cuentos De La Granja', '5 Lenguajes Del Amor', 'A Pintar Animales', 'Agenda Planeador', 'Agenda Planeador',
  'Bolsa De Regalo', 'Caja Lapices De Color', 'Caja Regalo', 'Colonia Hombre Versace',
  'Globos Celestes', 'Lego Golden Pothos', 'Lego Granja Minecraft', 'Papel De Regalo',
  'Set Pinturas Acrilicas', 'Sopa De Letras', 'Sticker Dino', 'Tarjetas Feliz Cumpleaños',
];
const ACTIVE_CATEGORIES = ['Belleza', 'Empaque', 'Juguetes', 'Legos', 'Librería', 'Libros'];

const productCards = page => page.locator('.card.h-100').filter({ has: page.locator('h6 a[href*="/Home/Detalle"]') });
const cardNames = page => page.locator('.card.h-100 h6 a[href*="/Home/Detalle"]').allInnerTexts().then(t => t.map(s => s.trim()));
const cardFor = (page, name) => productCards(page).filter({ has: page.getByRole('link', { name, exact: true }) });
const digits = text => Number(String(text).replace(/[^\d]/g, ''));
const colones = text => Number(String(text).replace(/[^\d.]/g, ''));

async function go(page, url) {
  const response = await page.goto(url);
  expect(response?.status(), `GET ${url} debe responder HTTP 200`).toBe(200);
  return response;
}
async function filterCatalog(page, { categoria, busqueda }) {
  await go(page, '/');
  if (categoria) await page.locator('select[name="categoriaId"]').selectOption({ label: categoria });
  if (busqueda) await page.locator('input[name="busqueda"]').fill(busqueda);
  await page.getByRole('button', { name: /filtrar/i }).click();
  await expect(page).toHaveURL(/\/\?/);
}
async function adminPage(page, route, heading) {
  await loginAsAdmin(page);
  await go(page, route);
  if (heading) await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
}
async function addToSessionCart(page, name) {
  await go(page, '/');
  await cardFor(page, name).locator('form[action*="AgregarAlCarrito"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Pedido\/Carrito/i);
  return page.locator('table tbody tr').filter({ hasText: name });
}
// Carrito de sesion anonimo y luego login: el checkout nunca se confirma.
async function checkoutWith(page, name) {
  await addToSessionCart(page, name);
  await loginAsAdmin(page);
  await go(page, '/Pedido/Checkout');
  await expect(page.locator('#formCheckout')).toBeVisible();
}
// Envia un formulario GET y espera la pagina filtrada antes de leer resultados.
async function submitFilter(page, form, param) {
  await Promise.all([
    page.waitForURL(url => url.searchParams.has(param)),
    page.locator(form).locator('button[type="submit"]').click(),
  ]);
}
const zone = (page, name) => page.locator('label.zona-card').filter({ hasText: name });
const alert = (page, text) => page.locator('.alert').filter({ hasText: text }).first();
// Regla de la UI: 0 = Sin stock; hasta el minimo = Stock bajo; por encima = Normal.
const stockStatus = (stock, min) => stock === 0 ? 'Sin stock' : stock <= min ? 'Stock bajo' : 'Normal';
const inventoryRow = (page, name) => page.locator('table.table-hover tbody tr').filter({ hasText: name });
async function expectConsistentStock(row) {
  const stock = Number(await row.locator('td').nth(2).innerText());
  const min = Number(await row.locator('td').nth(3).innerText());
  expect(Number.isInteger(stock) && stock >= 0, 'Stock actual numerico').toBe(true);
  expect(Number.isInteger(min) && min >= 0, 'Stock minimo numerico').toBe(true);
  await expect(row.locator('td').nth(4)).toHaveText(stockStatus(stock, min));
  return { stock, min };
}
function rowsOf(table) {
  return table.locator('tbody tr').evaluateAll(trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim().replace(/\s+/g, ' '))));
}
async function salesSummary(page) {
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const pick = re => text.match(re)?.[1];
  return {
    pedidos: Number(pick(/(\d+) Pedidos activos/)),
    ingresos: colones(pick(/(₡[\d,.]+) Ingresos totales/)),
    ticket: colones(pick(/(₡[\d,.]+) Ticket promedio/)),
    unidades: Number(pick(/(\d+) Unidades vendidas/)),
  };
}
const salesTable = (page, heading) => page.locator('.card').filter({ has: page.getByText(heading) }).last().locator('table').first();

export const qa02DatosUi = {
  // ---- Catalogo publico (sin sesion) ----
  'CAT-001': async ({ page }) => {
    await go(page, '/');
    expect(await cardNames(page)).toEqual(ACTIVE_PRODUCTS);
    for (const card of await productCards(page).all()) {
      await expect(card.locator('.card-body > .badge').first()).not.toHaveText('');
      await expect(card).toContainText('₡');
      await expect(card.locator('form[action*="AgregarAlCarrito"] button[type="submit"]')).toHaveCount(1);
    }
  },
  // CAT-002: FAIL mientras /Home/Detalle/{id} responda HTTP 500 (defecto documentado en QA02).
  'CAT-002': async ({ page }) => {
    await go(page, '/Home/Detalle/1');
    await expect(page.getByRole('heading', { name: 'Caja Lapices De Color', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('Caja de 10 lapices de colores, marca Norma.');
    await expect(page.locator('main')).toContainText('₡14,000');
    await expect(page.locator('main img').first()).toBeVisible();
  },
  'CAT-004': async ({ page }) => {
    await filterCatalog(page, { busqueda: 'Lego' });
    expect(new URL(page.url()).searchParams.get('busqueda')).toBe('Lego');
    expect(await cardNames(page)).toEqual(['Lego Golden Pothos', 'Lego Granja Minecraft']);
  },
  'CAT-005': async ({ page }) => {
    await filterCatalog(page, { categoria: 'Libros' });
    expect(await cardNames(page)).toEqual(['14 Cuentos De La Granja', '5 Lenguajes Del Amor', 'A Pintar Animales', 'Sopa De Letras']);
    for (const card of await productCards(page).all()) await expect(card.locator('.card-body > .badge').first()).toHaveText('Libros');
  },
  'CAT-006': async ({ page }) => {
    await filterCatalog(page, { busqueda: 'xyzqa123' });
    await expect(productCards(page)).toHaveCount(0);
    await expect(page.getByText('No hay productos disponibles en este momento.')).toBeVisible();
  },
  // CAT-008: "publicado" equivale a Activo; se comprueba la tarjeta del catalogo, no el detalle (CAT-002).
  'CAT-008': async ({ page }) => {
    await go(page, '/');
    const card = cardFor(page, 'Colonia Hombre Versace');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.card-body > .badge').first()).toHaveText('Belleza');
    await expect(card).toContainText('₡48,000');
    await expect(card.locator('h6 a')).toHaveAttribute('href', /\/Home\/Detalle\/12$/);
    await expect(card.locator('form[action*="AgregarAlCarrito"] button[type="submit"]')).toBeEnabled();
  },
  // CAT-011: se mantiene anonimo (conjunto publico); el acceso de cliente lo cubre PRO-012.
  'CAT-011': async ({ page }) => {
    for (const route of ['/Producto', '/Producto/Crear', '/Categoria']) {
      await page.goto(route);
      const url = new URL(page.url());
      expect(url.pathname, `Acceso anonimo indebido a ${route}`).toMatch(/^\/Cuenta\/Login$/i);
      expect(url.searchParams.get('ReturnUrl')).toBe(route);
    }
  },
  'CAT-012': async ({ page }) => {
    await filterCatalog(page, { categoria: 'Empaque', busqueda: 'Regalo' });
    expect(await cardNames(page)).toEqual(['Bolsa De Regalo', 'Caja Regalo', 'Papel De Regalo']);
    for (const card of await productCards(page).all()) await expect(card.locator('.card-body > .badge').first()).toHaveText('Empaque');
  },
  'CLI-003': async ({ page }) => {
    await go(page, '/Cuenta/Registro');
    await expect(page.locator('input[name="Nombre"]')).toHaveValue('');
    await expect(page.locator('input[name="Email"]')).toHaveValue('');
    await page.getByRole('button', { name: /crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/Cuenta\/Registro/i);
    await expect(page.locator('[data-valmsg-for="Nombre"]')).toHaveText('El nombre es requerido.');
    await expect(page.locator('[data-valmsg-for="Email"]')).toHaveText('El correo es requerido.');
  },
  'CLI-006': async ({ page }) => {
    await page.goto('/Pedido/MisPedidos');
    const url = new URL(page.url());
    expect(url.pathname, 'Debe impedir acceso anonimo al historial').toMatch(/^\/Cuenta\/Login$/i);
    expect(url.searchParams.get('ReturnUrl')).toBe('/Pedido/MisPedidos');
    await expect(page.getByRole('heading', { name: /iniciar sesi[oó]n/i })).toBeVisible();
  },
  // PRO-006: consulta de un producto inexistente desde la busqueda del catalogo.
  'PRO-006': async ({ page }) => {
    await filterCatalog(page, { busqueda: 'Producto Inexistente QA' });
    await expect(productCards(page)).toHaveCount(0);
    await expect(page.getByText('No hay productos disponibles en este momento.')).toBeVisible();
  },
  'CAT-003': async ({ page }) => {
    await filterCatalog(page, { categoria: 'Juguetes' });
    expect(new URL(page.url()).searchParams.get('categoriaId')).toBe('4');
    await expect(productCards(page)).toHaveCount(0);
    await expect(page.getByText('No hay productos disponibles en este momento.')).toBeVisible();
  },
  // AUT-002: bloqueado (ver BLOCKED_REASONS en scripts/qa02-all-105.mjs). Nunca intenta iniciar
  // sesion: el flujo anterior usaba contraseñas incorrectas y podia bloquear cuentas, incluida la de admin.
  'AUT-002': async ({ testInfo }) => {
    testInfo.skip(true, 'BLOQUEADO: la cuenta QA_tester (jeffrysmorales@gmail.com) quedó bloqueada temporalmente por intentos fallidos el 23/10/2026; el caso no se ejecuta.');
  },
  // AUT-005: respuesta generica (no revela si el correo existe) y sin enlace de recuperacion.
  'AUT-005': async ({ page }) => {
    await go(page, '/Cuenta/OlvideContrasena');
    await page.locator('input[name="Email"]').fill('noexiste.qa@happytimes.test');
    await page.getByRole('button', { name: /enviar enlace de recuperaci[oó]n/i }).click();
    await expect(page).toHaveURL(/\/Cuenta\/ConfirmacionEnvio/i);
    await expect(page.getByText('Revisa tu correo')).toBeVisible();
    await expect(page.locator('body')).toContainText('Si noexiste.qa@happytimes.test está registrado, recibirás un enlace de recuperación');
    await expect(page.locator('a[href*="RestablecerContrasena"]')).toHaveCount(0);
  },
  // CLI-002: el correo de admin@happytimes.com ya existe; la cuenta no se crea.
  'CLI-002': async ({ page }) => {
    await go(page, '/Cuenta/Registro');
    await page.locator('input[name="Nombre"]').fill('Cliente QA Duplicado');
    await page.locator('input[name="Email"]').fill('admin@happytimes.com');
    await page.locator('input[name="Contrasena"]').fill('ClaveQA#2026x');
    await page.locator('input[name="ConfirmarContrasena"]').fill('ClaveQA#2026x');
    await page.locator('input[name="Telefono"]').fill('8888-0000');
    await page.getByRole('button', { name: /crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/Cuenta\/Registro/i);
    await expect(page.getByText('Este correo electrónico ya está registrado.')).toBeVisible();
  },
  'PED-001': async ({ page }) => {
    const row = await addToSessionCart(page, 'Set Pinturas Acrilicas');
    await expect(page.getByRole('heading', { name: /mi carrito/i })).toBeVisible();
    await expect(row).toHaveCount(1);
    await expect(row.locator('td').nth(1)).toContainText('₡1,850');
    await expect(row.locator('td').nth(2)).toHaveText('1');
    await expect(row.locator('td').nth(3)).toHaveText('₡1,850');
  },
  'PED-002': async ({ page }) => {
    await go(page, '/');
    const card = cardFor(page, 'Sticker Dino');
    await expect(card).toContainText('Agotado');
    await expect(card.locator('form[action*="AgregarAlCarrito"] button[type="submit"]')).toBeDisabled();
    await go(page, '/Pedido/Carrito');
    await expect(page.getByText(/tu carrito est[aá] vac[ií]o/i).first()).toBeVisible();
  },
  'PED-003': async ({ page }) => {
    await addToSessionCart(page, 'Set Pinturas Acrilicas');
    const row = await addToSessionCart(page, 'Set Pinturas Acrilicas');
    await expect(row, 'Una sola fila por producto').toHaveCount(1);
    await expect(row.locator('td').nth(2)).toHaveText('2');
    await expect(row.locator('td').nth(3)).toHaveText('₡3,700');
  },

  // ---- Administrador (lectura) ----
  'PRO-004': async ({ page }) => {
    await adminPage(page, '/Producto', /productos/i);
    const table = page.locator('table.table-hover').first();
    await expect(table.locator('thead')).toContainText(/Nombre\s+Categoría\s+Precio\s+Stock\s+Estado/);
    const rows = await rowsOf(table);
    expect(rows).toHaveLength(17);
    expect(await table.locator('button.btn-editar').evaluateAll(bs => bs.map(b => b.dataset.nombre))).toEqual(ACTIVE_PRODUCTS);
    for (const r of rows) {
      expect(ACTIVE_CATEGORIES).toContain(r[2]);
      expect(r[3]).toMatch(/^₡[\d,]+/);
      expect(r[4]).toMatch(/^\d+$/);
      expect(r[5]).toBe('Activo');
    }
  },
  'PRO-005': async ({ page }) => {
    await adminPage(page, '/Producto', /productos/i);
    await page.locator('button.btn-editar[data-id="12"]').click();
    const modal = page.locator('#modalEditar');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="Nombre"]')).toHaveValue('Colonia Hombre Versace');
    await expect(modal.locator('textarea[name="Descripcion"]')).toHaveValue('Colonia Dylan Blue para Hombre, marca Versace.');
    await expect(modal.locator('input[name="Precio"]')).toHaveValue('48000.00');
    await expect(modal.locator('select[name="CategoriaId"] option:checked')).toHaveText('Belleza');
  },
  'PRO-002': async ({ page }) => {
    await adminPage(page, '/Producto/Crear');
    const form = page.locator('form[action*="/Producto/Crear"]');
    await expect(form.locator('input[name="Nombre"]')).toHaveValue('');
    await expect(form.locator('select[name="CategoriaId"]')).toHaveValue('');
    await form.locator('input[name="Precio"]').fill('1500');
    await form.locator('input[name="Stock"]').fill('0');
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Producto\/Crear/i);
    await expect(page.locator('[data-valmsg-for="Nombre"]')).toHaveText('El nombre es obligatorio.');
    await expect(page.locator('[data-valmsg-for="CategoriaId"]')).toHaveText('Selecciona una categoría.');
  },
  'CATE-004': async ({ page }) => {
    await adminPage(page, '/Categoria', /categor[ií]as/i);
    const rows = await rowsOf(page.locator('table').first());
    expect(rows.map(r => r[0])).toEqual(ACTIVE_CATEGORIES);
    for (const r of rows) expect(r[2]).toBe('Activa');
  },
  // Stock, pedidos y totales cambian con el uso normal de la app: se valida que la UI sea
  // consistente consigo misma en lugar de fijar cantidades.
  'INV-001': async ({ page }) => {
    await adminPage(page, '/Inventario', /inventario/i);
    const row = inventoryRow(page, '14 Cuentos De La Granja');
    await expect(row).toHaveCount(1);
    await expectConsistentStock(row);
  },
  'INV-006': async ({ page }) => {
    await adminPage(page, '/Inventario', /inventario/i);
    const row = inventoryRow(page, 'Lego Golden Pothos');
    await expect(row).toHaveCount(1);
    const { stock, min } = await expectConsistentStock(row);
    expect(stock, 'PRECONDICION: Lego Golden Pothos debe estar por encima del minimo').toBeGreaterThan(min);
    await expect(row.locator('td').nth(4)).toHaveText('Normal');
    await expect(page.locator('table.table-sm tbody tr').filter({ hasText: 'Lego Golden Pothos' }), 'No debe figurar en alertas de stock').toHaveCount(0);
  },
  'PED-007': async ({ page }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    const counter = await page.getByText(/\d+ pedido\(s\) encontrado\(s\)/).innerText();
    const table = page.locator('table').first();
    await expect(table.locator('thead')).toContainText(/Número\s+Cliente\s+Fecha\s+Estado\s+Total/);
    const rows = await rowsOf(table);
    expect(rows.length, 'El contador coincide con las filas').toBe(parseInt(counter, 10));
    const numbers = rows.map(r => r[0]);
    expect(numbers, 'Ordenados del mas reciente al mas antiguo').toEqual([...numbers].sort().reverse());
    expect(numbers).toContain('PED-2026-0018');
    expect(numbers.at(-1)).toBe('PED-2026-0001');
    for (const r of rows) {
      expect(r[0]).toMatch(/^PED-\d{4}-\d{4}$/);
      expect(r[3]).toMatch(/^(Pago pendiente|Pendiente|Procesando|Enviado|Entregado|Cancelado)$/);
      expect(r[4]).toMatch(/^₡[\d,]+$/);
    }
  },
  'PED-009': async ({ page }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    await page.locator('select[name="filtroEstado"]').selectOption('Cancelado');
    await submitFilter(page, 'form:has(select[name="filtroEstado"])', 'filtroEstado');
    expect(new URL(page.url()).searchParams.get('filtroEstado')).toBe('Cancelado');
    const rows = await rowsOf(page.locator('table').first());
    for (const r of rows) expect(r[3]).toBe('Cancelado');
    expect(rows.map(r => r[0])).toEqual(expect.arrayContaining(['PED-2026-0008', 'PED-2026-0003']));
  },
  // REP-001 / REP-003: sin filtro el reporte usa del dia 1 del mes en curso a hoy;
  // los totales dependen de la fecha y se validan contra las filas mostradas.
  'REP-001': async ({ page }) => {
    await adminPage(page, '/Reportes/Ventas', /reporte de ventas/i);
    const start = await page.locator('input[name="fechaInicio"]').inputValue();
    const end = await page.locator('input[name="fechaFin"]').inputValue();
    expect(start).toMatch(/^\d{4}-\d{2}-01$/);
    expect(end.slice(0, 7)).toBe(start.slice(0, 7));
    const s = await salesSummary(page);
    const orders = await rowsOf(salesTable(page, 'Pedidos del período'));
    expect(s.pedidos).toBe(orders.length);
    const total = orders.reduce((sum, r) => sum + colones(r[4]), 0);
    expect(s.ingresos).toBe(total);
    if (s.pedidos) expect(s.ticket).toBe(Math.round(total / s.pedidos * 100) / 100);
  },
  'REP-002': async ({ page }) => {
    await adminPage(page, '/Reportes/Ventas', /reporte de ventas/i);
    await page.locator('input[name="fechaInicio"]').fill('2026-07-01');
    await page.locator('input[name="fechaFin"]').fill('2026-07-31');
    await submitFilter(page, 'form[action*="Ventas"]', 'fechaInicio');
    expect(new URL(page.url()).searchParams.get('fechaInicio')).toBe('2026-07-01');
    expect(new URL(page.url()).searchParams.get('fechaFin')).toBe('2026-07-31');
    expect(await salesSummary(page)).toEqual({ pedidos: 7, ingresos: 94500, ticket: 13500, unidades: 17 });
    const orders = await rowsOf(salesTable(page, 'Pedidos del período'));
    expect(orders.map(r => r[0])).toEqual(['PED-2026-0015', 'PED-2026-0014', 'PED-2026-0013', 'PED-2026-0012', 'PED-2026-0011', 'PED-2026-0010', 'PED-2026-0009']);
  },
  'REP-003': async ({ page }) => {
    await adminPage(page, '/Reportes/Ventas', /reporte de ventas/i);
    const table = salesTable(page, /productos m[aá]s vendidos/i);
    await expect(table.locator('thead')).toContainText(/Producto\s+Categoría\s+Unidades vendidas\s+Ingresos/);
    const rows = await rowsOf(table);
    const s = await salesSummary(page);
    expect(rows.reduce((sum, r) => sum + Number(r[3]), 0), 'Unidades del detalle = Unidades vendidas').toBe(s.unidades);
    for (const r of rows) {
      expect(ACTIVE_PRODUCTS).toContain(r[1]);
      expect(ACTIVE_CATEGORIES).toContain(r[2]);
      expect(r[4]).toMatch(/^₡[\d,]+\.\d{2}$/);
    }
  },
  'REP-004': async ({ page }) => {
    await adminPage(page, '/Reportes/Ventas', /reporte de ventas/i);
    await page.locator('input[name="fechaInicio"]').fill('2020-01-01');
    await page.locator('input[name="fechaFin"]').fill('2020-01-31');
    await submitFilter(page, 'form[action*="Ventas"]', 'fechaInicio');
    expect(new URL(page.url()).searchParams.get('fechaInicio')).toBe('2020-01-01');
    await expect(page.getByText('Sin pedidos entregados en el período seleccionado')).toBeVisible();
    await expect(page.locator('main table')).toHaveCount(0);
  },
  'REP-005': async ({ page }) => {
    await adminPage(page, '/Reportes/Inventario', /reporte de inventario/i);
    const rows = await rowsOf(page.locator('table').first());
    expect(rows.map(r => r[0])).toEqual(ACTIVE_PRODUCTS);
    for (const r of rows) expect(r[4], r[0]).toBe(stockStatus(Number(r[2]), Number(r[3])));
    const n = status => rows.filter(r => r[4] === status).length;
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(text, 'Los indicadores coinciden con las filas').toContain(
      `${rows.length} Total productos ${n('Stock bajo')} Stock bajo ${n('Sin stock')} Sin stock ${n('Normal')} Stock normal`);
  },
  'REP-006': async ({ page }) => {
    await adminPage(page, '/Reportes/Inventario', /reporte de inventario/i);
    const all = await rowsOf(page.locator('table').first());
    // El filtro "Sin stock" devuelve todos los productos (defecto observado 22/10/2026):
    // los productos agotados se identifican en el listado completo.
    for (const r of all.filter(r => r[4] === 'Sin stock')) expect(Number(r[2]), r[0]).toBe(0);
    const expectedLow = all.filter(r => r[4] === 'Stock bajo').map(r => r[0]);
    expect(expectedLow.length, 'PRECONDICION: debe haber productos con stock bajo').toBeGreaterThan(0);
    await page.locator('select[name="estadoStock"]').selectOption('bajo');
    await submitFilter(page, 'form[action*="Inventario"]', 'estadoStock');
    expect(new URL(page.url()).searchParams.get('estadoStock')).toBe('bajo');
    const low = await rowsOf(page.locator('table').first());
    expect(low.map(r => r[0])).toEqual(expectedLow);
    for (const r of low) {
      expect(r[4]).toBe('Stock bajo');
      expect(Number(r[2]), r[0]).toBeGreaterThan(0);
      expect(Number(r[2]), r[0]).toBeLessThanOrEqual(Number(r[3]));
    }
  },
  'REP-007': async ({ page }) => {
    await adminPage(page, '/Reportes/Inventario', /reporte de inventario/i);
    await page.locator('select[name="categoriaId"]').selectOption({ label: 'Librería' });
    await submitFilter(page, 'form[action*="Inventario"]', 'categoriaId');
    const rows = await rowsOf(page.locator('table').first());
    expect(rows.map(r => r[0])).toEqual(['Agenda Planeador', 'Agenda Planeador', 'Caja Lapices De Color', 'Globos Celestes', 'Set Pinturas Acrilicas', 'Sticker Dino']);
    for (const r of rows) expect(r[1]).toBe('Librería');
  },
  'REP-008': async ({ page }) => {
    await adminPage(page, '/Reportes/Inventario', /reporte de inventario/i);
    const download = page.waitForEvent('download');
    await page.locator('a[href*="ExportarCsvInventario"]').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/i);
    const csv = await (await file.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString('utf8'));
    for (const name of ['Colonia Hombre Versace', 'Sticker Dino', 'Lego Golden Pothos']) expect(csv).toContain(name);
  },
  'CATE-003': async ({ page }) => {
    await adminPage(page, '/Categoria', /categor[ií]as/i);
    await page.locator('button[data-bs-target="#modalCrear"]').first().click();
    const form = page.locator('#formCrear');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="Nombre"]')).toHaveValue('');
    await form.locator('button[type="submit"]').click();
    expect(await form.locator('input[name="Nombre"]').evaluate(el => !el.checkValidity()), 'El navegador debe bloquear el nombre vacio').toBe(true);
    await expect(page).toHaveURL(/\/Categoria(?:\/Index)?(?:\?.*)?$/i);
    expect((await rowsOf(page.locator('table').first())).map(r => r[0])).toEqual(ACTIVE_CATEGORIES);
  },
  'ENV-012': async ({ page }) => {
    await adminPage(page, '/ZonasEntrega/Crear');
    const form = page.locator('form[action*="ZonasEntrega/Crear"]');
    await expect(form.locator('input[name="Nombre"]')).toHaveValue('');
    await form.locator('input[name="CostoEnvio"]').fill('2500');
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/ZonasEntrega\/Crear/i);
    const browserInvalid = await form.locator('input[name="Nombre"]').evaluate(el => !el.checkValidity());
    const serverInvalid = await page.locator('[data-valmsg-for="Nombre"].field-validation-error,.validation-summary-errors').count();
    expect(browserInvalid || serverInvalid > 0, 'Debe rechazar una zona sin nombre').toBeTruthy();
  },

  // ---- Envios que la aplicacion rechaza (se verifica que no se guarda nada) ----
  'CATE-002': async ({ page }) => {
    await adminPage(page, '/Categoria', /categor[ií]as/i);
    await page.locator('button[data-bs-target="#modalCrear"]').first().click();
    await page.locator('#formCrear input[name="Nombre"]').fill('Belleza');
    await page.locator('#formCrear button[type="submit"]').click();
    await expect(alert(page, 'Ya existe una categoría con ese nombre.')).toBeVisible();
    expect((await rowsOf(page.locator('table').first())).map(r => r[0])).toEqual(ACTIVE_CATEGORIES);
  },
  'CATE-009': async ({ page }) => {
    await adminPage(page, '/Categoria', /categor[ií]as/i);
    await page.locator('button.btn-editar[data-nombre="Juguetes"]').click();
    const form = page.locator('#formEditar');
    await expect(form).toBeVisible();
    await form.locator('input[name="Id"]').evaluate(el => { el.value = '9999'; });
    await form.locator('input[name="Nombre"]').fill('Categoria QA Inexistente');
    await form.locator('button[type="submit"]').click();
    await expect(alert(page, 'Categoría no encontrada.')).toBeVisible();
    expect((await rowsOf(page.locator('table').first())).map(r => r[0])).toEqual(ACTIVE_CATEGORIES);
  },
  'PRO-003': async ({ page }) => {
    await adminPage(page, '/Producto/Crear');
    const form = page.locator('form[action*="/Producto/Crear"]');
    await form.locator('input[name="Nombre"]').fill('Globo QA Precio Negativo');
    await form.locator('input[name="Precio"]').fill('-500');
    await form.locator('input[name="Stock"]').fill('10');
    await form.locator('select[name="CategoriaId"]').selectOption({ label: 'Juguetes' });
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Producto\/Crear/i);
    expect(await form.locator('input[name="Precio"]').evaluate(el => el.validity.rangeUnderflow), 'El precio minimo es 0.01').toBe(true);
    await go(page, '/Producto');
    expect(await page.locator('button.btn-editar').evaluateAll(bs => bs.map(b => b.dataset.nombre))).toEqual(ACTIVE_PRODUCTS);
  },
  'PRO-008': async ({ page }) => {
    await adminPage(page, '/Producto', /productos/i);
    await page.locator('button.btn-editar[data-id="16"]').click();
    const form = page.locator('#formEditar');
    await expect(form.locator('input[name="Nombre"]')).toHaveValue('Papel De Regalo');
    await form.locator('input[name="Precio"]').fill('-100');
    await page.locator('#formEditar button[type="submit"], button[form="formEditar"]').first().click();
    expect(await form.locator('input[name="Precio"]').evaluate(el => el.validity.rangeUnderflow), 'El precio minimo es 0.01').toBe(true);
    await go(page, '/Producto');
    await expect(page.locator('button.btn-editar[data-id="16"]')).toHaveAttribute('data-precio', '350.00');
  },
  'PRO-009': async ({ page }) => {
    await adminPage(page, '/Producto', /productos/i);
    await page.locator('button.btn-editar[data-id="16"]').click();
    await expect(page.locator('#modalEditar')).toBeVisible();
    await page.locator('#formEditar input[name="Id"]').evaluate(el => { el.value = '9999'; });
    await page.locator('#formEditar button[type="submit"], button[form="formEditar"]').first().click();
    await expect(alert(page, 'Producto no encontrado.')).toBeVisible();
    const original = page.locator('button.btn-editar[data-id="16"]');
    await expect(original).toHaveAttribute('data-nombre', 'Papel De Regalo');
    await expect(original).toHaveAttribute('data-precio', '350.00');
  },
  'INV-004': async ({ page }) => {
    await adminPage(page, '/Inventario', /inventario/i);
    const button = page.locator('button.btn-registrar-mov[data-producto-id="3"]').first();
    await expect(button).toHaveAttribute('data-producto-nombre', 'Agenda Planeador');
    const stock = await button.getAttribute('data-stock-actual');
    expect(Number(stock), 'PRECONDICION: la salida de 50 debe superar el stock').toBeLessThan(50);
    await button.click();
    await expect(page.locator('#formMovimiento')).toBeVisible();
    await page.locator('#movSalida').check();
    await page.locator('#movCantidad').fill('50');
    await page.locator('#movMotivo').fill('QA02 salida mayor al stock');
    await page.locator('#formMovimiento button[type="submit"]').click();
    await expect(alert(page, `Stock insuficiente. Stock actual: ${stock}. Cantidad solicitada: 50.`)).toBeVisible();
    await expect(page.locator('button.btn-registrar-mov[data-producto-id="3"]').first()).toHaveAttribute('data-stock-actual', stock);
  },
  // INV-007 / INV-008: movimientos existentes de Sopa De Letras (ID 5) registrados el 05/10/2026.
  'INV-007': async ({ page }) => {
    await adminPage(page, '/MovimientosInventario/Historial?productoId=5', /historial de movimientos/i);
    await expect(page.locator('table thead')).toContainText(/Fecha\s+Tipo\s+Cantidad\s+Stock anterior\s+Stock nuevo\s+Motivo\s+Usuario/);
    const rows = await rowsOf(page.locator('table').first());
    expect(rows).toContainEqual(['05/10/2026 22:37', 'Entrada', '+5', '20', '25', 'Reposición QA', 'admin@happytimes.com']);
  },
  'INV-008': async ({ page }) => {
    await adminPage(page, '/MovimientosInventario/Historial?productoId=5', /historial de movimientos/i);
    const rows = await rowsOf(page.locator('table').first());
    expect(rows).toContainEqual(['05/10/2026 22:38', 'Salida', '-3', '25', '22', 'Ajuste QA', 'admin@happytimes.com']);
  },
  'PED-008': async ({ page }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    await page.locator('select[name="filtroEstado"]').selectOption('PagoPendiente');
    await submitFilter(page, 'form:has(select[name="filtroEstado"])', 'filtroEstado');
    const rows = await rowsOf(page.locator('table').first());
    expect(rows).toEqual([['No se encontraron pedidos con los filtros aplicados']]);
  },
  'PED-011': async ({ page }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    const row = () => page.locator('table tbody tr').filter({ hasText: 'PED-2026-0013' });
    await expect(row().locator('td').nth(3)).toHaveText('Entregado');
    await page.locator('button[data-pedido-id="13"]').click();
    await expect(page.locator('#modalEstado')).toBeVisible();
    await page.locator('#modalEstado select').selectOption({ label: 'Pendiente' });
    await page.locator('#modalEstado button[type="submit"]').click();
    await expect(alert(page, "No se puede cambiar el estado de 'Entregado' a 'Pendiente'.")).toBeVisible();
    await expect(row().locator('td').nth(3)).toHaveText('Entregado');
  },
  // CLI-007: QA_tester no debe ver el pedido PED-2026-0017 de Karla Llosent.
  'CLI-007': async ({ page }) => {
    const { email, password } = clientCredentials();
    await login(page, email, password);
    await expect(page, 'El cliente QA debe iniciar sesion').not.toHaveURL(/\/Cuenta\/Login/i);
    const response = await page.goto('/Pedido/Detalle/17');
    await expect(page.locator('body')).not.toContainText('PED-2026-0017');
    await expect(page.locator('body')).not.toContainText('Karla Llosent');
    expect(response?.status(), 'Sin error de servidor').toBeLessThan(500);
  },

  // ---- Entregas (checkout de sesion, sin confirmar) ----
  'PED-006': async ({ page }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    const before = await page.getByText(/\d+ pedido\(s\) encontrado\(s\)/).innerText();
    await page.context().clearCookies();
    await checkoutWith(page, 'Set Pinturas Acrilicas');
    await expect(page.locator('textarea[name="DireccionEntrega"]')).toHaveValue('');
    await page.locator('#formCheckout button[type="submit"]').first().click();
    await expect(page.getByText('La dirección de entrega es obligatoria.')).toBeVisible();
    await expect(page.getByText('Selecciona un método de pago.')).toBeVisible();
    await go(page, '/Pedido');
    await expect(page.getByText(/\d+ pedido\(s\) encontrado\(s\)/), 'No se debe crear ningun pedido').toHaveText(before);
  },
  'ENV-001': async ({ page }) => {
    await checkoutWith(page, 'Set Pinturas Acrilicas');
    const oeste = zone(page, 'San José Oeste');
    await expect(oeste).toContainText('Escazú, Santa Ana, Mora');
    await expect(oeste).toHaveAttribute('data-costo', '2000.00');
    await oeste.locator('input.zona-radio').check();
    await expect(oeste.locator('input.zona-radio')).toBeChecked();
    expect(digits(await page.locator('#lblCostoEnvio').innerText())).toBe(2000);
    expect(digits(await page.locator('#lblTotal').innerText())).toBe(3850);
  },
  'ENV-003': async ({ page }) => {
    await checkoutWith(page, 'Set Pinturas Acrilicas');
    await expect(zone(page, 'San José Centro').locator('input.zona-radio')).toBeChecked();
    expect(digits(await page.locator('#lblCostoEnvio').innerText())).toBe(1000);
    await zone(page, 'Alajuela').locator('input.zona-radio').check();
    expect(digits(await page.locator('#lblCostoEnvio').innerText())).toBe(3000);
    expect(digits(await page.locator('#lblTotal').innerText())).toBe(4850);
  },
  // ENV-002: sin el POST tecnico del Excel (seria una escritura); se valida que el checkout no la ofrece.
  'ENV-002': async ({ page }) => {
    await checkoutWith(page, 'Set Pinturas Acrilicas');
    await expect(zone(page, 'San José Centro')).toHaveCount(1);
    await expect(zone(page, 'San José Sur')).toHaveCount(0);
    await go(page, '/ZonasEntrega');
    const sur = page.locator('table tbody tr').filter({ hasText: 'San José Sur' });
    await expect(sur.locator('td').nth(3)).toHaveText('No disponible');
  },
  // ENV-006: reglas de /ReglasOperativas (lunes a sabado, 1 a 30 dias). "Hoy" se toma
  // del servidor (fecha fin por defecto del reporte de ventas) para no depender del reloj local.
  'ENV-006': async ({ page }) => {
    await adminPage(page, '/Reportes/Ventas', /reporte de ventas/i);
    const today = new Date((await page.locator('input[name="fechaFin"]').inputValue()) + 'T12:00:00Z');
    const day = n => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d; };
    const iso = d => d.toISOString().slice(0, 10);
    let toSunday = 1; while (day(toSunday).getUTCDay() !== 0) toSunday++;
    const far = day(31).getUTCDay() === 0 ? day(32) : day(31);
    for (const [date, message] of [
      [iso(day(toSunday)),'No realizamos entregas ese día de la semana. Por favor elige otro día.'],
      [iso(day(-2)), 'La fecha de entrega debe ser al menos 1 día(s) desde hoy.'],
      [iso(far), 'La fecha de entrega no puede ser más de 30 días en el futuro.'],
    ]) {
      const response = await page.request.get(`/ProgramacionEntrega/HorariosDisponibles?fecha=${date}`);
      expect(response.status()).toBe(200);
      expect(await response.json(), `Fecha ${date}`).toEqual({ error: message });
    }
  },

  // ---- Cuentas de la matriz QA02 ----
  'PRO-012': async ({ page }) => {
    const { email, password } = clientCredentials();
    await login(page, email, password);
    await expect(page).not.toHaveURL(/\/Cuenta\/Login/i);
    for (const route of ['/Producto', '/Producto/Crear']) {
      await page.goto(route);
      const url = new URL(page.url());
      expect(url.pathname, `SEGURIDAD: el cliente alcanzo ${route}`).toMatch(/^\/Cuenta\/Login$/i);
      await expect(page.locator('form[action*="/Producto/Crear"]')).toHaveCount(0);
    }
  },
  // CLI-004: con la cuenta de administrador, segun lo acordado. Su historial debe coincidir con
  // los pedidos de "Administrador Principal" en la gestion de pedidos.
  'CLI-004': async ({ page }) => {
    const { email, password } = adminCredentials();
    await login(page, email, password);
    await go(page, '/Pedido');
    const own = (await rowsOf(page.locator('table').first())).filter(r => r[1] === 'Administrador Principal').map(r => r[0]);
    expect(own.length, 'PRECONDICION: la cuenta admin tiene pedidos').toBeGreaterThan(0);
    await go(page, '/Pedido/MisPedidos');
    await expect(page.getByRole('heading', { name: /mis pedidos/i })).toBeVisible();
    const table = page.locator('table').first();
    await expect(table.locator('thead')).toContainText(/Número\s+Fecha\s+Artículos\s+Estado\s+Total/);
    const rows = await rowsOf(table);
    expect(rows.map(r => r[0]), 'Solo los pedidos propios').toEqual(own);
    expect(rows.map(r => r[0])).not.toContain('PED-2026-0017'); // pedido de Karla Llosent
    await expect(table.locator('tbody tr').first().getByRole('link', { name: /ver/i })).toBeVisible();
  },
  // CLI-005: QA_tester (QA_CLIENT_EMAIL) no tiene pedidos.
  'CLI-005': async ({ page }) => {
    const { email, password } = clientCredentials();
    await login(page, email, password);
    await go(page, '/Pedido/MisPedidos');
    await expect(page.getByRole('heading', { name: /mis pedidos/i })).toBeVisible();
    await expect(page.getByText('Aún no tienes pedidos.')).toBeVisible();
    await expect(page.locator('main table')).toHaveCount(0);
  },
};
