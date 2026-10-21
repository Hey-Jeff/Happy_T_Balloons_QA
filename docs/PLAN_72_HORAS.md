# QA02 — Plan de ejecución de 72 horas (trabajo individual asistido)

## Estado tras paquete D1
- 105 casos documentados, 8 N/A, **26 flujos exploratorios** (10 previos + 16 nuevos), **71 sin código**, **0 certificados/verificados**. 
- 9 de 26 se pueden lanzar en `modo=publicos` de forma anónima sin escrituras deliberadas.
- Los 16 nuevos no están certificados: son candidatos a validar contra la interfaz del entorno QA.
- No afirmar cobertura completa: PASS de un borrador no implica aprobación formal.

## Día 1: instalar paquete, ejecutar seguros, clasificar errores
1. Integrar los archivos del ZIP en la misma ruta del repo y subir a `main` (NO subir el ZIP como un solo archivo).
2. Ejecutar GitHub Actions **Run workflow** modo `validar` y confirmar 11 pruebas unitarias PASS + QA 105.
3. Ejecutar modo `publicos` (sin `http_auth`). Inspeccionar FAIL, corregir selectores/datos; evitar `Run rerun jobs` tras cambios.
4. Solicitar a devs rol `Administrador` para `QA_ADMIN_EMAIL`, cuenta `Cliente`, datos de prueba y reset seguro.
5. Sin rol administrador: no ejecutar `borradores`, para evitar mezclar bloqueos con defectos reales.

## Día 2: funciones de negocio prioritarias
- En entorno aislado autorizado con copia de seguridad: PRO CRUD, CATE CRUD, INV movimientos, PED carrito/checkout.
- Agregar seeds y limpieza por API/BD. No activar `QA_ALLOW_MUTATIONS` sin esa autorización.
- Corregir casos CAT-002 (detalle HTTP 500) y discrepancia de datos CAT-001.
- Verificar ACL real del usuario administrador y cliente. Endurecer AUT-001 para exigir recursos protegidos.

## Día 3: regresión, integraciones y entrega
- Reportes, ENV, SINPE sandbox, buzón y 2FA; marcar BLOCKED explícito si no hay servicio.
- Generar consolidado 105 casos: implementado/ejecutado/resultado/evidencia/defecto/bloqueo.
- Repetir suite de no mutaciones y suite con restablecimiento de BD en staging aislado.
- Entrega: reportes HTML/JSON, defectos, N/A, pendientes, responsables.

## Dependencias de desarrollo
- Cuenta de prueba con rol Administrador comprobado en `/Admin` y `/Producto`.
- Cuenta Cliente distinta; seed productos/categorías/pedido; producto con stock bajo.
- Respaldo/reset BD; autorización de pruebas con escritura; envíos y pagos sandbox; buzón 2FA.
- HTTPS para credenciales reales (la excepción HTTP temporal transmite contraseñas y cookies sin cifrar).

## Casos D1 incorporados
CAT-005, CAT-008, CAT-011, CAT-012, CLI-003, PRO-005, CATE-004, INV-001,
PED-007, PED-009, REP-002, REP-003, REP-004, REP-006, REP-007, REP-008.

**Nota:** REP-006 requiere que QA tenga un producto con stock bajo; CAT-005/CAT-012 productos con categoría; REP-003 ventas históricas; PRO-005 al menos un producto creado. Si no hay semillas, debe fallar como problema de precondiciones, NO aprobar silenciosamente.
