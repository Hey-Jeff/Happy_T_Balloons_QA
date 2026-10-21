import { expect } from '@playwright/test';

function requiredEnv(name){
  const value=process.env[name];
  if(!value) throw new Error(`Falta ${name} en .env. Usa cuenta de QA y no guardes credenciales en Git.`);
  return value;
}

export function adminCredentials(){
 return {email:requiredEnv('QA_ADMIN_EMAIL'),password:requiredEnv('QA_ADMIN_PASSWORD')};
}
export function clientCredentials(){
 return {email:requiredEnv('QA_CLIENT_EMAIL'),password:requiredEnv('QA_CLIENT_PASSWORD')};
}
export async function login(page, email, password){
 await page.goto('/Cuenta/Login');
 const current=new URL(page.url());

const httpAuthAllowed =
  current.origin === 'http://13.184.33.122' &&
  process.env.QA_BASE_URL === 'http://13.184.33.122' &&
  process.env.QA_ALLOW_HTTP === 'true' &&
  process.env.QA_ALLOW_HTTP_AUTH === 'true';

if (current.protocol !== 'https:' && !httpAuthAllowed) {
  throw new Error('Inicio de sesión HTTP no autorizado.');
}

const emailInput=page.locator('input[type="email"],input[name="Correo"],input[name="Email"],input[id="Correo"],input[id="Email"]').first();
 const passInput=page.locator('input[type="password"]').first();
 await expect(emailInput).toBeVisible();
 await expect(passInput).toBeVisible();
 await emailInput.fill(email);
 await passInput.fill(password);
 const submit=page.getByRole('button',{name:/iniciar sesi[oó]n|entrar|acceder/i});
 if(await submit.count()) await submit.first().click();
 else await page.locator('form button[type="submit"], form input[type="submit"]').first().click();
}
export async function loginAsAdmin(page){
 const {email,password}=adminCredentials();
 await login(page,email,password);
 await expect(page).not.toHaveURL(/\/Cuenta\/Login(?:\?|$)/i);
}
export function searchInput(page){
  return page.locator('input[type="search"],input[placeholder*="busc" i],input[name*="buscar" i],input[id*="buscar" i]').first();
}
export async function searchCatalog(page, term){
 const input=searchInput(page);
 await expect(input).toBeVisible();
 await input.fill(term);
 await input.press('Enter');
}
