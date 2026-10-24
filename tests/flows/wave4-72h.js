import { expect } from '@playwright/test';
import { login, loginAsAdmin, clientCredentials } from './helpers.js';

// Ola 4: borradores exploratorios, NO cobertura formalmente verificada.
// La automatizacion NO debe operar sobre produccion ni sobre una BD QA compartida.
// Estas validaciones fueron fundamentadas en controladores y vistas ASP.NET MVC.

function needed(info, ...keys) {
  const values={};
  for(const key of keys) {
    if(!process.env[key]) info.skip(true,`BLOQUEADO: falta el dato controlado ${key}. No usar secretos reales.`);
    values[key]=process.env[key];
  }
  return values;
}
function isolated(info,{payment=false}={}) {
  const origin=process.env.QA_BASE_URL;
  const approved=process.env.QA_ISOLATED_QA==='true' &&
    process.env.QA_ALLOW_MUTATIONS==='true' &&
    process.env.QA_RESETTABLE_DB==='YES' &&
    process.env.QA_ISOLATED_BASE_URL===origin &&
    origin?.startsWith('https://') &&
    !origin.includes('13.184.33.122');
  if(!approved) info.skip(true,'BLOQUEADO: operaciones que pueden persistir cambios requieren HTTPS en QA aislado, QA_ALLOW_MUTATIONS=true, QA_ISOLATED_QA=true, QA_RESETTABLE_DB=YES y QA_ISOLATED_BASE_URL idéntica a QA_BASE_URL; no se permite la IP pública compartida.');
  if(payment && (process.env.QA_SINPE_SANDBOX!=='true'||process.env.QA_NO_REAL_TRANSACTIONS!=='true'))
    info.skip(true,'BLOQUEADO: SINPE requiere sandbox y garantía de que no se harán transacciones reales.');
}
async function admin(page,info,url) {
  needed(info,'QA_ADMIN_EMAIL','QA_ADMIN_PASSWORD');
  await loginAsAdmin(page);
  const response=await page.goto(url);
  const path=new URL(page.url()).pathname;
  if(/\/Cuenta\/Login|\/Error\/Prohibido/i.test(path) || [401,403].includes(response?.status()))
    info.skip(true,`BLOQUEADO: la cuenta QA no tiene rol para abrir ${url}.`);
  expect(response?.status(),`HTTP ${url}`).toBeLessThan(400);
}
async function client(page,info) {
  const {QA_CLIENT_EMAIL,QA_CLIENT_PASSWORD}=needed(info,'QA_CLIENT_EMAIL','QA_CLIENT_PASSWORD');
  await login(page,QA_CLIENT_EMAIL,QA_CLIENT_PASSWORD);
  await expect(page).not.toHaveURL(/\/Cuenta\/Login(?:\?|$)/i);
}
function noServerError(res){expect(res?.status()).toBeLessThan(400);}
const cartCard=page=>page.locator('.card.h-100').filter({has:page.locator('form[action*="AgregarAlCarrito"] button:not([disabled])')}).first();
async function putProductInCart(page, requestedId=null){
  const res=await page.goto('/');noServerError(res);
  const card=requestedId ? page.locator('.card.h-100').filter({has:page.locator(`input[name="productoId"][value="${requestedId}"]`)}).first() : cartCard(page);
  await expect(card).toBeVisible();
  await expect(card.locator('button[type="submit"]')).toBeEnabled();
  const title=(await card.locator('h6 a').first().innerText()).trim();
  const id=await card.locator('input[name="productoId"]').inputValue();
  await card.locator('form[action*="AgregarAlCarrito"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/Pedido\/Carrito/i);
  await expect(page.locator('table tbody tr').filter({hasText:title}).first()).toBeVisible();
  return {title,id};
}
async function checkout(page,info,requestedId=null) {
  const prod=await putProductInCart(page,requestedId);
  await client(page,info);
  const r=await page.goto('/Pedido/Checkout');noServerError(r);
  await expect(page.locator('#formCheckout')).toBeVisible();
  return prod;
}
async function fillCheckout(page,method='Tarjeta') {
  const zones=page.locator('input[name="ZonaEntregaId"]');
  await expect(zones.first()).toBeVisible();
  await zones.first().check();
  await page.locator('textarea[name="DireccionEntrega"]').fill('Dirección interna QA – pedido de prueba, no entregar');
  await page.locator(`input[name="MetodoPago"][value="${method}"]`).check();
  const ref=page.locator('#panel'+(method==='SINPE'?'Sinpe':'Tarjeta')+' input[name="NumeroReferencia"]');
  if(await ref.count())await ref.fill(method==='SINPE'?process.env.QA_SINPE_TEST_RECEIPT||'QA_TEST':'PRUEBA QA');
}
async function deliveryForm(page,info){
  const {QA_DELIVERY_ORDER_ID}=needed(info,'QA_DELIVERY_ORDER_ID');
  await admin(page,info,`/ProgramacionEntrega/Programar?pedidoId=${encodeURIComponent(QA_DELIVERY_ORDER_ID)}`);
  await expect(page.locator('input[name="FechaEntrega"]')).toBeVisible();
  await expect(page.locator('input[name="PedidoId"]')).toHaveValue(QA_DELIVERY_ORDER_ID);
}
export const wave4Flows={
  'AUT-005':async({page,testInfo})=>{
    isolated(testInfo);
    const {QA_UNREGISTERED_EMAIL}=needed(testInfo,'QA_UNREGISTERED_EMAIL');
    await page.goto('/Cuenta/OlvideContrasena');
    await page.locator('input[name="Email"]').fill(QA_UNREGISTERED_EMAIL);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Cuenta\/ConfirmacionEnvio/i);
    await expect(page.getByText(/revisa tu correo/i)).toBeVisible();
    await expect(page.locator('a[href*="RestablecerContrasena"]')).toHaveCount(0);
    // La confirmación genérica evita enumerar cuentas. Verificar ausencia de correo en buzón QA es tarea adicional.
  },
  'PRO-006':async({page})=>{
    // Un producto inexistente debe responder 404 (no 200 ni error de servidor 500).
    const r=await page.goto('/Home/Detalle/2147483647');
    expect(r?.status(),'Un producto inexistente debe devolver HTTP 404').toBe(404);
    await expect(page.locator('body')).not.toContainText('Agregar al carrito');
  },
  'PRO-009':async({page,testInfo})=>{
    isolated(testInfo);await admin(page,testInfo,'/Producto');
    const edit=page.locator('button.btn-editar').first();await expect(edit).toBeVisible();
    await edit.click();await expect(page.locator('#modalEditar')).toBeVisible();
    const form=page.locator('#formEditar');await form.locator('input[name="Id"]').fill('2147483647');
    await form.locator('button[type="submit"]').count().then(async n=>{if(n)await form.locator('button[type="submit"]').click();else await page.locator('button[form="formEditar"]').click();});
    await expect(page.locator('.alert-danger').first()).toBeVisible();
    await expect(page.locator('table tbody tr').filter({hasText:/2147483647/})).toHaveCount(0);
  },
  'CATE-009':async({page,testInfo})=>{
    isolated(testInfo);await admin(page,testInfo,'/Categoria');
    const edit=page.locator('button.btn-editar').first();await expect(edit).toBeVisible();await edit.click();
    const form=page.locator('#formEditar');await expect(form).toBeVisible();
    await form.locator('input[name="Id"]').fill('2147483647');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.alert-danger').first()).toBeVisible();
  },
  'CATE-012':async({page,testInfo})=>{
    isolated(testInfo);const {QA_CATEGORY_WITH_PRODUCTS}=needed(testInfo,'QA_CATEGORY_WITH_PRODUCTS');
    await admin(page,testInfo,'/Categoria');
    const row=page.locator('table tbody tr').filter({hasText:QA_CATEGORY_WITH_PRODUCTS}).first();await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toContainText(/activa/i);
    page.once('dialog',d=>d.accept());
    await row.locator('button.btn-toggle').click();
    // Para proteger la BD, solo ejecutar tras confirmar la instancia aislada con productos asociados.
    await expect(page.locator('.alert-danger,.alert-warning').first()).toBeVisible();
    await expect(page.locator('table tbody tr').filter({hasText:QA_CATEGORY_WITH_PRODUCTS}).locator('td').nth(2)).toContainText(/activa/i);
  },
  'PED-006':async({page,testInfo})=>{
    isolated(testInfo);await checkout(page,testInfo);
    await fillCheckout(page,'Tarjeta');
    await page.locator('textarea[name="DireccionEntrega"]').fill('');
    await page.locator('#formCheckout button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Pedido\/Checkout/i);
    await expect(page.locator('[data-valmsg-for="DireccionEntrega"],.validation-summary-errors').first()).toContainText(/direcci[oó]n|obligatoria/i);
  },
  'PED-011':async({page,testInfo})=>{
    isolated(testInfo);const {QA_ORDER_INVALID_CHANGE_ID}=needed(testInfo,'QA_ORDER_INVALID_CHANGE_ID');
    await admin(page,testInfo,'/Pedido');
    const btn=page.locator(`button[data-pedido-id="${QA_ORDER_INVALID_CHANGE_ID}"]`).first();await expect(btn).toBeVisible();
    const old=await btn.getAttribute('data-estado-actual');await btn.click();
    const form=page.locator('#formEstado');
    await form.locator('select[name="estado"]').evaluate(el=>{el.add(new Option('ESTADO INVÁLIDO','9999',true,true));el.value='9999';});
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.alert-danger')).toBeVisible();
    await expect(page.locator(`button[data-pedido-id="${QA_ORDER_INVALID_CHANGE_ID}"]`)).toHaveAttribute('data-estado-actual',old);
  },
  'CLI-002':async({page,testInfo})=>{
    isolated(testInfo);const {QA_DUPLICATE_CLIENT_EMAIL,QA_DUPLICATE_CLIENT_PASSWORD}=needed(testInfo,'QA_DUPLICATE_CLIENT_EMAIL','QA_DUPLICATE_CLIENT_PASSWORD');
    await page.goto('/Cuenta/Registro');
    const form=page.locator('form[action*="Registro"]');
    await form.locator('input[name="Nombre"]').fill('Cliente duplicado QA02');
    await form.locator('input[name="Email"]').fill(QA_DUPLICATE_CLIENT_EMAIL);
    await form.locator('input[name="Contrasena"]').fill(QA_DUPLICATE_CLIENT_PASSWORD);
    await form.locator('input[name="ConfirmarContrasena"]').fill(QA_DUPLICATE_CLIENT_PASSWORD);
    await form.locator('input[name="Telefono"]').fill('88888888');
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/Cuenta\/Registro/i);
    await expect(page.locator('.validation-summary-errors,.alert-danger').first()).toContainText(/correo|registrad|existe|email/i);
  },
  'ENV-002':async({page,testInfo})=>{
    isolated(testInfo);const {QA_DISABLED_ZONE_NAME}=needed(testInfo,'QA_DISABLED_ZONE_NAME');
    await checkout(page,testInfo);
    await expect(page.locator('label.zona-card').filter({hasText:QA_DISABLED_ZONE_NAME})).toHaveCount(0);
  },
  'ENV-006':async({page,testInfo})=>{
    await deliveryForm(page,testInfo);const resp=await page.request.get('/ProgramacionEntrega/HorariosDisponibles?fecha=2000-01-01');
    noServerError(resp);const data=await resp.json();
    expect(data.error,'Fecha fuera de rango debe rechazarse').toBeTruthy();
    // Solo GET: no crea ni modifica programación.
  },
};
