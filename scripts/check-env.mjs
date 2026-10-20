#!/usr/bin/env node
// Preflight de conectividad sin enviar credenciales ni modificar datos.
import process from 'node:process';

const address = process.env.QA_BASE_URL?.trim();
function error(message) {
  console.error(`QA PRECHECK ERROR: ${message}`);
  process.exitCode = 1;
}

if (!address) {
  error('Falta el secreto QA_BASE_URL en GitHub Settings → Secrets and variables → Actions.');
} else {
  let parsed;
  try { parsed = new URL(address); } catch { error('QA_BASE_URL debe ser una URL absoluta válida.'); }
  if (parsed) {
    const host = parsed.hostname.toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(host);
    if (!['http:', 'https:'].includes(parsed.protocol)) error('Solo se acepta HTTP(S).');
    else if (isLoopback) error('localhost no es accesible desde un runner alojado en GitHub.');
    else if (parsed.username || parsed.password) error('No incluyas usuario o contraseña dentro de QA_BASE_URL.');
    else if (parsed.search || parsed.hash) error('QA_BASE_URL no debe incluir query strings ni #fragmentos.');
    else if (parsed.pathname !== '/' && parsed.pathname !== '') {
      error('QA_BASE_URL debe apuntar a la raíz del sitio. Las rutas de estos tests empiezan por /.');
    }
    else if (parsed.protocol !== 'https:' && process.env.QA_ALLOW_HTTP !== 'true') {
      error('Usa HTTPS para el QA público. Solo en un entorno controlado establece QA_ALLOW_HTTP=true.');
    } else {
      console.log(`Comprobando acceso HTTPS/HTTP a host QA: ${host} (sin credenciales).`);
      let response;
      try {
        response = await fetch(parsed.origin, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) });
        // Algunos servidores no admiten HEAD o lo filtran; GET es suficiente para comprobar disponibilidad.
        if (response.status >= 400) {
          await response.body?.cancel();
          response = await fetch(parsed.origin, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
        }
        console.log(`Estado HTTP de QA: ${response.status}`);
        if (response.status >= 200 && response.status < 400) {
          console.log('OK: el runner alcanzó la aplicación. Una redirección puede exigir autenticación posterior.');
        } else if (response.status === 401 || response.status === 403) {
          error('La URL responde, pero rechaza acceso anónimo (401/403). Revisa firewall, SSO o allowlist del runner.');
        } else if (response.status === 404) {
          error('La URL responde 404; verifica el dominio y la ruta raíz del sitio.');
        } else {
          error(`La URL devolvió HTTP ${response.status}; revisa salud de la aplicación y permisos.`);
        }
      } catch (e) {
        error(`No hay conectividad al sitio QA: ${e.message}. Verifica DNS, SSL/TLS, firewall e IP del runner.`);
      } finally {
        await response?.body?.cancel().catch(() => {});
      }
    }
  }
}
