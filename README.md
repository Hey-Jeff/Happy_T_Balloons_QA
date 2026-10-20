> **Configuración específica para http://13.184.33.122:** abre [CONECTAR_IP_13_184_33_122.md](CONECTAR_IP_13_184_33_122.md). Solo ejecutar flujos anónimos mientras el sitio esté en HTTP.

# QA02 — Automatización Happy Times Balloons

**Proyecto Playwright independiente de Claude Code.** Basado en `QA02-Casos_de_Prueba_Happy_Times_Balloons_1.xlsx` (hoja `Sheet1`, filas 8–112).

> **Estado honesto de entrega**: 105 casos importados; 10 flujos Playwright creados como **borradores no verificados**; **0 flujos verificados** contra la versión actual; 87 pendientes de implementación; 8 marcados no aplicables en el Excel. **Esto todavía NO es una suite completamente automatizada.** Para terminar se requiere el código o URL funcional de la aplicación y una BD/instancia QA controlada.

## Requisitos

- Node.js 22+ y npm (Playwright según documentación oficial).
- Aplicación Happy Times Balloons ejecutándose en un entorno de pruebas. La nota histórica de QA02 menciona `http://localhost:56233/`; puede estar apagada y su puerto puede cambiar.
- Credenciales **de QA** y datos de prueba. Nunca ejecutar contra producción.

## Instalación (Windows PowerShell / macOS / Linux)

```bash
npm install
npx playwright install chromium
```

Copia `.env.example` a `.env` e ingresa valores de un entorno QA. `QA_ADMIN_PASSWORD`, `QA_INVALID_PASSWORD` no deben quedar vacíos para probar inicio de sesión.

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
| `npm run qa:validate` | Comprueba IDs, campos y estructura de 105 escenarios |
| `npm run qa:list` | Lista los 105 casos y su estado real |
| `npm run qa:list -- PED` | Lista casos de Pedidos |
| `npm run qa:coverage` | Muestra cobertura real, no el historial del Excel |
| `npm run test:case -- AUT-001 --try-drafts` | **Prueba** un borrador contra la instancia QA |
| `npm run test:module -- CAT --try-drafts --allow-pending` | Prueba los borradores del módulo CAT |
| `npm run test:all -- --try-drafts --allow-pending` | Prueba los 10 borradores disponibles y reporta faltantes |
| `npm run test:all` | **Exige suite verificada**: falla mientras queden pruebas no implementadas |
| `npm run report` | Abre reporte visual Playwright tras una ejecución |
| `npm run unit` | Comprueba integridad de los datos sin acceso a la app |

El **exit code de `test:all` es de error** cuando hay casos pendientes: se evita presentar 10/105 como si fuese un resultado completo. `--allow-pending` permite ejecutar un subconjunto durante el desarrollo, **sin contabilizar SKIP como PASS**.

## Cómo implementar un caso pendiente

1. Busca el identificador en `qa/cases.json` y revisa *preconditions*, *test_data*, *steps*, *expected* y notas.
2. Confirma que la funcionalidad existe y define datos iniciales/reestablecimiento de BD.
3. Agrega el flujo a `tests/flows/index.js` y su identificador a `implemented` en `scripts/qa-core.mjs`.
4. Cambia `automation_status` en `qa/cases.json` a `draft_requires_ui_verification`.
5. Ajusta selectores por roles, labels y `data-testid` contra el DOM real; evita `waitForTimeout`.
6. Ejecuta `npm run test:case -- ID --try-drafts` en ambiente QA, valida evidencia y aserciones. Si es seguro y reproducible, cambia `automation_status` a `ready_verified_against_app`.
7. Agrega limpieza/reset de estado cuando la prueba cree pedidos, modifique inventario o altere categorías. Registra evidencia y evita dependencias de otras pruebas.

**No basta con que el script abra una página.** Debe comprobar el estado final esperado, preferiblemente mediante UI más API/base de datos o servicios sandbox cuando corresponda.

## Historial QA02 vs ejecución nueva

El Excel incluye una columna llamada `Tipo de Ejecución` con el valor `Automated` en todas las filas, y un resultado de validación previa con 41 `Passed`, 3 `Failed`, 8 `Blocked` y 53 `Untested`. **Esos valores se guardan como `baseline_result_2026_10_05`, NO son resultados obtenidos por estos scripts.** Ninguno puede asumirse como PASS actual.

## Errores conocidos y alcances

- `CAT-002`, `PRO-006`, `CATE-012`: quedaron marcados `Failed` en el Excel; mantenerlos como defectos a reproducir, no corregir el *expected* para hacerlos pasar.
- 8 casos estaban `Blocked` por funcionalidades no disponibles/no aplicables en la versión evaluada; se conservan como `excluded_not_applicable`, con las notas de validación originales.
- `AUT-004` y posteriores necesitan buzón de email de prueba; `PAG-001` a `PAG-004` necesitan webhook SINPE con token sandbox; `PAG-005` a `PAG-008` requieren pasarela de prueba que actualmente no figura implementada.
- Fechas de `ENV-005` a `ENV-008` ya son históricas: se deben generar dinámicamente según el calendario vigente, no reutilizarlas literalmente.
- No usar cuentas reales para `AUT-003` (bloqueo) ni webhook de pagos real. Necesitan entorno QA aislado y pruebas de restablecimiento.

## Reporte y GitHub Actions

Cuando se ejecutan pruebas reales, Playwright produce `playwright-report/`, `qa/results/playwright.json` y `test-results/` (capturas/video/trazas de fallos). `.gitignore` evita subirlos accidentalmente.

Incluido `.github/workflows/qa02-manual.yml`: ejecución manual por tester autorizado. Debes configurar `secrets.QA_BASE_URL` **públicamente accesible desde GitHub o mediante runner dentro de tu red** (GitHub-hosted runner NO puede acceder a `localhost` de tu PC), además de secretos de QA. El workflow está pensado para borradores, no representa suite completa.

La skill `.claude/skills/prueba/SKILL.md` es **opcional** para desarrolladores con Claude Code; todos los comandos anteriores funcionan sin Claude Code.

Consulta `docs/IMPLEMENTACION.md` para completar cobertura de los 105 casos.

Fuentes: https://playwright.dev/docs/intro · https://playwright.dev/docs/test-assertions · https://playwright.dev/docs/trace-viewer-intro · https://docs.github.com/en/actions

## Ejecución desde GitHub Actions (para testers sin Claude Code)

**Para la versión QA publicada**, comienza por [`CONFIGURAR_QA_PUBLICADO.md`](CONFIGURAR_QA_PUBLICADO.md). También está la guía general [`GITHUB_ACTIONS_PASO_A_PASO.md`](GITHUB_ACTIONS_PASO_A_PASO.md).

En **Actions → QA02 Happy Times Balloons - ejecución manual → Run workflow**, selecciona `validar`, `conexion`, `borradores`, `modulo` o `caso`.

Comienza por `validar`, que funciona sin URL ni credenciales, después por `conexion`, que verifica acceso a la web publicada sin iniciar sesión. Para ejecutar pruebas de navegador, configura secretos de QA/staging en el repositorio y asegúrate de que GitHub pueda acceder a la aplicación. Los 10 flujos siguen siendo **borradores sin verificar**; los demás no se han implementado.
