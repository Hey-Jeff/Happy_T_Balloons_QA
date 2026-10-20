> **Actualización:** Si Happy Times Balloons ya está publicado en QA, sigue primero [`CONFIGURAR_QA_PUBLICADO.md`](CONFIGURAR_QA_PUBLICADO.md).

# Guía de GitHub Actions para QA02 — Happy Times Balloons

**Este proyecto NO necesita Claude Code para ejecutar pruebas.** GitHub Actions instala Playwright y ejecuta el código incluido en el repositorio.

## 1. Antes de comenzar

- Tener una cuenta GitHub y acceso a un repositorio **privado**.
- Tener los archivos del proyecto en la raíz del repositorio: `package.json`, `tests/`, `qa/`, `scripts/`, `.github/workflows/qa02-manual.yml`.
- Para pruebas funcionales reales: tener la aplicación Happy Times Balloons encendida en una **URL de QA/staging alcanzable desde GitHub** y credenciales de prueba. Si solo corre en el `localhost` de tu computadora, lee la sección **Aplicación local**.
- Los 105 casos se importaron del Excel; **10 flujos son borradores no verificados**, 87 no implementados y 8 no aplicables. No se informa que 105 pruebas hayan pasado.

## 2. Crear un repositorio y subir el código

1. En github.com crea un repositorio nuevo, **Private** (por ejemplo `happy-times-qa02`).
2. **Descomprime** el ZIP descargado. No subas el `.zip` como un único archivo: se deben subir los archivos y carpetas de dentro.
3. Recomendado: usa GitHub Desktop para publicar la carpeta del proyecto, o ejecuta desde la carpeta que contiene `package.json`:

   ```bash
   git init
   git add -A
   git commit -m "Agregar automatización QA02 y GitHub Actions"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/happy-times-qa02.git
   git push -u origin main
   ```

   Cambia `TU_USUARIO` y el repositorio por los reales. GitHub puede solicitar autenticación mediante el flujo de Git Credential Manager. En GitHub, verifica que `.github/workflows/qa02-manual.yml` figure en la rama principal.

4. No subas `.env`, contraseñas, tokens, `node_modules`, `playwright-report`, ni bases de datos con datos personales. `.gitignore` los excluye en condiciones normales; revisa antes del primer commit.

## 3. Primera prueba de GitHub Actions (sin aplicación publicada)

1. En el repositorio, entra a **Actions**.
2. En la barra lateral elige **QA02 Happy Times Balloons - ejecución manual**.
3. Pulsa **Run workflow**.
4. En **modo**, deja `validar` y haz clic en **Run workflow**.
5. Abre la ejecución y revisa `Validar Excel importado y casos de prueba`: debe comprobar el manifiesto de 105 casos y ejecutar las pruebas unitarias de integridad. **Esto NO prueba el sitio web.**

> GitHub solo muestra el botón *Run workflow* si existe `workflow_dispatch` en el workflow y el archivo está en la rama predeterminada. El usuario que ejecuta manualmente necesita permiso suficiente para ejecutar workflows (por regla general, `write`).

## 4. Conectar el ambiente real de QA/staging

En el repositorio entra a **Settings → Secrets and variables → Actions → New repository secret**. Define lo siguiente, solo con valores de cuentas de prueba:

| Secreto | Valor esperado |
|---|---|
| `QA_BASE_URL` | Ejemplo `https://qa.tu-dominio.example`, **no** localhost |
| `QA_ADMIN_EMAIL` | Correo de administrador de QA |
| `QA_ADMIN_PASSWORD` | Contraseña de administrador de QA |
| `QA_CLIENT_EMAIL` | Correo de cliente de QA si se usa |
| `QA_CLIENT_PASSWORD` | Contraseña del cliente de QA si se usa |
| `QA_INVALID_PASSWORD` | Clave incorrecta de prueba para AUT-002 |

`QA_BASE_URL` es el mínimo para iniciar pruebas web; los demás se requieren según el caso. No uses producción ni datos reales de clientes. No pegues secretos en el Excel, en el código ni en un comentario de GitHub.

## 5. Cómo usar los botones del workflow

En **Actions → QA02 Happy Times Balloons - ejecución manual → Run workflow**, elige:

- **modo = validar**: valida JSON, IDs, pruebas unitarias y cobertura documental, sin navegador y sin requerir `QA_BASE_URL`.
- **modo = borradores**: intenta ejecutar los 10 flujos Playwright de ejemplo disponibles. No son pruebas aún verificadas y pueden fallar por selectores/URL distintos a la aplicación real.
- **modo = modulo**: selecciona `modulo` (como `CAT`) y ejecuta los borradores disponibles de ese módulo. Los casos pendientes no se reportan como aprobados.
- **modo = caso**: escribe un `case_id` como `CAT-001`. **Solo funciona si ese caso tiene flujo Playwright**; un ID no implementado terminará con un error explícito.

Todos los modos de navegador ejecutan con `QA_ALLOW_MUTATIONS=false`, sin autorización para alterar datos productivos. El workflow usa un solo worker de Playwright para evitar choques sobre la misma base de datos.

## 6. Consultar resultados

1. En Actions abre la ejecución finalizada.
2. En **Summary** verás casos seleccionados, cobertura y, si hubo ejecución web, estadísticas de Playwright.
3. En **Artifacts**, descarga `qa02-evidencias-<número>`.
4. Descomprime el artefacto y abre `playwright-report/index.html` localmente si se incluyó.
5. Si hay fallos, revisa trazas, screenshots y videos en `test-results/`. **Atención:** estos archivos pueden contener datos de las cuentas de prueba; mantén el repositorio privado y controla quién puede descargarlos.

**PASS** significa que las aserciones del borrador no fallaron en esa ejecución. **NO** significa que se haya verificado formalmente el caso QA02. La cobertura verificada sigue siendo 0 hasta contrastar los flujos contra el sitio real.

## 7. Si la aplicación funciona solo en localhost

Un runner hospedado por GitHub tiene su propio `localhost` (su propio servidor), no el de tu computadora.

Tres opciones legítimas:

- **Preferida:** desplegar una instancia QA/staging accesible desde GitHub y apuntar `QA_BASE_URL` a esa URL.
- **Integración completa:** incluir el código fuente de la aplicación y dependencias, iniciar aplicación y BD dentro del workflow; cambiar `QA_BASE_URL` a la URL local del runner. El proyecto ZIP actual solo incluye la suite QA; **no** inicia Happy Times Balloons.
- **Red interna:** configurar un **self-hosted runner** en una máquina con acceso a la aplicación. Para eso hay que adaptar `runs-on` y la instalación del navegador al sistema operativo. No añadas un runner self-hosted compartido a un repositorio donde usuarios no confiables puedan ejecutar código.

## 8. Acceso de testers externos

Puedes invitarlos como colaboradores de un repositorio privado. Para ejecutar manualmente workflows desde la interfaz de GitHub suelen necesitar acceso `write`; concede ese acceso solo a personas de confianza y protege la rama principal según las opciones de tu plan. Un usuario con `read` normalmente puede consultar ejecuciones y descargar evidencias a las que tenga permiso, pero **no** iniciar `workflow_dispatch` manualmente.

## 9. Siguientes pasos para llegar a los 105 casos

Para automatizar toda la matriz hacen falta el código o URL de la aplicación, cuentas y datos de QA, flujos de correo de prueba y sandbox/mock de pagos. Los casos del inventario que aún están `pending_implementation` deben desarrollarse y validarse antes de añadirlos a la suite como automatizados. No cambies `expected` para forzar que una prueba pase.

### Fuentes oficiales

- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- https://playwright.dev/docs/ci
