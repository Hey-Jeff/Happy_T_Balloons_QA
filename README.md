> **Configuración específica para http://13.184.33.122:** abre [CONECTAR_IP_13_184_33_122.md](CONECTAR_IP_13_184_33_122.md). Solo ejecutar flujos anónimos mientras el sitio esté en HTTP.

# QA02 — Automatización Happy Times Balloons

**Proyecto Playwright independiente de Claude Code.** Basado en `QA02-Casos_de_Prueba_Happy_Times_Balloons_1.xlsx` (hoja `Sheet1`, filas 8–112).

> **Alcance vigente (06/11/2026): 58 de los 105 casos del Excel.** Los 58 tienen flujo Playwright; en el workflow **QA02 TODOS - 58 casos** (archivo `qa02-todos-105.yml`) 56 se ejecutan contra `http://13.184.33.122` y terminan en PASS o FAIL, y `AUT-002` y `CATE-012` quedan BLOCKED con su motivo. **Esto no es cobertura del 100 % de la matriz original:** 47 casos se retiraron del repositorio (correo/2FA, escrituras en BD compartida, SINPE, N/A, sin datos). Inventario, motivos, último resultado verificado y defectos: [docs/QA02_AUDITORIA_Y_CORRECCIONES.md](docs/QA02_AUDITORIA_Y_CORRECCIONES.md).

## Requisitos

- Node.js 22+ y npm (Playwright según documentación oficial).
- Aplicación Happy Times Balloons ejecutándose en un entorno de pruebas. La nota histórica de QA02 menciona `http://localhost:56233/`; puede estar apagada y su puerto puede cambiar.
- Credenciales **de QA** y datos de prueba. Nunca ejecutar contra producción.

## Instalación (Windows PowerShell / macOS / Linux)

```bash
npm install
npx playwright install chromium
```

Copia `.env.example` a `.env` e ingresa valores de un entorno QA. `QA_ADMIN_EMAIL`/`QA_ADMIN_PASSWORD` y `QA_CLIENT_EMAIL`/`QA_CLIENT_PASSWORD` son necesarios para los casos con sesión. `QA_INVALID_PASSWORD` solo se usa en QA aislado (AUT-002 está BLOCKED en la instancia compartida).

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Para testers de Windows que prefieren un menú, hacer doble clic en `Ejecutar_Pruebas_Windows.bat` (requiere Node.js). Incluye instalación y opciones por caso. La lista editable también está en `qa/matriz_automatizacion.csv`.

## Comandos principales

| Comando | Qué hace |
|---|---|
| `npm run qa:validate` | Comprueba IDs, campos y estructura de 58 escenarios |
| `npm run qa:list` | Lista los 58 casos y su estado real |
| `npm run qa:list -- PED` | Lista casos de Pedidos |
| `npm run qa:coverage` | Muestra cobertura real, no el historial del Excel |
| `npm run test:case -- AUT-001 --try-drafts` | **Prueba** un borrador contra la instancia QA |
| `npm run test:module -- CAT --try-drafts --allow-pending` | Prueba los borradores del módulo CAT |
| `npm run test:public` | Ejecuta los 17 casos anónimos (sin credenciales) en un solo lote |
| `node scripts/qa02-all-105.mjs --plan` | Muestra el plan de los 58 casos (56 en cola, 2 BLOCKED) sin abrir navegador |
| `npm run test:all -- --try-drafts --allow-pending` | Ejecuta los borradores seleccionados (en HTTP compartido solo los anónimos) |
| `npm run test:all` | **Exige suite verificada**: falla mientras queden pruebas no implementadas |
| `npm run report` | Abre reporte visual Playwright tras una ejecución |
| `npm run unit` | Comprueba integridad de los datos sin acceso a la app |

El **exit code de `test:all` es de error** cuando hay casos pendientes: se evita presentar una parte del total como si fuese un resultado completo. `--allow-pending` permite ejecutar un subconjunto durante el desarrollo, **sin contabilizar SKIP como PASS**.

## Cómo implementar un caso pendiente

1. Busca el identificador en `qa/cases.json` y revisa *preconditions*, *test_data*, *steps*, *expected* y notas.
2. Confirma que la funcionalidad existe y define datos iniciales/reestablecimiento de BD.
3. Agrega el flujo a `tests/flows/qa02-datos-ui.js` (o a un archivo registrado en `tests/flows/registry.js`, donde **el último archivo que define un ID gana**), su identificador a `implemented` en `scripts/qa-core.mjs` y, si no viene de `qa02-datos-ui.js`, a `NOT_FROM_DATOS_UI` en `scripts/flow-registry.test.mjs`.
4. Cambia `automation_status` en `qa/cases.json` a `draft_requires_ui_verification`.
5. Ajusta selectores por roles, labels y `data-testid` contra el DOM real; evita `waitForTimeout`.
6. Ejecuta `npm run test:case -- ID --try-drafts` en ambiente QA, valida evidencia y aserciones. Si es seguro y reproducible, cambia `automation_status` a `ready_verified_against_app`.
7. Agrega limpieza/reset de estado cuando la prueba cree pedidos, modifique inventario o altere categorías. Registra evidencia y evita dependencias de otras pruebas.

**No basta con que el script abra una página.** Debe comprobar el estado final esperado, preferiblemente mediante UI más API/base de datos o servicios sandbox cuando corresponda.

## Historial QA02 vs ejecución nueva

El Excel incluye una columna llamada `Tipo de Ejecución` con el valor `Automated` en todas las filas, y un resultado de validación previa (05/10/2026) con 41 `Passed`, 3 `Failed`, 8 `Blocked` y 53 `Untested` sobre las 105 filas; para los 58 casos vigentes: 26 `Passed`, 3 `Failed`, 29 `Untested` (`qa/summary.json`). **Esos valores se guardan como `baseline_result_2026_10_05`, NO son resultados obtenidos por estos scripts.** Ninguno puede asumirse como PASS actual.

## Errores conocidos y alcances

- `CAT-002`, `PRO-006`, `CATE-012`: quedaron marcados `Failed` en el Excel; mantenerlos como defectos a reproducir, no corregir el *expected* para hacerlos pasar.
- Se eliminaron del repositorio (siguen en el Excel) los casos que escriben datos en el servidor compartido, los pagos SINPE (`PAG-001` a `PAG-004`), los 8 N/A, `ENV-011` y los casos sin datos disponibles en la UI (`CAT-009`, `CATE-006`).
- Los casos de correo y 2FA (`AUT-004`, `AUT-006`, `AUT-007`, `AUT-011` a `AUT-013`) se excluyeron del repositorio porque requieren buzón de email.
- No usar cuentas reales para `AUT-003` (bloqueo) ni webhook de pagos real. Necesitan entorno QA aislado y pruebas de restablecimiento.

## Reporte y GitHub Actions

Cuando se ejecutan pruebas reales, Playwright produce `playwright-report/`, `qa/results/playwright.json` y `test-results/` (capturas/video/trazas de fallos). `.gitignore` evita subirlos accidentalmente.

Incluido `.github/workflows/qa02-manual.yml`: ejecución manual por tester autorizado. Debes configurar `secrets.QA_BASE_URL` **públicamente accesible desde GitHub o mediante runner dentro de tu red** (GitHub-hosted runner NO puede acceder a `localhost` de tu PC), además de secretos de QA. El workflow está pensado para borradores, no representa suite completa.

**Reporte HTML del workflow QA02 TODOS:** al terminar cada ejecución (aunque haya FAIL), el workflow une los resultados de todos los casos en un solo reporte de Playwright y lo publica como artifact `qa02-reporte-playwright-<número>` durante 14 días. Para verlo: abre el run en Actions, descarga el artifact en la sección **Artifacts**, descomprímelo y abre `index.html` (o ejecuta `npx playwright show-report <carpeta>`). Antes de publicarlo, `scripts/scan-report-secrets.mjs` comprueba que no contenga contraseñas ni tokens; si encuentra alguno, el reporte no se sube. El repositorio es público, así que cualquier usuario de GitHub puede descargar el artifact. Solo los casos anónimos guardan capturas, videos, trazas y el snapshot de página (`error-context`) cuando fallan; en los casos con sesión el runner define `PLAYWRIGHT_NO_COPY_PROMPT=1` para que no se adjunte el contenido de pantallas administrativas (clientes, pedidos, bitácora). El resumen de Actions incluye la primera línea del error de cada FAIL.

Todos los comandos funcionan sin Claude Code.

Consulta `docs/IMPLEMENTACION.md` para completar cobertura de los 58 casos.

Fuentes: https://playwright.dev/docs/intro · https://playwright.dev/docs/test-assertions · https://playwright.dev/docs/trace-viewer-intro · https://docs.github.com/en/actions

## Ejecución desde GitHub Actions (para testers sin Claude Code)

**Para la versión QA publicada**, comienza por [`CONFIGURAR_QA_PUBLICADO.md`](CONFIGURAR_QA_PUBLICADO.md). También está la guía general [`GITHUB_ACTIONS_PASO_A_PASO.md`](GITHUB_ACTIONS_PASO_A_PASO.md).

En **Actions → QA02 Happy Times Balloons - ejecución manual → Run workflow**, selecciona `validar`, `conexion`, `borradores`, `modulo` o `caso`.

Comienza por `validar`, que funciona sin URL ni credenciales, después por `conexion`, que verifica acceso a la web publicada sin iniciar sesión. Para ejecutar pruebas de navegador, configura secretos de QA/staging en el repositorio y asegúrate de que GitHub pueda acceder a la aplicación. Para la ejecución integral usa **Actions → QA02 TODOS - 58 casos en una ejecución → Run workflow** (`shared-http`). Los 58 flujos siguen en estado `draft_requires_ui_verification`: un PASS es exploratorio hasta que el equipo valide los criterios y cambie el estado a `ready_verified_against_app`.
