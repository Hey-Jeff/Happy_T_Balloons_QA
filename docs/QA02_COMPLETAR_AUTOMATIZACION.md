# QA02 — Un workflow, dos perfiles, 105 casos

> Alcance: **solo** `Hey-Jeff/Happy_T_Balloons_QA`. Este repositorio contiene las pruebas. Esta actualización **no cambia** la aplicación, su base de datos ni los pagos.

## Estado inicial verificado (22 de octubre de 2026)

- Matriz: **105 casos**, con 96 borradores Playwright, 8 excluidos N/A y 1 caso pendiente de implementar (`ENV-011`). Ningún borrador se considera cobertura formal verificada solo por existir.
- Workflow previo de QA compartido HTTP: **37 PASS exploratorios, 2 FAIL (CAT-002 y CAT-008 por `/Home/Detalle/8` HTTP 500), 57 BLOCKED, 8 N/A y 1 PENDING**.
- Los 57 BLOCKED son **53 casos no autorizados para ejecutarse sobre la instancia compartida** más **4 casos ejecutados pero omitidos porque faltaban precondiciones**.

## Un solo workflow

En **Actions → QA02 TODOS - 105 casos en una ejecución → Run workflow**:

### Perfil `shared-http` (predeterminado)

Conserva el mismo ejecutor probado `scripts/qa02-all-105.mjs`. Usa **únicamente** el staging compartido `http://13.184.33.122`, sin escrituras persistentes. Ejecuta 43 casos autorizados, clasifica faltantes como BLOCKED y mantiene defectos como FAIL. No necesita secretos adicionales.

### Perfil `isolated-qa` (opcional, seguro solamente con infraestructura QA preparada)

Utiliza `scripts/qa02-isolated-105.mjs`, que intenta los **96 casos con implementación Playwright** individualmente, excepto los que no tengan fixtures indispensables. Los 8 excluidos siguen siendo N/A y `ENV-011` sigue PENDING.

**No seleccionar `isolated-qa` hasta cumplir lo siguiente:**

1. Tener un despliegue **no productivo**, con hostname que identifique QA/staging/test/sandbox/preprod, bajo **HTTPS**, independiente de la IP compartida `13.184.33.122`.
2. Confirmar que **su BD es aislada y restaurable**, con snapshot/backup listo, sin cuentas ni órdenes reales. El workflow **no crea ni restaura snapshots por sí mismo**.
3. Asegurar que ningún flujo notifique clientes, descuente inventario real, despache pedidos ni procese transacciones reales. Para los flujos SINPE, únicamente un sandbox real sin dinero.
4. En GitHub → Settings → Secrets and variables → Actions, configurar **secrets**:
   - `QA_ISOLATED_BASE_URL` — URL HTTPS raíz de la instancia QA dedicada.
   - `QA_RESETTABLE_DB_CONFIRMATION` — valor exacto `YES`, **solo después de verificar** el backup/restauración de BD.
   - `QA_NO_REAL_TRANSACTIONS` — valor `true` **solo cuando está garantizado** que no se usarán recursos/transacciones reales.
   - `QA_ISO_ADMIN_EMAIL`, `QA_ISO_ADMIN_PASSWORD`, `QA_ISO_CLIENT_EMAIL`, `QA_ISO_CLIENT_PASSWORD` — **cuentas desechables, no reutilizadas**.
   - Si se van a probar pagos SINPE: `QA_SINPE_SANDBOX` = `true` y los fixtures/token de **sandbox**, no de producción.
5. En el cuadro **confirm_isolated** del workflow escribir exactamente `ISOLATED_QA_RESETTABLE_CONFIRMED`.

Cualquier requisito incumplido cancela la ejecución aislada **antes de lanzar Playwright**. El guard de aislamiento no puede comprobar físicamente el estado de la BD; verifica configuración y exige confirmación expresa. No sustituye el backup ni la supervisión del entorno.

## Datos adicionales por caso

Muchos flujos generan sus propios productos/categorías/zonas con prefijo QA automáticamente sobre la BD aislada. Otros necesitan datos específicos existentes. El workflow admite los siguientes *secrets* adicionales, según los casos que se quieran habilitar:

- **Autenticación:** `QA_INVALID_PASSWORD`, `QA_LOCKOUT_EMAIL`, `QA_LOCKOUT_ATTEMPTS`, `QA_RECOVERY_EMAIL`, `QA_UNREGISTERED_EMAIL`, `QA_VALID_RESET_TOKEN`, `QA_RESET_NEW_PASSWORD`, `QA_EXPIRED_RESET_TOKEN`, `QA_TEST_ROLE_NAME`, `QA_ROLE_USER_EMAIL`, `QA_DELETE_ROLE_NAME`, `QA_2FA_EMAIL`, `QA_2FA_PASSWORD`, `QA_2FA_VALID_CODE`, `QA_2FA_INVALID_CODE`, `QA_2FA_EXPIRED_CODE`.
- **Catálogo/clientes:** `QA_EMPTY_CLIENT_EMAIL`, `QA_EMPTY_CLIENT_PASSWORD`, `QA_FOREIGN_ORDER_ID`, `QA_NEW_CLIENT_EMAIL`, `QA_NEW_CLIENT_PASSWORD`, `QA_DUPLICATE_CLIENT_EMAIL`, `QA_DUPLICATE_CLIENT_PASSWORD`, `QA_INACTIVE_PRODUCT_NAME`, `QA_INACTIVE_CATEGORY_NAME`.
- **Inventario y pedidos:** `QA_INVENTORY_PRODUCT_NAME`, `QA_LOW_STOCK_PRODUCT_ID`, `QA_LOW_STOCK_TARGET`, `QA_ORDER_PRODUCT_ID`, `QA_ORDER_CHANGE_ID`, `QA_ORDER_INVALID_CHANGE_ID`, `QA_CANCEL_ORDER_ID`, `QA_CANCEL_PRODUCT_ID`, `QA_CANCEL_STOCK_RESTOCK_QTY`.
- **Pagos de sandbox:** `QA_SINPE_TEST_RECEIPT`, `QA_SINPE_TEST_AMOUNT`, `QA_SINPE_SANDBOX_TOKEN`, `QA_SINPE_TEST_PHONE`, `QA_SINPE_PAID_RECEIPT`, `QA_PAID_ORDER_ID`.
- **Categorías/entregas:** `QA_CATEGORY_WITH_PRODUCTS`, `QA_DELIVERY_ORDER_ID`, `QA_FULL_DELIVERY_DATE`, `QA_RESCHEDULE_DATE`, `QA_DISABLED_ZONE_NAME`.

**Variables** de Actions, no secretos, para escenarios especiales con base inicialmente vacía: `QA_EXPECT_EMPTY_CATALOG`, `QA_EXPECT_EMPTY_CATEGORIES`, `QA_EXPECT_EMPTY_ADMIN_ORDERS` = `true` **solamente** si el escenario se preparó realmente. Estos escenarios pueden requerir snapshots separados; un mismo estado de base no puede simultáneamente tener catálogo vacío y datos suficientes para compras.

## Interpretación del informe

- `PASS`: la ejecución Playwright realmente pasó, todavía **exploratorio**, no aprobación formal.
- `FAIL`: el test se ejecutó y devolvió error (del sitio, de los datos o del test); investigar.
- `BLOCKED`: falta fixture o el propio Playwright omitió la prueba por precondición.
- `N/A`: caso previamente excluido en la matriz.
- `PENDING`: caso sin implementación disponible (`ENV-011`). El sitio actual admite **cambiar disponibilidad** de una zona, pero no su eliminación; decidir con el responsable funcional si debe cambiarse a N/A, sin fabricar PASS.

**Limitaciones reales:** el workflow no puede arreglar errores HTTP 500 de la aplicación ni garantizar la preparación física del entorno ni de la base. Algunos flujos borrador necesitan ajustes contra datos existentes y pueden fallar cuando se prueban de verdad. No se generan credenciales falsas ni se simulan PASS. No se publican capturas/trazas de sesiones como artefactos.

## Cómo continuar

Ejecutar primero `shared-http` para confirmar que no se rompió el caso ya validado. Preparar infraestructura aislada HTTPS y secretos; a continuación ejecutar `isolated-qa` una vez. Usar el resumen individual de 105 casos para corregir fixtures y flujos de test, no para ocultar defectos.
