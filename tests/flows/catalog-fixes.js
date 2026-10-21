import { expect } from '@playwright/test';

// Correcciones D1: usar datos que YA existen en la interfaz de QA.
// No se silencian fallos HTTP ni se modifica informacion del servidor.
async function openCatalog(page) {
  const response = await page.goto('/');
  expect(response?.status(), 'El catalogo debe responder sin errores HTTP').toBeLessThan(400);
  await expect(page.getByRole('heading', { name: /Happy Times Balloons/i })).toBeVisible();
  const cards = page.locator('.card.h-100').filter({
    has: page.locator('h6 a[href*="/Home/Detalle"]'),
  });
  await expect(cards.first(), 'QA necesita por lo menos un producto visible').toBeVisible();
  return cards;
}

async function currentProduct(page) {
  const cards = await openCatalog(page);
  const link = cards.first().locator('h6 a[href*="/Home/Detalle"]').first();
  const title = (await link.innerText()).trim();
  const href = await link.getAttribute('href');
  expect(title, 'El producto debe tener nombre').not.toBe('');
  expect(href, 'El producto debe enlazar a su detalle').toMatch(/^\/Home\/Detalle\/\d+(?:\?.*)?$/i);
  return { cards, title, href };
}

async function assertProductDetail(page, title, href, caseId) {
  const response = await page.goto(href);
  expect(
    response?.status(),
    `${caseId}: DEFECTO DEL SITIO QA: el detalle ${href} devuelve HTTP ${response?.status()}`,
  ).toBeLessThan(400);
  await expect(page).toHaveURL(/\/Home\/Detalle\/\d+(?:\?.*)?$/i);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('₡');
}

export const catalogFixFlows = {
  // CAT-001: verificar productos visibles con nombre, enlace y precio,
  // no depender de nombres de una base de datos anterior.
  'CAT-001': async ({ page }) => {
    const cards = await openCatalog(page);
    const count = await cards.count();
    expect(count, 'El catalogo debe mostrar productos activos').toBeGreaterThan(0);
    for (const card of await cards.all()) {
      const link = card.locator('h6 a[href*="/Home/Detalle"]').first();
      await expect(link).toBeVisible();
      expect((await link.innerText()).trim()).not.toBe('');
      expect(await link.getAttribute('href')).toMatch(/^\/Home\/Detalle\/\d+/i);
      await expect(card).toContainText('₡');
    }
  },

  // CAT-002: tomar el enlace del catalogo para evitar IDs obsoletos.
  // Si el backend devuelve 500, FALLA con diagnostico preciso.
  'CAT-002': async ({ page }) => {
    const { title, href } = await currentProduct(page);
    await assertProductDetail(page, title, href, 'CAT-002');
  },

  // CAT-004: buscar un producto existente, y confirmar resultados reales.
  'CAT-004': async ({ page }) => {
    const { title } = await currentProduct(page);
    await page.locator('input[name="busqueda"]').fill(title);
    await page.getByRole('button', { name: /filtrar/i }).click();
    const filter = new URL(page.url()).searchParams.get('busqueda');
    expect(filter, 'El filtro debe reflejar el texto buscado').toBe(title);
    const resultLinks = page.locator('.card.h-100 h6 a[href*="/Home/Detalle"]');
    await expect(resultLinks.first(), 'La busqueda debe encontrar el producto existente').toBeVisible();
    for (const link of await resultLinks.all()) {
      expect((await link.innerText()).toLowerCase()).toContain(title.toLowerCase());
    }
  },

  // CAT-008: enlace publico debe abrir un detalle valido; el HTTP 500 es fallo real.
  'CAT-008': async ({ page }) => {
    const { title, href } = await currentProduct(page);
    await assertProductDetail(page, title, href, 'CAT-008');
  },
};
