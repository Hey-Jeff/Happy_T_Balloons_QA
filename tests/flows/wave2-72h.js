import { expect } from '@playwright/test';
import { login, loginAsAdmin, clientCredentials } from './helpers.js';

// Ola 2 / sprint 72h. Son BORRADORES: una prueba PASS NO equivale a un caso formalmente verificado.
// En QA compartido se permiten solo GET, comprobaciones negativas sin datos válidos y carrito de sesión.

function fixture(name) {
  const value = process.env[name];
  if (!value) throw new Error(`DATOS QA FALTANTES: configurar ${name} como Secret de GitHub Actions. No guardar secretos en Git.`);
  return value;
}
function isolatedWrites() {
  if (process.env.QA_ALLOW_MUTATIONS !== 'true' || process.env.QA_ISOLATED_QA !== 'true') {
    throw new Error('BLOQUEADO: este caso puede escribir datos si hay un defecto. Requiere QA_ALLOW_MUTATIONS=true y QA_ISOLATED_QA=true, con BD QA aislada y restaurable.');
  }
}
async function admin(page, route) {
  await loginAsAdmin(page);
  const response = await page.goto(route);
  const pathname = new URL(page.url()).pathname;
  if (/^\/Cuenta\/Login$/i.test(pathname) || /^\/Error\/Prohibido$/i.test(pathname)) {
    throw new Error(`BLOQUEADO POR ROL: el usuario QA no puede abrir ${route} (ruta final: ${pathname}).`);
  }
  expect(response?.status(), `Respuesta HTTP al abrir ${route}`).toBeLessThan(400);
  return page;
}
async function client(page, emailName='QA_CLIENT_EMAIL',passwordName='QA_CLIENT_PASSWORD') {
  await login(page,fixture(emailName),fixture(passwordName));
  const pathname = new URL(page.url()).pathname;
  expect(pathname, 'El usuario cliente debe salir de la pantalla de login').not.toMatch(/^\/Cuenta\/Login$/i);
}
function productCards(page) {
  return page.locator('.card.h-100').filter({has:page.locator('form[action*="AgregarAlCarrito"]')});
}
async function firstAvailableCard(page) {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
  const cards = productCards(page);
  const available = cards.filter({has:page.locator('button[type="submit"]:not([disabled])')}).first();
  await expect(available, 'Requiere un producto activo con stock en el catálogo QA').toBeVisible();
  const title = (await available.locator('h6 a').first().innerText()).trim();
  const form = available.locator('form[action*="AgregarAlCarrito"]').first();
  const id = await form.locator('input[name="productoId"]').inputValue();
  expect(id).toMatch(/^\d+$/);
  return {card:available,title,id,form};
}
async function addToSessionCart(page) {
  const product = await firstAvailableCard(page);
  await product.form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Pedido\/Carrito(?:\?.*)?$/i);
  const row = page.locator('table tbody tr').filter({hasText:product.title}).first();
  await expect(row).toBeVisible();
  return {...product,row};
}
async function checkoutWithSessionCart(page) {
  // Solo modifica el carrito efímero del contexto de este test, NUNCA confirma pedido.
  await addToSessionCart(page);
  await loginAsAdmin(page);
  const res=await page.goto('/Pedido/Checkout');
  if (/\/Cuenta\/Login/i.test(page.url())) throw new Error('BLOQUEADO POR SESIÓN: iniciar sesión no habilitó el checkout.');
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator('#formCheckout')).toBeVisible();
  return page;
}
function shippingCost(label) { return label.getAttribute('data-costo').then(raw=>Number(raw)); }

export const wave2Flows = {
  // PED-001: alta de carrito de sesión solamente, sin enviar pedidos ni pagos.
  'PED-001': async ({page}) => {
    const {title,row}=await addToSessionCart(page);
    await expect(page.getByRole('heading',{name:/mi carrito/i})).toBeVisible();
    await expect(row.locator('td').nth(1)).toContainText(title);
    await expect(row.locator('td').nth(3)).toContainText('₡');
  },
  // PED-002: verificar que el carrito no acepta productos agotados desde el catálogo.
  'PED-002': async ({page}) => {
    await page.goto('/');
    const out=productCards(page).filter({has:page.getByText('Agotado',{exact:true})}).first();
    await expect(out,'PRECONDICIÓN QA: crear un producto ACTIVO de stock 0').toBeVisible();
    await expect(out.locator('button[type="submit"]')).toBeDisabled();
    await page.goto('/Pedido/Carrito');
    await expect(page.getByText(/tu carrito est[aá] vac[ií]o/i)).toBeVisible();
  },
  // PED-003: agregar un mismo producto dos veces no debe duplicar filas.
  'PED-003': async ({page}) => {
    const first=await addToSessionCart(page);
    await page.goto('/');
    const same=productCards(page).filter({has:page.locator(`input[name="productoId"][value="${first.id}"]`)}).first();
    await expect(same).toBeVisible();
    await same.locator('form[action*="AgregarAlCarrito"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Pedido\/Carrito(?:\?.*)?$/i);
    const rows=page.locator('table tbody tr').filter({has:page.locator(`form input[name="productoId"][value="${first.id}"]`)});
    await expect(rows,'El carrito debe conservar una sola fila por producto').toHaveCount(1);
    await expect(rows.first().locator('td').nth(2).locator('span.fw-semibold'))
      .toHaveText('2', {timeout:7000}); // precondición: el producto debe contar con stock >=2
  },
  // PED-005: el checkout no admite un carrito vacío; exige sesión autenticada.
  'PED-005': async ({page}) => {
    await loginAsAdmin(page);
    await page.goto('/Pedido/Checkout');
    await expect(page).toHaveURL(/\/Pedido\/Carrito/i);
    await expect(page.getByText(/carrito est[aá] vac[ií]o/i).first()).toBeVisible();
    await expect(page.locator('#formCheckout')).toHaveCount(0);
  },
  // PRO-002: intento de crear producto con campos vacíos; no hay información válida para insertar.
  'PRO-002': async ({page}) => {
    await admin(page,'/Producto/Crear');
    const form=page.locator('form[action*="/Producto/Crear"]');
    await expect(form).toBeVisible();
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Producto\/Crear/i);
    await expect(page.locator('[data-valmsg-for="Nombre"].field-validation-error, [data-valmsg-for="Precio"].field-validation-error, .validation-summary-errors').first())
      .toBeVisible();
  },
  // PRO-003: requiere instancia descartable, porque intenta guardar un producto con precio negativo.
  'PRO-003': async ({page}) => {
    isolatedWrites();
    await admin(page,'/Producto/Crear');
    const form=page.locator('form[action*="/Producto/Crear"]');
    const unique=`qa02_precio_neg_${Date.now()}`;
    await form.locator('input[name="Nombre"]').fill(unique);
    await form.locator('input[name="Precio"]').fill('-100');
    await form.locator('input[name="Stock"]').fill('1');
    const firstCategory=await form.locator('select[name="CategoriaId"] option[value]:not([value=""])').first().getAttribute('value');
    expect(firstCategory,'Requiere categoría activa en BD QA').toBeTruthy();
    await form.locator('select[name="CategoriaId"]').selectOption(firstCategory);
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Producto\/Crear/i);
    await expect(page.locator('[data-valmsg-for="Precio"].field-validation-error').first()).toBeVisible();
  },
  // CATE-003: crear categoría vacía debe presentar validación, sin crear registros.
  'CATE-003': async ({page}) => {
    await admin(page,'/Categoria');
    await page.locator('button[data-bs-target="#modalCrear"]').first().click();
    await expect(page.locator('#modalCrear')).toBeVisible();
    const form=page.locator('#formCrear');
    await expect(form.locator('input[name="Nombre"]')).toHaveValue('');
    await form.locator('button[type="submit"]').click();
    const browserInvalid=await form.locator('input[name="Nombre"]').evaluate(el=>!el.checkValidity()).catch(()=>false);
    const serverError=await page.locator('.alert-danger,.field-validation-error,.validation-summary-errors').count();
    expect(browserInvalid || serverError>0,
      'Debe rechazarse el intento de guardar categoría vacía').toBeTruthy();
    await expect(page.locator('#formCrear input[name="Nombre"]')).toHaveValue('');
  },
  // INV-006: filas de stock normal (stock actual > mínimo) sin alerta de stock bajo.
  'INV-006': async ({page}) => {
    await admin(page,'/Inventario');
    const rows=page.locator('table.table-hover tbody tr').filter({has:page.locator('td:not([colspan])')});
    const count=await rows.count();
    let found=false;
    for(let i=0;i<count;i++){
      const cells=rows.nth(i).locator('td');
      const actual=Number((await cells.nth(2).innerText()).replace(/[^\d-]/g,''));
      const minimum=Number((await cells.nth(3).innerText()).replace(/[^\d-]/g,''));
      if(Number.isFinite(actual)&&Number.isFinite(minimum)&&actual>minimum){
        await expect(cells.nth(4)).not.toContainText(/sin stock|stock bajo/i);
        found=true;break;
      }
    }
    expect(found,'PRECONDICIÓN: se requiere inventario QA con algún producto por encima del mínimo').toBeTruthy();
  },
  // PED-008: la base debe estar preparada explícitamente sin pedidos.
  'PED-008': async ({page}) => {
    if (process.env.QA_EXPECT_EMPTY_ADMIN_ORDERS !== 'true') throw new Error('PRECONDICIÓN: QA_EXPECT_EMPTY_ADMIN_ORDERS=true requiere BD sin pedidos.');
    await admin(page,'/Pedido');
    const rows=page.locator('table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(/sin pedidos|no hay pedidos|no se encontraron|no existen pedidos/i);
  },
  // CLI-004: el usuario cliente con pedidos de prueba consulta su propio historial.
  'CLI-004': async ({page}) => {
    await client(page);
    const r=await page.goto('/Pedido/MisPedidos');
    expect(r?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/Pedido\/MisPedidos/i);
    await expect(page.locator('table tbody tr').first(),'PRECONDICIÓN: cliente QA con pedidos').toBeVisible();
    await expect(page.locator('table thead')).toContainText(/n[uú]mero/i);
    await expect(page.locator('table tbody tr').first().getByRole('link',{name:/ver/i})).toBeVisible();
  },
  // CLI-005: cliente específicamente preparado SIN pedidos de prueba.
  'CLI-005': async ({page}) => {
    await client(page,'QA_EMPTY_CLIENT_EMAIL','QA_EMPTY_CLIENT_PASSWORD');
    const r=await page.goto('/Pedido/MisPedidos');
    expect(r?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/Pedido\/MisPedidos/i);
    await expect(page.getByText(/a[uú]n no tienes pedidos/i)).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
  },
  // PRO-012: usuario CLIENTE autenticado no puede administrar productos.
  'PRO-012': async ({page}) => {
    await client(page);
    const r=await page.goto('/Producto');
    const path=new URL(page.url()).pathname;
    const denied=/^\/Cuenta\/Login$/i.test(path)||/^\/Error\/Prohibido$/i.test(path)||[401,403].includes(r?.status());
    expect(denied,`SEGURIDAD: cliente alcanzó /Producto (path ${path}, HTTP ${r?.status()})`).toBeTruthy();
    await expect(page.locator('form[action*="/Producto/Crear"]')).toHaveCount(0);
  },
  // ENV-012: validación de nombre requerido, sin datos válidos para crear zona.
  'ENV-012': async ({page}) => {
    await admin(page,'/ZonasEntrega/Crear');
    const form=page.locator('form[action*="ZonasEntrega/Crear"]');
    await expect(form).toBeVisible();
    const name=form.locator('input[name="Nombre"]');
    await expect(name).toHaveValue('');
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/ZonasEntrega\/Crear/i);
    const browserInvalid=await name.evaluate(el=>!el.checkValidity());
    const serverInvalid=(await page.locator('[data-valmsg-for="Nombre"].field-validation-error,.validation-summary-errors').count())>0;
    expect(browserInvalid||serverInvalid,'Debe rechazar una zona sin nombre').toBeTruthy();
  },
  // ENV-001: checkout calcula visualmente el costo de una zona, sin confirmar el pedido.
  'ENV-001': async ({page}) => {
    await checkoutWithSessionCart(page);
    const zone=page.locator('label.zona-card').first();
    await expect(zone,'Requiere zona de entrega activa').toBeVisible();
    await zone.locator('input.zona-radio').check();
    const expected=await shippingCost(zone);
    expect(Number.isFinite(expected),'Costo de envío de QA debe ser numérico').toBeTruthy();
    await expect(zone.locator('input.zona-radio')).toBeChecked();
    const shown=(await page.locator('#lblCostoEnvio').innerText()).replace(/[^\d]/g,'');
    expect(Number(shown),'El costo de envío mostrado debe coincidir con zona seleccionada').toBe(Math.round(expected));
  },
  // ENV-003: recalcular costo de envío al cambiar de zona, sin finalizar el pedido.
  'ENV-003': async ({page}) => {
    await checkoutWithSessionCart(page);
    const zones=page.locator('label.zona-card');
    const n=await zones.count();
    expect(n,'QA requiere al menos dos zonas de entrega').toBeGreaterThanOrEqual(2);
    const first=zones.first(),second=zones.nth(1);
    const a=await shippingCost(first),b=await shippingCost(second);
    expect(a,'Costo inicial de envío').not.toBeNaN();
    expect(b,'Costo alterno de envío').not.toBeNaN();
    expect(a,'Para observar un recalculo, las zonas deben tener costos distintos').not.toBe(b);
    await first.locator('input.zona-radio').check();
    await second.locator('input.zona-radio').check();
    const shown=Number((await page.locator('#lblCostoEnvio').innerText()).replace(/[^\d]/g,''));
    expect(shown,'El costo visual debe corresponder a la segunda zona').toBe(Math.round(b));
  },
};
