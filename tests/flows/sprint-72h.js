import { expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

// Primera tanda del sprint 72h: borradores exploratorios, NO casos verificados.
// Basados en las vistas ASP.NET MVC del repositorio de la aplicación.
// Sin altas, bajas, pagos, cambios de stock ni escrituras deliberadas.

async function requireAdminPage(page, route, heading) {
  await loginAsAdmin(page);
  const response = await page.goto(route);
  const finalPath = new URL(page.url()).pathname;
  if (/^\/Cuenta\/Login$/i.test(finalPath)) {
    throw new Error(`BLOQUEADO POR ROL/SESIÓN QA: ${route} devolvió al login. Solicitar Administrador a desarrollo.`);
  }
  expect(response?.status(), `HTTP de ${route}`).toBeLessThan(400);
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
}

async function firstSeededProduct(page) {
  await page.goto('/');
  const card = page.locator('.card.h-100').filter({has: page.locator('a[href*="/Home/Detalle"]')}).first();
  await expect(card, 'Se necesita al menos un producto sembrado en el catálogo QA').toBeVisible();
  const title = (await card.locator('h6 a').first().innerText()).trim();
  const category = (await card.locator('.card-body > .badge').first().innerText()).trim();
  expect(category, 'El producto necesita categoría para probar los filtros').not.toBe('');
  return {title,category};
}

function urlHas(page, key, value) {
  const actual = new URL(page.url()).searchParams.get(key);
  expect(actual, `Parámetro ${key} esperado en ${page.url()}`).toBe(value);
}

export const sprintFlows = {
  // CAT-005: categoría con productos conocidos desde la propia interfaz.
  'CAT-005': async ({page}) => {
    const {category} = await firstSeededProduct(page);
    await page.locator('select[name="categoriaId"]').selectOption({label:category});
    await page.getByRole('button',{name:/filtrar/i}).click();
    const selected = await page.locator('select[name="categoriaId"]').inputValue();
    urlHas(page,'categoriaId',selected);
    const cards = page.locator('.card.h-100');
    expect(await cards.count(),'El producto usado como semilla debe permanecer visible').toBeGreaterThan(0);
    for(const c of await cards.all()) {
      await expect(c.locator('.card-body > .badge').first()).toHaveText(category);
    }
  },
  // CAT-008: artículo público enlazado al detalle real (lectura solamente).
  'CAT-008': async ({page}) => {
    const {title} = await firstSeededProduct(page);
    await page.locator('.card.h-100 h6 a').first().click();
    await expect(page).toHaveURL(/\/Home\/Detalle\/\d+/i);
    await expect(page.getByRole('heading',{name:title,exact:true}).first()).toBeVisible();
    await expect(page.locator('body')).toContainText('₡');
  },
  // CAT-011: acceso anónimo a administración debe rechazarse.
  'CAT-011': async ({page}) => {
    const response = await page.goto('/Producto');
    const finalPath = new URL(page.url()).pathname;
    const redirectedToLogin = /^\/Cuenta\/Login$/i.test(finalPath);
    const deniedPage = /^\/Error\/Prohibido$/i.test(finalPath) || [401,403].includes(response?.status());
    expect(redirectedToLogin || deniedPage,
      `Acceso ANÓNIMO indebido a /Producto: ruta ${finalPath}, HTTP ${response?.status()}`
    ).toBeTruthy();
    await expect(page.locator('button.btn-editar')).toHaveCount(0);
  },
  // CAT-012: búsqueda combinada con categoría; semilla obtenida de UI.
  'CAT-012': async ({page}) => {
    const {title,category} = await firstSeededProduct(page);
    const value = await page.locator('select[name="categoriaId"]').selectOption({label:category});
    await page.locator('input[name="busqueda"]').fill(title);
    await page.getByRole('button',{name:/filtrar/i}).click();
    urlHas(page,'categoriaId',value[0]);
    urlHas(page,'busqueda',title);
    const item = page.locator('.card.h-100').filter({has: page.getByRole('link',{name:title,exact:true})}).first();
    await expect(item).toBeVisible();
    await expect(item.locator('.card-body > .badge').first()).toHaveText(category);
  },
  // CLI-003: formulario inválido, sin crear cuentas ni enviar datos válidos.
  'CLI-003': async ({page}) => {
    await page.goto('/Cuenta/Registro');
    await expect(page.getByRole('heading',{name:/crear cuenta/i}).first()).toBeVisible();
    await page.getByRole('button',{name:/crear cuenta/i}).click();
    await expect(page).toHaveURL(/\/Cuenta\/Registro/i);
    const invalidFields = await page.locator('form input:invalid').count();
    const serverErrors = await page.locator('.validation-summary-errors,.field-validation-error,.alert-danger').count();
    expect(invalidFields+serverErrors,'Registro vacío debe mostrar validaciones').toBeGreaterThan(0);
  },
  // PRO-005: detalle disponible en modal de edición, sin guardar cambios.
  'PRO-005': async ({page}) => {
    await requireAdminPage(page,'/Producto',/productos/i);
    const edit = page.locator('button.btn-editar').first();
    await expect(edit,'Debe existir un producto sembrado en QA').toBeVisible();
    const name = await edit.getAttribute('data-nombre');
    expect(name).toBeTruthy();
    await edit.click();
    const modal = page.locator('#modalEditar');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="Nombre"]')).toHaveValue(name);
  },
  // CATE-004: categorías disponibles en la administración.
  'CATE-004': async ({page}) => {
    await requireAdminPage(page,'/Categoria',/categor[ií]as/i);
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.locator('table thead').first()).toContainText(/nombre/i);
  },
  // INV-001: lectura real de una fila de inventario y su cantidad.
  'INV-001': async ({page}) => {
    await requireAdminPage(page,'/Inventario',/inventario/i);
    const row = page.locator('table.table-hover tbody tr').filter({has:page.locator('td:not([colspan])')}).first();
    await expect(row,'Inventario QA necesita al menos un producto').toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/\d+/);
  },
  // PED-007: administración de pedidos sin alterar estados.
  'PED-007': async ({page}) => {
    await requireAdminPage(page,'/Pedido',/gesti[oó]n de pedidos/i);
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.locator('table thead').first()).toContainText(/n[uú]mero/i);
  },
  // PED-009: filtro de pedidos solo lectura.
  'PED-009': async ({page}) => {
    await requireAdminPage(page,'/Pedido',/gesti[oó]n de pedidos/i);
    const control=page.locator('select[name="filtroEstado"]');
    await expect(control).toBeVisible();
    const options=await control.locator('option').evaluateAll(els=>els.map(el=>el.value).filter(Boolean));
    expect(options.length,'Debe haber estados disponibles').toBeGreaterThan(0);
    await control.selectOption(options[0]);
    await page.getByRole('button',{name:/filtrar/i}).click();
    urlHas(page,'filtroEstado',options[0]);
    await expect(page.locator('table').first()).toBeVisible();
  },
  // REP-002: fechas seleccionadas se conservan tras filtrar.
  'REP-002': async ({page}) => {
    await requireAdminPage(page,'/Reportes/Ventas',/reporte de ventas/i);
    const day=new Date().toISOString().slice(0,10);
    await page.locator('input[name="fechaInicio"]').fill(day);
    await page.locator('input[name="fechaFin"]').fill(day);
    await page.locator('form[action*="Ventas"] button[type="submit"]').click();
    urlHas(page,'fechaInicio',day);
    urlHas(page,'fechaFin',day);
    await expect(page.locator('input[name="fechaInicio"]')).toHaveValue(day);
  },
  // REP-003: sección de top ventas y tabla vinculada.
  'REP-003': async ({page}) => {
    await requireAdminPage(page,'/Reportes/Ventas',/reporte de ventas/i);
    await expect(page.getByText(/productos m[aá]s vendidos/i).first()).toBeVisible();
    const section=page.locator('.card').filter({has:page.getByText(/productos m[aá]s vendidos/i)}).last();
    await expect(section.locator('table').first()).toBeVisible();
    await expect(section.locator('table thead').first()).toContainText(/producto/i);
  },
  // REP-004: intervalo futuro sin ventas; no altera pedidos.
  'REP-004': async ({page}) => {
    await requireAdminPage(page,'/Reportes/Ventas',/reporte de ventas/i);
    await page.locator('input[name="fechaInicio"]').fill('2100-01-01');
    await page.locator('input[name="fechaFin"]').fill('2100-01-02');
    await page.locator('form[action*="Ventas"] button[type="submit"]').click();
    urlHas(page,'fechaInicio','2100-01-01');
    await expect(page.getByText(/sin pedidos entregados|sin resultados|no hay ventas|no se encontraron|no hay datos/i).first()).toBeVisible();
  },
  // REP-006: stock bajo; requiere al menos una semilla stock bajo en la BD QA.
  'REP-006': async ({page}) => {
    await requireAdminPage(page,'/Reportes/Inventario',/reporte de inventario/i);
    await page.locator('select[name="estadoStock"]').selectOption('bajo');
    await page.locator('form[action*="Inventario"] button[type="submit"]').click();
    urlHas(page,'estadoStock','bajo');
    const rows=page.locator('table tbody tr');
    expect(await rows.count(),'QA requiere un producto con stock bajo').toBeGreaterThan(0);
    for(const row of await rows.all()) {
      await expect(row.getByText('Stock bajo',{exact:true}).first()).toBeVisible();
    }
  },
  // REP-007: productos del reporte limitados a categoría de un registro sembrado.
  'REP-007': async ({page}) => {
    await requireAdminPage(page,'/Reportes/Inventario',/reporte de inventario/i);
    const item=page.locator('table tbody tr').first();
    await expect(item,'Se necesita un producto en inventario QA').toBeVisible();
    const category=(await item.locator('td').nth(1).innerText()).trim();
    const select=page.locator('select[name="categoriaId"]');
    const value=await select.selectOption({label:category});
    await page.locator('form[action*="Inventario"] button[type="submit"]').click();
    urlHas(page,'categoriaId',value[0]);
    for(const row of await page.locator('table tbody tr').all()) {
      await expect(row.locator('td').nth(1)).toContainText(category);
    }
  },
  // REP-008: descarga CSV desde página administrativa (sin modificar BD).
  'REP-008': async ({page}) => {
    await requireAdminPage(page,'/Reportes/Inventario',/reporte de inventario/i);
    const download=page.waitForEvent('download');
    await page.locator('a[href*="ExportarCsvInventario"]').click();
    const file=await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/i);
  }
};
