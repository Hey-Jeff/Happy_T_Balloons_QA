import { expect } from '@playwright/test';
import { login, loginAsAdmin, adminCredentials, searchCatalog } from './helpers.js';

// BORRADORES: cada flujo debe ejecutarse contra la UI real y ajustar selectores
// y aserciones antes de cambiar su estado a 'ready_verified_against_app'.
export const flows={
 'AUT-001':async({page})=>{
   const {email,password}=adminCredentials();
   await login(page,email,password);
   await expect(page).not.toHaveURL(/\/Cuenta\/Login(?:\?|$)/i);
   // El enlace dentro del dropdown puede estar oculto: comprobar la pagina protegida.
   const dashboard = await page.goto('/Admin');
   expect(dashboard?.status(), 'El panel administrativo debe responder HTTP 200').toBe(200);
   await expect(page).toHaveURL(/\/Admin(?:\/Index)?(?:\?.*)?$/i);
   await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
 },
 'AUT-002':async({page})=>{
   const {email}=adminCredentials();
   const wrong=process.env.QA_INVALID_PASSWORD;
   if(!wrong) throw new Error('Configura QA_INVALID_PASSWORD: evita el bloqueo por reintentos.');
   // EXACTAMENTE UN intento: no repetir esta prueba automáticamente con retries.
   await login(page,email,wrong);
   await expect(page).toHaveURL(/\/Cuenta\/Login/i);
   await expect(page.getByText(/credenciales|incorrect|inv[aá]lid|contrase[nñ]a|intento/i).first()).toBeVisible();
 },
 'CAT-001':async({page})=>{
   await page.goto('/');
   for (const name of ['Sad Boyz Tour','Cremas Dove','Cremas Faciales','Galletas Oreo']){
      await expect(page.getByText(name,{exact:false}).first(),`Producto activo visible: ${name}`).toBeVisible();
   }
 },
 'CAT-002':async({page})=>{
   await page.goto('/Home/Detalle/4');
   await expect(page.getByText('Cremas Dove',{exact:false}).first()).toBeVisible();
   // Verificar contenido del detalle, no solo HTTP 200.
   await expect(page.locator('h1,h2,h3').first()).toBeVisible();
 },
 'CAT-004':async({page})=>{
   await page.goto('/');
   await searchCatalog(page,'Crema');
   await expect(page.getByText('Cremas Dove',{exact:false}).first()).toBeVisible();
   await expect(page.getByText('Cremas Faciales',{exact:false}).first()).toBeVisible();
 },
 'CAT-006':async({page})=>{
   await page.goto('/');
   await searchCatalog(page,'xyzqa123');
   await expect(page.getByText(/no se encontr|sin resultados|no hay productos|ning[uú]n producto/i).first()).toBeVisible();
 },
 
'PRO-004': async ({ page }) => {
  await loginAsAdmin(page);

  console.log(
    'Ruta después del login:',
    new URL(page.url()).pathname
  );

  const response = await page.goto('/Producto');

  console.log(
    'Ruta después de abrir productos:',
    new URL(page.url()).pathname
  );

  console.log(
    'Código HTTP:',
    response?.status()
  );

  await expect(page).toHaveURL(
    /\/Producto(?:\/Index)?(?:\?.*)?$/i
  );

  await expect(page.locator('table').first()).toBeVisible();

  await expect(
    page.getByText('Cremas Dove', { exact: false }).first()
  ).toBeVisible();
},
 'CLI-006':async({page})=>{
   await page.goto('/Pedido/MisPedidos');
   const isLogin=/\/Cuenta\/Login/i.test(page.url());
   const isDenied=(await page.getByText(/acceso denegado|no autorizado|iniciar sesi[oó]n/i).count())>0;
   expect(isLogin||isDenied,'Debe impedir acceso anónimo al historial de pedidos').toBeTruthy();
   await expect(page.locator('table:has-text("Pedidos"),[data-testid="orders-private"]')).toHaveCount(0);
 },
 'REP-001':async({page})=>{
   await loginAsAdmin(page);
   await page.goto('/Reportes/Ventas');
   await expect(page.getByText(/ventas/i).first()).toBeVisible();
   await expect(page.locator('table,canvas,[role="table"],.card').first()).toBeVisible();
 },
 'REP-005':async({page})=>{
   await loginAsAdmin(page);
   await page.goto('/Reportes/Inventario');
   await expect(page.getByText(/inventario/i).first()).toBeVisible();
   await expect(page.locator('table,[role="table"]').first()).toBeVisible();
 }
};
