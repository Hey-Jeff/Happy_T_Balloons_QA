# Estado inicial de los casos QA02

Todos los IDs y los pasos originales están en `qa/cases.json`. El Excel fuente tiene 105 pruebas documentadas y un historial fechado 05/10/2026.

## Borradores iniciales (10)

AUT-001, AUT-002, CAT-001, CAT-002, CAT-004, CAT-006, PRO-004, CLI-006, REP-001, REP-005.

## Funcionalidades no aplicables/bloqueadas según Excel (8)

CAT-007 (ordenamiento), CAT-010 (publicación), CATE-008 (jerarquía), PAG-005, PAG-006, PAG-007, PAG-008 (tarjetas), ENV-004 (zona preseleccionada).

No ocultar estos casos: deben constar explícitamente en los informes y revisarse al cambiar la app.

## Fallos históricos de atención prioritaria (3)

- CAT-002: detalle de producto
- PRO-006: producto inexistente
- CATE-012: inactivar categoría con productos asociados

El estado histórico `Failed` no se transforma automáticamente en `Passed` por existir código de prueba.
