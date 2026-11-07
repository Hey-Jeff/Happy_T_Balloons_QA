import { expect } from '@playwright/test';
import { login, loginAsAdmin, adminCredentials, clientCredentials } from './helpers.js';

// QA02 actualizado (22/10/2026): aserciones con los datos que muestra la UI de
// http://13.184.33.122. El Excel guia los escenarios, pero los valores se
// contrastaron con la interfaz. Solo lecturas, carrito de sesion y envios que la
// aplicacion debe rechazar; cada rechazo comprueba ademas que no se guardo nada.
// Nunca se ingresan contraseñas incorrectas para ninguna cuenta.

// 23/10/2026: hay dos productos activos "Agenda Planeador" (ID 3 y el nuevo ID 17, ₡1,000).
// 06/11/2026: la BD compartida NO es estable. Entre los runs #11 (27/10) y #13 (30/10) otro usuario
// creó la categoría inactiva "Prueba1" y el producto activo "Prueba1" (ID 18), y aparecieron pedidos
// "Pago pendiente" (PED-2026-0019..0023). Las listas siguientes son la LÍNEA BASE que debe seguir
// existiendo (datos semilla de QA02), no el contenido exacto: comparar la lista completa contra una
// constante convertía cualquier alta ajena en FAIL. Cuando la condición es "no se guardó nada" se
// compara el antes y el después de la propia prueba (detecta cualquier alta, no solo las conocidas).
const BASELINE_PRODUCTS = [
  '14 Cuentos De La Granja', '5 Lenguajes Del Amor', 'A Pintar Animales', 'Agenda Planeador', 'Agenda Planeador',
  'Bolsa De Regalo', 'Caja Lapices De Color', 'Caja Regalo', 'Colonia Hombre Versace',
  'Globos Celestes', 'Lego Golden Pothos', 'Lego Granja Minecraft', 'Papel De Regalo',
  'Set Pinturas Acrilicas', 'Sopa De Letras', 'Sticker Dino', 'Tarjetas Feliz Cumpleaños',
];
const BASELINE_CATEGORIES = ['Belleza', 'Empaque', 'Juguetes', 'Legos', 'Librería', 'Libros'];
const byName = (a, b) => a.localeCompare(b, 'es');
const sorted = list => [...list].sort(byName);
// Cada aparición de la línea base debe estar (respeta los dos "Agenda Planeador").
export function expectContainsBaseline(actual, baseline, label) {
  const pending = [...actual];
  const missing = [];
  for (const name of baseline) {
    const i = pending.indexOf(name);
    if (i < 0) missing.push(name); else pending.splice(i, 1);
  }
  expect(missing, `${label}: faltan elementos de la línea base`).toEqual([]);
}

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
// Valor de la opción con texto exacto (evita que "Libr" confunda Librería con Libros).
async function optionValue(select, label) {
  const value = await select.evaluate((el, text) => [...el.options].find(o => o.textContent.trim() === text)?.value ?? null, label);
  expect(value, `La opción "${label}" debe existir en el filtro`).not.toBeNull();
  return value;
}
// Cambia un <select> de un formulario GET y espera la página filtrada real.
// La UI desplegada entre el 27 y el 30/10/2026 envía estos filtros con onchange="this.form.submit()"
// y quitó los botones "Filtrar"/submit del catálogo, Pedidos y Reporte de inventario: hacer clic en
// un botón que ya no existe fue la causa de 9 FAIL del run #13. Si el formulario conserva botón y el
// <select> no se envía solo, se usa el botón. En ambos casos se espera la URL con el valor elegido,
// nunca un tiempo fijo.
async function selectAndSubmit(page, form, select, { label, value }, param) {
  const wanted = value ?? await optionValue(select, label);
  const target = url => url.searchParams.get(param) === wanted;
  const inlineAutoSubmit = await select.evaluate(el => /submit\s*\(/.test(el.getAttribute('onchange') || ''));
  const button = form.locator('button[type="submit"], input[type="submit"]');
  if (inlineAutoSubmit || await button.count() === 0) {
    await Promise.all([page.waitForURL(target), select.selectOption(wanted)]);
  } else {
    await select.selectOption(wanted);
    await Promise.all([page.waitForURL(target), button.first().click()]);
  }
  await expect(select, `El filtro ${param} queda aplicado tras recargar`).toHaveValue(wanted);
}
// Envía un texto de búsqueda con Enter (envío implícito del formulario, igual que un usuario).
async function searchAndSubmit(page, input, term, param) {
  await input.fill(term);
  await Promise.all([page.waitForURL(url => url.searchParams.get(param) === term), input.press('Enter')]);
}
const catalogForm = page => page.locator('form').filter({ has: page.locator('select[name="categoriaId"]') }).first();
async function filterCatalog(page, { categoria, busqueda }) {
  await go(page, '/');
  const form = catalogForm(page);
  if (categoria) {
    // El texto se escribe antes: el cambio de categoría envía el formulario completo.
    if (busqueda) await form.locator('input[name="busqueda"]').fill(busqueda);
    await selectAndSubmit(page, form, form.locator('select[name="categoriaId"]'), { label: categoria }, 'categoriaId');
    if (busqueda) expect(new URL(page.url()).searchParams.get('busqueda')).toBe(busqueda);
  } else {
    await searchAndSubmit(page, form.locator('input[name="busqueda"]'), busqueda, 'busqueda');
  }
}
// Tarjetas del catálogo con su categoría (badge) y texto completo.
const catalogCards = page => productCards(page).evaluateAll(cards => cards.map(c => ({
  name: c.querySelector('h6 a')?.textContent.trim() ?? '',
  href: c.querySelector('h6 a')?.getAttribute('href') ?? '',
  category: c.querySelector('.card-body > .badge')?.textContent.trim() ?? '',
  text: c.innerText.replace(/\s+/g, ' '),
})));
const activeCategoryOptions = page => page.locator('select[name="categoriaId"] option')
  .evaluateAll(options => options.filter(o => o.value).map(o => o.textContent.trim()));
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
const adminProductNames = page => page.locator('table.table-hover button.btn-editar').evaluateAll(bs => bs.map(b => b.dataset.nombre));
const categoryNames = page => rowsOf(page.locator('table').first()).then(rows => rows.map(r => r[0]));
// Historial rediseñado (visto en el run #13): Fecha | Tipo | Cambio ("+ 5 uds", "− 3 uds") |
// Stock ("20 → 25", icono por CSS) | Motivo | Usuario.
export function parseMovement([fecha, tipo, cambio, stock, motivo, usuario]) {
  const [antes, despues] = (stock.match(/\d+/g) || []).map(Number);
  const cantidad = Number(cambio.replace(/[−–]/g, '-').replace(/[^\d+-]/g, ''));
  return { fecha, tipo, cantidad, antes, despues, motivo, usuario };
}
async function inventoryMovements(page) {
  const table = page.locator('table').first();
  await expect(table.locator('thead')).toContainText(/Fecha\s+Tipo\s+Cambio\s+Stock\s+Motivo\s+Usuario/);
  const movements = (await rowsOf(table)).map(parseMovement);
  for (const m of movements.filter(m => m.tipo === 'Entrada' || m.tipo === 'Salida')) {
    expect(m.tipo === 'Entrada' ? m.cantidad > 0 : m.cantidad < 0, `Signo del cambio coherente con ${m.tipo} (${m.fecha})`).toBe(true);
    expect(m.antes + m.cantidad, `Stock anterior + cambio = stock nuevo (${m.fecha} ${m.motivo})`).toBe(m.despues);
  }
  return movements;
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
  'CAT-001': async ({ page, testInfo }) => {
    await go(page, '/');
    const cards = await catalogCards(page);
    expectContainsBaseline(cards.map(c => c.name), BASELINE_PRODUCTS, 'Catálogo público');
    const ids = cards.map(c => c.href.match(/\/Home\/Detalle\/(\d+)$/)?.[1]);
    expect(ids.every(Boolean), 'Cada tarjeta enlaza a /Home/Detalle/{id}').toBe(true);
    expect(new Set(ids).size, 'Sin productos repetidos en el catálogo').toBe(ids.length);
    // Observación (no cambia el resultado): productos visibles cuya categoría no está entre las activas
    // que ofrece el filtro. Desde el 26/10/2026 "Prueba1" (₡0) pertenece a una categoría inactiva.
    const active = new Set(await activeCategoryOptions(page));
    const orphan = cards.filter(c => !active.has(c.category)).map(c => `${c.name} [${c.category}]`);
    if (orphan.length) testInfo.annotations.push({ type: 'Observación', description: `Productos visibles de categorías no activas: ${orphan.join(', ')}` });
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
    const cards = await catalogCards(page);
    expectContainsBaseline(cards.map(c => c.name), ['Lego Golden Pothos', 'Lego Granja Minecraft'], 'Búsqueda "Lego"');
    for (const c of cards) expect(c.text, `Resultado sin relación con "Lego": ${c.name}`).toMatch(/lego/i);
  },
  'CAT-005': async ({ page }) => {
    // Esperado = las tarjetas "Libros" del catálogo completo: el filtro debe devolver todas y solo esas.
    await go(page, '/');
    const expected = (await catalogCards(page)).filter(c => c.category === 'Libros').map(c => c.name);
    expectContainsBaseline(expected, ['14 Cuentos De La Granja', '5 Lenguajes Del Amor', 'A Pintar Animales', 'Sopa De Letras'], 'Libros en el catálogo');
    await filterCatalog(page, { categoria: 'Libros' });
    expect(await cardNames(page)).toEqual(expected);
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
    const cards = await catalogCards(page);
    expectContainsBaseline(cards.map(c => c.name), ['Bolsa De Regalo', 'Caja Regalo', 'Papel De Regalo'], 'Empaque + "Regalo"');
    for (const c of cards) {
      expect(c.category, `Categoría fuera del filtro: ${c.name}`).toBe('Empaque');
      expect(c.text, `Resultado sin relación con "Regalo": ${c.name}`).toMatch(/regalo/i);
    }
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
    testInfo.skip(true, 'BLOQUEADO: consume intentos de login fallidos; la cuenta cliente QA (QA_CLIENT_EMAIL) quedó bloqueada el 23/10/2026. Requiere cuenta desechable (QA_LOCKOUT_EMAIL) en QA aislado.');
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
    const names = await adminProductNames(page);
    expect(rows.length, 'Una fila por producto, cada una con su acción de edición').toBe(names.length);
    expectContainsBaseline(names, BASELINE_PRODUCTS, 'Listado de productos');
    rows.forEach((r, i) => {
      expect(r[1].startsWith(names[i]), `Fila ${i + 1} muestra el nombre ${names[i]}`).toBe(true);
      expect(r[2], `Categoría de ${names[i]}`).not.toBe('');
      expect(r[3], `Precio de ${names[i]}`).toMatch(/^₡[\d,]+/);
      expect(r[4], `Stock de ${names[i]}`).toMatch(/^\d+$/);
      expect(r[5], `Estado de ${names[i]}`).toMatch(/^(Activo|Inactivo)$/);
      // Los productos semilla siguen activos y en sus categorías originales.
      if (BASELINE_PRODUCTS.includes(names[i])) {
        expect(BASELINE_CATEGORIES, `Categoría de ${names[i]}`).toContain(r[2]);
        expect(r[5], `Estado de ${names[i]}`).toBe('Activo');
      }
    });
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
  // CATE-004: "muestra las categorías activas disponibles". La tabla incluye también inactivas
  // (desde el 26/10/2026 existe "Prueba1" Inactiva), así que se comprueba el estado de cada fila y que
  // las activas del panel sean exactamente las que el catálogo público ofrece al cliente.
  'CATE-004': async ({ page }) => {
    await adminPage(page, '/Categoria', /categor[ií]as/i);
    const rows = await rowsOf(page.locator('table').first());
    for (const r of rows) expect(r[2], `Estado de ${r[0]}`).toMatch(/^(Activa|Inactiva)$/);
    const active = rows.filter(r => r[2] === 'Activa').map(r => r[0]);
    expectContainsBaseline(active, BASELINE_CATEGORIES, 'Categorías activas');
    const counter = page.getByText(/\d+ categor[ií]a\(s\) encontrada\(s\)/);
    if (await counter.count()) expect(parseInt(await counter.innerText(), 10), 'El contador coincide con las filas').toBe(rows.length);
    await go(page, '/');
    expect(sorted(await activeCategoryOptions(page)), 'Activas en el panel = categorías ofrecidas en el catálogo').toEqual(sorted(active));
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
  // PED-009: esperado = los pedidos "Cancelado" del listado completo; el filtro debe devolver todos y solo esos.
  'PED-009': async ({ page }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    const expected = (await rowsOf(page.locator('table').first())).filter(r => r[3] === 'Cancelado').map(r => r[0]);
    expectContainsBaseline(expected, ['PED-2026-0008', 'PED-2026-0003'], 'PRECONDICION: pedidos cancelados');
    const form = page.locator('form').filter({ has: page.locator('select[name="filtroEstado"]') }).first();
    await selectAndSubmit(page, form, form.locator('select[name="filtroEstado"]'), { value: 'Cancelado' }, 'filtroEstado');
    const rows = await rowsOf(page.locator('table').first());
    for (const r of rows) expect(r[3], r[0]).toBe('Cancelado');
    expect(rows.map(r => r[0])).toEqual(expected);
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
    for (const r of rows) expect(r[4]).toMatch(/^₡[\d,]+\.\d{2}$/);
    // Cada producto vendido existe en la gestión de productos y su categoría en la de categorías.
    await go(page, '/Producto');
    const products = await adminProductNames(page);
    await go(page, '/Categoria');
    const categories = await categoryNames(page);
    for (const r of rows) {
      expect(products, `Producto vendido registrado: ${r[1]}`).toContain(r[1]);
      expect(categories, `Categoría registrada: ${r[2]}`).toContain(r[2]);
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
    expectContainsBaseline(rows.map(r => r[0]), BASELINE_PRODUCTS, 'Reporte de inventario');
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
    const form = page.locator('form[action*="Inventario"]').first();
    await selectAndSubmit(page, form, form.locator('select[name="estadoStock"]'), { value: 'bajo' }, 'estadoStock');
    const low = await rowsOf(page.locator('table').first());
    expect(low.map(r => r[0])).toEqual(expectedLow);
    for (const r of low) {
      expect(r[4]).toBe('Stock bajo');
      expect(Number(r[2]), r[0]).toBeGreaterThan(0);
      expect(Number(r[2]), r[0]).toBeLessThanOrEqual(Number(r[3]));
    }
  },
  'REP-007': async ({ page }) => {
    // Esperado = filas "Librería" del reporte completo: el filtro debe devolver todas y solo esas.
    await adminPage(page, '/Reportes/Inventario', /reporte de inventario/i);
    const expected = (await rowsOf(page.locator('table').first())).filter(r => r[1] === 'Librería').map(r => r[0]);
    expectContainsBaseline(expected, ['Agenda Planeador', 'Agenda Planeador', 'Caja Lapices De Color', 'Globos Celestes', 'Set Pinturas Acrilicas', 'Sticker Dino'], 'Librería en el reporte');
    const form = page.locator('form[action*="Inventario"]').first();
    await selectAndSubmit(page, form, form.locator('select[name="categoriaId"]'), { label: 'Librería' }, 'categoriaId');
    const rows = await rowsOf(page.locator('table').first());
    expect(rows.map(r => r[0])).toEqual(expected);
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
    const before = await categoryNames(page);
    await page.locator('button[data-bs-target="#modalCrear"]').first().click();
    const form = page.locator('#formCrear');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="Nombre"]')).toHaveValue('');
    await form.locator('button[type="submit"]').click();
    expect(await form.locator('input[name="Nombre"]').evaluate(el => !el.checkValidity()), 'El navegador debe bloquear el nombre vacio').toBe(true);
    await expect(page).toHaveURL(/\/Categoria(?:\/Index)?(?:\?.*)?$/i);
    await go(page, '/Categoria');
    expect(await categoryNames(page), 'No se creó ninguna categoría').toEqual(before);
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
    const before = await categoryNames(page);
    expect(before, 'PRECONDICION: existe Belleza').toContain('Belleza');
    await page.locator('button[data-bs-target="#modalCrear"]').first().click();
    await page.locator('#formCrear input[name="Nombre"]').fill('Belleza');
    await page.locator('#formCrear button[type="submit"]').click();
    await expect(alert(page, 'Ya existe una categoría con ese nombre.')).toBeVisible();
    expect(await categoryNames(page), 'No se creó la categoría duplicada').toEqual(before);
  },
  'CATE-009': async ({ page }) => {
    await adminPage(page, '/Categoria', /categor[ií]as/i);
    const before = await categoryNames(page);
    await page.locator('button.btn-editar[data-nombre="Juguetes"]').click();
    const form = page.locator('#formEditar');
    await expect(form).toBeVisible();
    await form.locator('input[name="Id"]').evaluate(el => { el.value = '9999'; });
    await form.locator('input[name="Nombre"]').fill('Categoria QA Inexistente');
    await form.locator('button[type="submit"]').click();
    await expect(alert(page, 'Categoría no encontrada.')).toBeVisible();
    expect(await categoryNames(page), 'No se creó ni renombró ninguna categoría').toEqual(before);
  },
  'PRO-003': async ({ page }) => {
    await adminPage(page, '/Producto', /productos/i);
    const before = await adminProductNames(page);
    await go(page, '/Producto/Crear');
    const form = page.locator('form[action*="/Producto/Crear"]');
    await form.locator('input[name="Nombre"]').fill('Globo QA Precio Negativo');
    await form.locator('input[name="Precio"]').fill('-500');
    await form.locator('input[name="Stock"]').fill('10');
    await form.locator('select[name="CategoriaId"]').selectOption({ label: 'Juguetes' });
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Producto\/Crear/i);
    expect(await form.locator('input[name="Precio"]').evaluate(el => el.validity.rangeUnderflow), 'El precio minimo es 0.01').toBe(true);
    await go(page, '/Producto');
    const after = await adminProductNames(page);
    expect(after, 'No se creó el producto con precio negativo').not.toContain('Globo QA Precio Negativo');
    expect(after, 'El listado de productos no cambió').toEqual(before);
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
    // Radio Bootstrap "btn-check": el <input> queda oculto bajo su <label> (que intercepta el clic).
    // Se pulsa la etiqueta visible, como hace el usuario, y se confirma la selección.
    await page.locator('label[for="movSalida"]').click();
    await expect(page.locator('#movSalida')).toBeChecked();
    await page.locator('#movCantidad').fill('50');
    await page.locator('#movMotivo').fill('QA02 salida mayor al stock');
    await page.locator('#formMovimiento button[type="submit"]').click();
    await expect(alert(page, `Stock insuficiente. Stock actual: ${stock}. Cantidad solicitada: 50.`)).toBeVisible();
    await expect(page.locator('button.btn-registrar-mov[data-producto-id="3"]').first()).toHaveAttribute('data-stock-actual', stock);
  },
  // INV-007 / INV-008: movimientos existentes de Sopa De Letras (ID 5) registrados el 05/10/2026.
  // El historial se rediseñó antes del run #11 (columnas "Cambio" y "Stock anterior → nuevo"); los
  // datos no cambiaron. Además se valida que cada Entrada/Salida cuadre: anterior + cambio = nuevo.
  'INV-007': async ({ page }) => {
    await adminPage(page, '/MovimientosInventario/Historial?productoId=5', /historial de movimientos/i);
    await expect(page.getByText('Sopa De Letras').first()).toBeVisible();
    expect(await inventoryMovements(page)).toContainEqual({ fecha: '05/10/2026 22:37', tipo: 'Entrada', cantidad: 5, antes: 20, despues: 25, motivo: 'Reposición QA', usuario: 'admin@happytimes.com' });
  },
  'INV-008': async ({ page }) => {
    await adminPage(page, '/MovimientosInventario/Historial?productoId=5', /historial de movimientos/i);
    await expect(page.getByText('Sopa De Letras').first()).toBeVisible();
    expect(await inventoryMovements(page)).toContainEqual({ fecha: '05/10/2026 22:38', tipo: 'Salida', cantidad: -3, antes: 25, despues: 22, motivo: 'Ajuste QA', usuario: 'admin@happytimes.com' });
  },
  // PED-008: mensaje cuando la consulta no tiene pedidos. La precondición del Excel ("ningún pedido en
  // Pago pendiente") dejó de cumplirse el 25/10/2026 (PED-2026-0019..0023). Sin escribir en la BD se
  // busca un estado sin pedidos en el listado real; si todos tienen pedidos, se usa la búsqueda por
  // número con un valor que no puede existir. En ambos casos se exige el mensaje de "sin pedidos".
  'PED-008': async ({ page, testInfo }) => {
    await adminPage(page, '/Pedido', /gesti[oó]n de pedidos/i);
    const all = await rowsOf(page.locator('table').first());
    const form = page.locator('form').filter({ has: page.locator('select[name="filtroEstado"]') }).first();
    const select = form.locator('select[name="filtroEstado"]');
    const options = await select.evaluate(el => [...el.options].filter(o => o.value).map(o => ({ value: o.value, label: o.textContent.trim() })));
    const empty = options.find(o => !all.some(r => r[3] === o.label));
    if (empty) {
      testInfo.annotations.push({ type: 'Datos', description: `Estado sin pedidos usado: ${empty.label}` });
      await selectAndSubmit(page, form, select, { value: empty.value }, 'filtroEstado');
    } else {
      testInfo.annotations.push({ type: 'Datos', description: 'Todos los estados tienen pedidos: búsqueda por un número inexistente' });
      await searchAndSubmit(page, form.locator('input[name="filtroBusqueda"]'), 'PED-0000-0000', 'filtroBusqueda');
    }
    const rows = await rowsOf(page.locator('table').first());
    expect(rows, 'Una sola fila con el mensaje de lista vacía').toHaveLength(1);
    expect(rows[0].join(' ')).toMatch(/No se encontraron pedidos/i);
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
