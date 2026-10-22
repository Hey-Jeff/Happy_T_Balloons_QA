# QA02 - Política de datos vigentes para pruebas sobre HTTP

## Reglas

1. **Datos viejos del Excel (nombres, IDs, existencias, zonas):** reemplazar por registros presentes en la instancia actual, manteniendo la misma comprobacion funcional. No significa N/A. Ejemplo: PRO-004 acepta listado con productos reales o estado vacio correctamente renderizado.
2. **Funcionalidad no implementada o excluida del alcance:** marcar N/A solo tras revision y motivo documentado. Los 8 N/A previos siguen sin cambios; `ENV-011` permanece pendiente.
3. **Precondicion necesaria no disponible (cliente sin compras, fecha llena, stock bajo, tokens, etc.):** preparar fixture QA o marcar BLOCKED en el reporte de ejecucion. Nunca convertir en PASS automatico.
4. **Defecto reproducible de la aplicacion:** mantener FAIL. `CAT-002` y `CAT-008` detectan `/Home/Detalle/8` HTTP 500; no se silencian.
5. **Ejecuciones HTTP:** unicamente cuentas QA desechables. Las pruebas de escritura y pagos permanecen deshabilitadas hasta disponer de una base aislada/restaurable y mocks; no basta con activar flags.
6. **Cobertura verificable:** PASS del navegador no cambia automaticamente `automation_status`; contrastar cada criterio de aceptacion y evidencias antes de declararlo `ready_verified_against_app`.

## Lote integrado de 32 escenarios

- 14 publicos sin credenciales ni mutaciones persistentes.
- 18 autenticados de lectura, individualizados por proceso; `QA_ALLOW_HTTP_AUTH=true` solo durante el caso.
- `QA_ALLOW_MUTATIONS=false`, sin captura/subida de artefactos de sesion.
- `npm run unit` comprueba las listas y las restricciones; un FAIL no cancela el resto de los escenarios.
- Todos los resultados siguen siendo exploratorios hasta revision formal.

## Proximo paso para el resto de los 97 aplicables

Completar fixtures dinamicos y aislamiento de BD, ampliar en lotes los casos de lectura autenticada y despues los de escritura controlada. No reescribir el historial del Excel ni falsear resultados.
