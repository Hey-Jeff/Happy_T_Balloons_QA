# QA02 - Ola adicional de 5 lecturas HTTP

Actualizado sobre commit esperado: `8b191359f8d9151ac9a5d2df2d00c78637c162e1`.

**No reinstales anteriores.** Este paquete contiene un workflow de SOLO los cinco nuevos casos, para no repetir las 36 pruebas que ya pasaron. No crea pedidos, modifica inventario ni realiza pagos. Usa cuentas desechables: HTTP expone credenciales/cookies.

Casos:
- CAT-009: selecciona un producto INACTIVO del listado admin y comprueba que no aparece en el catálogo público.
- CATE-006: selecciona una categoría INACTIVA del listado admin y comprueba que no aparece en el filtro público.
- ENV-002: selecciona zona NO DISPONIBLE del mantenimiento, agrega producto al carrito de sesión y comprueba que no está en checkout (no confirma el pedido).
- CLI-004: usa cliente QA ya existente y comprueba su historial si tiene un pedido sembrado.
- CLI-005: usa cuenta QA adicional SIN pedidos, configurada con secretos `QA_EMPTY_CLIENT_EMAIL`, `QA_EMPTY_CLIENT_PASSWORD`.

**PASS** = aserciones de navegador completadas. **BLOCKED** = falta dato/precondición necesaria. **FAIL** = error de script o funcionalidad. BLOCKED jamás se cuenta como PASS/N/A. Sin usuarios, productos ni zonas sembradas no se falsifican resultados.

Instrucciones: extraer TODO, ejecutar `INSTALAR_QA02_5_NUEVOS.bat`, luego Actions -> `QA02 HTTP - 5 nuevos casos con precondiciones` -> Run workflow.

No es obligatorio tener Node en Windows: lo instala/configura GitHub Actions. Necesitas Git for Windows y permisos push existentes.

Los casos CAT-002 y CAT-008 continúan con HTTP 500, defecto fuera de esta ola. Para operaciones que escriben se requiere **BD exclusivamente QA, respaldada y restaurable**, más confirmación del operador. No se habilitan mutadores en esta ola.
