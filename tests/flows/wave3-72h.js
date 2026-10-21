import { expect } from '@playwright/test';
import { login, loginAsAdmin } from './helpers.js';

// Ola 3: 23 borradores NO verificados. NO forman parte del modo publicos por defecto.
// Los casos de escritura requieren BD QA aislada y restaurable; no ejecutarlos en la instancia compartida.
function fixture(name) {
  const value = process.env[name];
  if (!value) throw new Error(`PRECONDICION NO CUMPLIDA: falta ${name}. Configurar fixture de QA, nunca credenciales en Git.`);
  return value;
}
function isolatedWrites() {
  if (process.env.QA_ISOLATED_QA !== 'true' || process.env.QA_ALLOW_MUTATIONS !== 'true') {
    throw new Error('BLOQUEADO: requiere BD QA aislada y restaurable y QA_ISOLATED_QA=true + QA_ALLOW_MUTATIONS=true. No ejecutar en QA compartida.');
  }
}
async function open(page, path) {
  const res = await page.goto(path);
  expect(res?.status(), `HTTP al abrir ${path}`).toBeLessThan(400);
  return res;
}
async function admin(page, path) {
  await loginAsAdmin(page);
  const res = await page.goto(path);
  const pathname = new URL(page.url()).pathname;
  if (/^\/Cuenta\/Login$|^\/Error\/Prohibido$/i.test(pathname) || [401,403].includes(res?.status())) {
    throw new Error(`ROL ADMIN PENDIENTE: ${path} redirige a ${pathname}; solicitar rol a desarrollo.`);
  }
  expect(res?.status(), `HTTP administrativo ${path}`).toBeLessThan(400);
}
async function client(page) {
  await login(page,fixture('QA_CLIENT_EMAIL'),fixture('QA_CLIENT_PASSWORD'));
  // Comprobar que la cuenta tiene sesión, no simplemente salió de la pantalla de login.
  await open(page,'/Pedido/MisPedidos');
  await expect(page).toHaveURL(/\/Pedido\/MisPedidos(?:\?|$)/i);
  await expect(page.getByRole('heading',{name:/mis pedidos/i})).toBeVisible();
}
const unique = prefix => `${prefix}_${Date.now()}_${Math.floor(Math.random()*100000)}`;
function productRow(page, name) { return page.locator('table.table-hover tbody tr').filter({has:page.locator(`button.btn-editar[data-nombre="${name}"]`)}); }
function categoryRow(page,name) { return page.locator('table.table-hover tbody tr').filter({has:page.locator(`button.btn-editar[data-nombre="${name}"]`)}); }
async function createProduct(page) {
  isolatedWrites();
  await admin(page,'/Producto/Crear');
  const name=unique('QA02_PRODUCTO');
  const form=page.locator('form[action*="Producto/Crear"]');
  await expect(form).toBeVisible();
  await form.locator('input[name="Nombre"]').fill(name);
  await form.locator('input[name="Precio"]').fill('1250');
  await form.locator('input[name="Stock"]').fill('10');
  const option= form.locator('select[name="CategoriaId"] option[value]:not([value=""])').first();
  const id=await option.getAttribute('value');
  expect(id,'Se requiere una categoria activa en BD QA').toBeTruthy();
  await form.locator('select[name="CategoriaId"]').selectOption(id);
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Producto(?:\/Index)?(?:\?|$)/i);
  const row=productRow(page,name);
  await expect(row,'Producto creado debe persistir y aparecer en el listado').toBeVisible();
  expect(Number(await row.locator('button.btn-editar').getAttribute('data-precio'))).toBe(1250);
  return name;
}
async function productEdit(page,name) {
  await open(page,'/Producto');
  const row=productRow(page,name);
  await expect(row).toBeVisible();
  await row.locator('button.btn-editar').click();
  await expect(page.locator('#modalEditar')).toBeVisible();
  return page.locator('#formEditar');
}
async function productToggle(page,name,expectedStatus) {
  await open(page,'/Producto');
  const row=productRow(page,name);
  await expect(row).toBeVisible();
  page.once('dialog', dialog=>dialog.accept());
  await row.locator('.btn-toggle').click();
  await expect(productRow(page,name).locator('td').nth(5)).toContainText(expectedStatus);
}
async function createCategory(page) {
  isolatedWrites();
  await admin(page,'/Categoria');
  const name=unique('QA02_CATEGORIA');
  await page.locator('button[data-bs-target="#modalCrear"]').click();
  const form=page.locator('#formCrear');
  await expect(form).toBeVisible();
  await form.locator('input[name="Nombre"]').fill(name);
  await form.locator('textarea[name="Descripcion"]').fill('Categoria temporal para pruebas automatizadas');
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Categoria(?:\/Index)?(?:\?|$)/i);
  await expect(categoryRow(page,name),'Categoria creada debe aparecer en la tabla').toBeVisible();
  return name;
}
async function categoryToggle(page,name,status) {
  await open(page,'/Categoria');
  const row=categoryRow(page,name);
  await expect(row).toBeVisible();
  page.once('dialog',d=>d.accept());
  await row.locator('button.btn-toggle').click();
  await expect(categoryRow(page,name).locator('td').nth(2)).toContainText(status);
}
async function movement(page,kind,amount,requestedName) {
  isolatedWrites();
  await admin(page,'/Inventario');
  const name=requestedName || fixture('QA_INVENTORY_PRODUCT_NAME');
  const row=page.locator('table.table-hover tbody tr').filter({has:page.locator(`button.btn-registrar-mov[data-producto-nombre="${name}"]`)}).first();
  await expect(row,`Se necesita producto QA de inventario: ${name}`).toBeVisible();
  const action=row.locator('button.btn-registrar-mov');
  const productId=await action.getAttribute('data-producto-id');
  const before=Number(await action.getAttribute('data-stock-actual'));
  expect(Number.isSafeInteger(before)).toBeTruthy();
  await action.click();
  const form=page.locator('#formMovimiento');
  await expect(form).toBeVisible();
  await form.locator(`input[name="TipoMovimiento"][value="${kind==='Entrada'?'0':'1'}"]`).check();
  await form.locator('input[name="Cantidad"]').fill(String(amount));
  const motive=unique(`QA02_${kind}`);
  await form.locator('textarea[name="Motivo"]').fill(motive);
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Inventario(?:\/Index)?(?:\?|$)/i);
  const afterRow=page.locator('table.table-hover tbody tr').filter({has:page.locator(`button.btn-registrar-mov[data-producto-id="${productId}"]`)}).first();
  await expect(afterRow).toBeVisible();
  const after=Number(await afterRow.locator('button.btn-registrar-mov').getAttribute('data-stock-actual'));
  expect(after,`El movimiento ${kind} de ${amount} debe cambiar el stock`).toBe(before+(kind==='Entrada'?amount:-amount));
  return {name,productId,before,after,motive};
}
async function createZone(page) {
  isolatedWrites();
  await admin(page,'/ZonasEntrega/Crear');
  const name=unique('QA02_ZONA');
  const form=page.locator('form[action*="ZonasEntrega/Crear"]');
  await expect(form).toBeVisible();
  await form.locator('input[name="Nombre"]').fill(name);
  await form.locator('input[name="CostoEnvio"]').fill('1500');
  await form.locator('textarea[name="Descripcion"]').fill('Zona de prueba aislada');
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ZonasEntrega(?:\/Index)?(?:\?|$)/i);
  const row=page.locator('table tbody tr').filter({hasText:name}).first();
  await expect(row,`Zona creada debe aparecer en listado: ${name}`).toBeVisible();
  return name;
}

export const wave3Flows = {
  'CAT-003': async ({page}) => {
    if (process.env.QA_EXPECT_EMPTY_CATALOG !== 'true') throw new Error('PRECONDICION: usar BD QA sin productos activos y QA_EXPECT_EMPTY_CATALOG=true.');
    await open(page,'/');
    await expect(page.locator('.card.h-100')).toHaveCount(0);
    await expect(page.getByText('No hay productos disponibles en este momento.')).toBeVisible();
  },
  'CAT-009': async ({page}) => {
    const name=fixture('QA_INACTIVE_PRODUCT_NAME'); // producto inactivo preparado por desarrollo
    await open(page,'/');
    await page.locator('input[name="busqueda"]').fill(name);
    await page.getByRole('button',{name:/filtrar/i}).click();
    await expect(page.locator('.card.h-100 h6 a').filter({hasText:name})).toHaveCount(0);
    await expect(page.getByText('No hay productos disponibles en este momento.')).toBeVisible();
  },
  'CATE-005': async ({page}) => {
    if (process.env.QA_EXPECT_EMPTY_CATEGORIES !== 'true') throw new Error('PRECONDICION: BD QA sin categorias activas y QA_EXPECT_EMPTY_CATEGORIES=true.');
    await open(page,'/');
    await expect(page.locator('select[name="categoriaId"] option')).toHaveCount(1);
    await expect(page.locator('select[name="categoriaId"]')).toContainText('Todas las categorías');
  },
  'CATE-006': async ({page}) => {
    const name=fixture('QA_INACTIVE_CATEGORY_NAME');
    await open(page,'/');
    await expect(page.locator('select[name="categoriaId"] option').filter({hasText:name})).toHaveCount(0);
  },
  'CLI-007': async ({page}) => {
    const otherOrderId=fixture('QA_FOREIGN_ORDER_ID');
    expect(otherOrderId).toMatch(/^\d+$/);
    await client(page);
    const response=await page.goto(`/Pedido/Detalle/${otherOrderId}`);
    const path=new URL(page.url()).pathname;
    const denied=[401,403].includes(response?.status()) || /^\/Error\/Prohibido$|^\/Cuenta\/Login$/i.test(path);
    expect(denied,`Se permite acceder al pedido ajeno ${otherOrderId}: ${path}, HTTP ${response?.status()}`).toBeTruthy();
    await expect(page.locator('table tbody tr')).toHaveCount(0);
  },
  'PRO-001': async ({page}) => { await createProduct(page); },
  'PRO-007': async ({page}) => {
    const name=await createProduct(page);
    const form=await productEdit(page,name);
    const updated=`${name}_EDIT`;
    await form.locator('input[name="Nombre"]').fill(updated);
    await page.locator('button[form="formEditar"]').click();
    await expect(page).toHaveURL(/\/Producto(?:\/Index)?(?:\?|$)/i);
    await expect(productRow(page,updated)).toBeVisible();
    await expect(productRow(page,name)).toHaveCount(0);
  },
  'PRO-008': async ({page}) => {
    const name=await createProduct(page);
    const form=await productEdit(page,name);
    await form.locator('input[name="Precio"]').fill('-10');
    await page.locator('button[form="formEditar"]').click();
    // Browser may block invalid negative number; if request reaches server it must refuse it.
    const invalid=await form.locator('input[name="Precio"]').evaluate(el=>!el.checkValidity()).catch(()=>false);
    if (!invalid) {
      await expect(page).toHaveURL(/\/Producto(?:\/Index)?(?:\?|$)/i);
      await expect(page.locator('.alert-danger')).toBeVisible();
    }
    await open(page,'/Producto');
    await expect(productRow(page,name).locator('td').nth(3)).not.toContainText('-10');
  },
  'PRO-010': async ({page}) => {
    const name=await createProduct(page);
    await productToggle(page,name,'Inactivo');
  },
  'PRO-011': async ({page}) => {
    const name=await createProduct(page);
    await productToggle(page,name,'Inactivo');
    await productToggle(page,name,'Activo');
  },
  'CATE-001': async ({page}) => { await createCategory(page); },
  'CATE-002': async ({page}) => {
    const name=await createCategory(page);
    await page.locator('button[data-bs-target="#modalCrear"]').click();
    const form=page.locator('#formCrear');
    await form.locator('input[name="Nombre"]').fill(name);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.alert-danger')).toBeVisible();
    await expect(categoryRow(page,name)).toHaveCount(1);
  },
  'CATE-007': async ({page}) => {
    const name=await createCategory(page);
    const row=categoryRow(page,name);
    await row.locator('button.btn-editar').click();
    const form=page.locator('#formEditar');
    await expect(form).toBeVisible();
    const newName=`${name}_EDIT`;
    await form.locator('input[name="Nombre"]').fill(newName);
    await form.locator('button[type="submit"]').click();
    await expect(categoryRow(page,newName)).toBeVisible();
    await expect(categoryRow(page,name)).toHaveCount(0);
  },
  'CATE-010': async ({page}) => {
    const name=await createCategory(page);
    await categoryToggle(page,name,'Inactiva');
  },
  'CATE-011': async ({page}) => {
    const name=await createCategory(page);
    await categoryToggle(page,name,'Inactiva');
    await categoryToggle(page,name,'Activa');
  },
  'INV-002': async ({page}) => { await movement(page,'Entrada',5); },
  'INV-003': async ({page}) => {
    // Registrar salida solo cuando el producto QA dedicado tiene existencias.
    isolatedWrites();await admin(page,'/Inventario');
    const name=fixture('QA_INVENTORY_PRODUCT_NAME');
    const btn=page.locator(`button.btn-registrar-mov[data-producto-nombre="${name}"]`).first();
    await expect(btn).toBeVisible();
    expect(Number(await btn.getAttribute('data-stock-actual')),'Se requiere stock >= 1').toBeGreaterThanOrEqual(1);
    await movement(page,'Salida',1,name);
  },
  'INV-004': async ({page}) => {
    isolatedWrites();await admin(page,'/Inventario');
    const name=fixture('QA_INVENTORY_PRODUCT_NAME');
    const btn=page.locator(`button.btn-registrar-mov[data-producto-nombre="${name}"]`).first();
    await expect(btn).toBeVisible();
    const id=await btn.getAttribute('data-producto-id'),before=Number(await btn.getAttribute('data-stock-actual'));
    await btn.click();
    const form=page.locator('#formMovimiento');await expect(form).toBeVisible();
    await form.locator('#movSalida').check();
    await form.locator('#movCantidad').fill(String(before+10));
    await form.locator('#movMotivo').fill(unique('QA02_SOBRESTOCK'));
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.alert-danger')).toBeVisible();
    const after=Number(await page.locator(`button.btn-registrar-mov[data-producto-id="${id}"]`).first().getAttribute('data-stock-actual'));
    expect(after,'La salida de stock excesiva NO debe modificar existencias').toBe(before);
  },
  'INV-007': async ({page}) => {
    const {productId,motive}=await movement(page,'Entrada',2);
    await open(page,`/MovimientosInventario/Historial?productoId=${productId}`);
    const row=page.locator('table tbody tr').filter({hasText:motive}).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Entrada');
  },
  'INV-008': async ({page}) => {
    isolatedWrites();await admin(page,'/Inventario');
    const name=fixture('QA_INVENTORY_PRODUCT_NAME');
    const btn=page.locator(`button.btn-registrar-mov[data-producto-nombre="${name}"]`).first();
    await expect(btn).toBeVisible();
    expect(Number(await btn.getAttribute('data-stock-actual'))).toBeGreaterThanOrEqual(1);
    const {productId,motive}=await movement(page,'Salida',1,name);
    await open(page,`/MovimientosInventario/Historial?productoId=${productId}`);
    const row=page.locator('table tbody tr').filter({hasText:motive}).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Salida');
  },
  'ENV-009': async ({page}) => { await createZone(page); },
  'ENV-010': async ({page}) => {
    const name=await createZone(page);
    const row=page.locator('table tbody tr').filter({hasText:name}).first();
    const link=row.locator('a[href*="ZonasEntrega/Editar"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/ZonasEntrega\/Editar\/\d+/i);
    const form=page.locator('form[action*="ZonasEntrega/Editar"]');
    const newName=`${name}_EDIT`;
    await form.locator('input[name="Nombre"]').fill(newName);
    await form.locator('input[name="CostoEnvio"]').fill('1750');
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/ZonasEntrega(?:\/Index)?(?:\?|$)/i);
    await expect(page.locator('table tbody tr').filter({hasText:newName})).toBeVisible();
  },
};
