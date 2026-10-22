# QA02 — Una sola ejecución para los 105 casos

Inicia **QA02 TODOS - 105 casos en una ejecución** en GitHub Actions; no hay que ejecutar cada caso individualmente.

- 105 filas informadas individualmente: 96 borradores automatizados, 1 caso sin implementación (`ENV-011`), 8 fuera de alcance (N/A).
- 43 casos de lectura o validación sin cambios persistentes, incluyendo la quinta ola, se ejecutan en la instancia HTTP compartida.
- 53 casos se reportan como BLOCKED hasta disponer de precondiciones y/o una base QA **separada** que pueda restaurarse. No se habilitan operaciones que puedan crear cuentas, pedidos, pagos o alterar inventario en el servidor compartido.
- Un test omitido por Playwright es BLOCKED, no PASS; un HTTP 500 real sigue FAIL.
- Cada resultado se obtiene del JSON de Playwright, no solamente del exit code del comando.
- Los 8 N/A conservan su exclusión; no se cuentan como PASS.
- No se publican capturas, sesiones, cookies ni reportes privados como artefactos.

Este workflow ofrece **un solo clic y un informe integral**, pero **no equivale a 105 pruebas efectivamente aprobadas**. Para completar el 100% aplicable, se deberá validar la base QA restaurable, aportar los fixtures de negocio y corregir los defectos de la app. HTTP no cifra credenciales; usar exclusivamente cuentas QA descartables.
