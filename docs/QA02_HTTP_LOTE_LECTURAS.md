# QA02 — Lote HTTP de 18 pruebas autenticadas de lectura

**Objetivo:** ejecutar de una vez 18 casos de acceso, listados, filtros y reportes sobre el mismo QA HTTP, sin crear registros de negocio ni enviar webhooks.

En GitHub Actions, selecciona **QA02 HTTP - 18 lecturas autenticadas** → **Run workflow** en `main`. No requiere instalar Node.js en Windows. El workflow ejecuta cada caso por separado con `modo=caso` y las guardas existentes.

Casos: AUT-001, PRO-012, PED-005, INV-006, PRO-004, PRO-005, CATE-004, INV-001, PED-007, PED-009, REP-001, REP-002, REP-003, REP-004, REP-005, REP-006, REP-007, REP-008.

Condiciones: credenciales desechables exclusivas de QA en GitHub Secrets; no usar datos reales. Aunque la aplicación no sea productiva, HTTP transporta las credenciales y cookies sin cifrar. Los logins pueden producir registros de auditoría.

Cada caso tiene resultado separado en el resumen del run. Los errores no impiden intentar los siguientes casos. Este lote **no** certifica formalmente los casos y **no** modifica `qa/cases.json`.

Los casos mutadores (alta de usuarios, productos, inventario, pedidos, roles, webhook de pago, entregas) permanecen bloqueados. Necesitan BD de QA desechable/restaurable, fixtures y un workflow aparte expresamente autorizado. Las dos fallas públicas CAT-002/CAT-008 por HTTP 500 siguen abiertas y no forman parte de este lote.

No se cargan artefactos con información administrativa; desactivados trace, screenshot y video cuando `QA_ALLOW_HTTP_AUTH=true`.
