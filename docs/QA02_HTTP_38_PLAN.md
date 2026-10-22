# QA02 HTTP: 38 escenarios y cola de 59 restantes

- **30 PASS / 2 FAIL** confirmados en el lote previo de 32 (GitHub run 39759290755).
- Los **dos FAIL** (`CAT-002`, `CAT-008`) son respuestas HTTP 500 de `/Home/Detalle/8`, no ausencias del Excel.
- Se agregan **6 casos** sin pedidos reales ni operaciones sobre el inventario.
- Los casos que envian formularios en este lote lo hacen con **datos invalidos**; si el servidor acepta uno, la prueba debe FALLAR.
- `ENV-006` se ejecuta contra un GET de horarios con fecha fuera de rango, sin requerir pedido o entrega preparada.
- La matriz de backlog se calcula automaticamente desde `qa/cases.json`, incluye 59 aplicables fuera del lote y los 8 N/A. Esto no equivale a tests aprobados.
- HTTP permanece permitido exclusivamente en el origen autorizado de QA, con cuentas de prueba.
- No se habilitan escrituras validas mientras no exista confirmacion de base QA restaurable.

## Para los 59 aplicables restantes

1. Enumerar las precondiciones desde los flujos existentes y cotejarlas con la funcionalidad actual.
2. Preparar datos desechables / snapshots SQL Server para productos, roles, pedidos, 2FA y entrega.
3. Habilitar suites de escritura con compuertas explicitas y limpieza/restauracion por lote (usando HTTP de QA).
4. Resolver `ENV-011`, que actualmente carece de endpoint de eliminacion de zona; no contarlo como PASS.
5. Verificar cada PASS frente a sus criterios antes de marcar `ready_verified_against_app`.
