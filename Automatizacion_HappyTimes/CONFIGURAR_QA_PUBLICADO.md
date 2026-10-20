# GitHub Actions contra Happy Times Balloons publicado — QA02

## 1. Repositorio

Crea un repositorio **privado** o usa uno al que los testers tengan acceso autorizado. Sube **el contenido** de `QA02_Automatizacion_HappyTimes/` a la raíz del repositorio, no solamente el ZIP. El workflow debe verse en `.github/workflows/qa02-manual.yml` en la rama por defecto (`main`).

## 2. Variables sensibles

En el repositorio: **Settings → Secrets and variables → Actions → Repository secrets → New repository secret**.

| Secret | Contenido | Necesario para |
|---|---|---|
| `QA_BASE_URL` | URL raíz de QA publicado, ej. `https://qa.tu-dominio.example` | Conectividad y E2E |
| `QA_ADMIN_EMAIL` | Cuenta exclusiva de administrador de QA | Pruebas AUT, PRO, REP |
| `QA_ADMIN_PASSWORD` | Contraseña de la cuenta QA | Pruebas con sesión |
| `QA_INVALID_PASSWORD` | Contraseña incorrecta ficticia | AUT-002 |
| `QA_CLIENT_EMAIL` | Cuenta exclusiva de cliente QA (cuando haya pruebas implementadas) | Casos con cliente |
| `QA_CLIENT_PASSWORD` | Contraseña de cliente QA | Casos con cliente |

Nunca guardar contraseñas en `cases.json`, `.env.example`, logs ni capturas públicas. Usa **datos sintéticos**. Restringe acceso a reportes/trazas del repositorio; podrían contener información de las sesiones QA.

Los casos de Playwright actuales usan rutas de raíz tales como `/Cuenta/Login` y `/Producto`. La URL de QA debe ser el origen del sitio (no `/qa/`), y las rutas/selectores deberán confirmarse en la aplicación publicada.

## 3. Ejecutar desde la web de GitHub

1. Abre el repositorio → pestaña **Actions**.
2. Selecciona **QA02 Happy Times Balloons - ejecución manual**.
3. Pulsa **Run workflow** y escoge uno de los siguientes valores `modo`:
   - `validar`: verifica manifiesto y pruebas unitarias; no necesita URL.
   - `conexion`: comprueba DNS, TLS, firewall y respuesta HTTP de la web QA; no usa navegador ni credenciales.
   - `borradores`: intenta los 10 flujos Playwright **sin verificar**.
   - `modulo`: ejecuta borradores del módulo elegido y deja pendientes/NA sin ejecutar.
   - `caso`: ejecuta un ID como `CAT-001`; requiere que tenga un flujo desarrollado.
4. Espera a que termine el run. En **Summary** verás la cobertura y resultados. En **Artifacts** estará el reporte `qa02-evidencias-...` cuando haya archivos.

**Primer intento sugerido:** `validar` → `conexion` → `caso / CAT-001`. Corrige la conexión y compara la UI real antes de probar inicios de sesión. No uses cuentas reales, inventarios/productos reales ni pagos en vivo.

## 4. Cómo interpretar la ejecución

- **0 casos verificados** al generar este paquete.
- **10 flujos** son borradores que podrían requerir cambiar rutas/selectores o datos del sitio.
- Los **105 casos** están inventariados, pero **NO se han automatizado completamente**.
- Un workflow verde en modo `validar` o `conexion` NO significa que pasaron las pruebas funcionales.
- Algunos tests hacen login inválido: usan un solo intento por ejecución, pero repetir manualmente muchos runs sí podría bloquear la cuenta.
- Los casos que alteran base de datos, mandan correos o realizan pagos necesitan un entorno QA aislado y servicios sandbox. Este workflow deja `QA_ALLOW_MUTATIONS=false`.

## 5. Problemas frecuentes

- **No aparece Run workflow:** asegúrate de que `.github/workflows/qa02-manual.yml` está en la rama por defecto y que tienes permisos de escritura.
- **QA_BASE_URL missing:** agrega el Repository Secret con el nombre exacto.
- **404:** dominio incorrecto, app publicada bajo subruta, o sitio sin ruta `/`.
- **401/403:** WAF/CDN/SSO o restricción por IP. Revisa acceso a la web desde runners GitHub.
- **SSL error:** verifica el certificado y dominio HTTPS; no desactives validaciones SSL para esquivar el problema.
- **Prueba fallida aun con web accesible:** revisa selectores, textos, rutas, autenticación y datos semilla. Un login exitoso no valida automáticamente toda la historia de usuario.
- **Todos skipped:** significa que aún no se han implementado, no que estén pasando.

## 6. Integración opcional de GitHub CLI

Con GitHub CLI autenticado, una vez subido el workflow:

```bash
gh workflow run qa02-manual.yml -f modo=conexion
gh workflow run qa02-manual.yml -f modo=caso -f case_id=CAT-001
gh workflow run qa02-manual.yml -f modo=modulo -f modulo=CAT
```

Consulta documentación oficial: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow y https://playwright.dev/docs/ci
