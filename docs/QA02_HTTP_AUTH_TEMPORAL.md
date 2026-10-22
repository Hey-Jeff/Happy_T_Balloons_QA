# QA02 — Autenticación HTTP temporal con cuentas desechables

Se habilita un modo explícito y limitado sobre la instancia de prueba `http://13.184.33.122` (no producción) por decisión del equipo QA. **HTTP no ofrece confidencialidad ni integridad del tráfico:** correos, contraseñas, cookies y sesiones pueden ser interceptados o alterados por terceros con acceso a la ruta de red. Guardar valores en GitHub Secrets NO protege su tránsito al servidor.

## Condiciones antes de usar

- Ambas cuentas son **exclusivas de QA**, sin contraseñas reutilizadas ni acceso a datos reales. Nunca usar usuarios permanentes o credenciales de producción.
- Preparar en GitHub: Settings > Secrets and variables > Actions > Repository secrets: `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_CLIENT_EMAIL`, `QA_CLIENT_PASSWORD`. No publicar las contraseñas en el chat, git o reportes.
- Probar desde el workflow Actions `QA02 Happy Times Balloons - ejecución manual`, branch `main`, `modo=caso`, `case_id=AUT-001`, `http_auth=true`, `modulo=CAT` por defecto (ignorado en `caso`). Luego `PRO-012`, `PED-005`, `INV-006` **cada uno en una nueva ejecución**.
- No usar `modo=modulo`, `modo=borradores`, `modo=publicos` ni ejecutar todos con `http_auth=true`. `modo=publicos` conserva `http_auth=false`.
- No activar `QA_ALLOW_MUTATIONS`, `QA_ISOLATED_QA`, `QA_RESETTABLE_DB` ni flags de pagos. El workflow QA compartido mantiene `QA_ALLOW_MUTATIONS=false`.
- La configuración de Playwright desactiva trazas, videos y capturas con `http_auth=true`; el reporte sigue ofreciendo estado PASS/FAIL y mensajes. No capturar ni compartir tráfico HTTP con credenciales.
- Revocar o rotar las dos cuentas al terminar la evaluación. HTTPS sigue siendo la mejor opción si llega a estar disponible.

## Lista permitida en HTTP autenticado

| ID | Propósito | Efecto esperado |
|---|---|---|
| `AUT-001` | Autenticación válida de administrador de prueba | Inicio de sesión y auditoría de prueba |
| `PRO-012` | Cliente no puede abrir mantenimiento de productos | GET y denegación |
| `PED-005` | Checkout con carrito vacío | GET y redirección, ningún pedido |
| `INV-006` | Inventario encima del mínimo | Solo lectura, requiere producto sembrado |

Si falla un caso, verificar logs de Actions. **PASS de un borrador no equivale a verificación formal**; cotejar el criterio de aceptación y registrar evidencia. Si hay 2FA activa en `AUT-001`, preparar el caso específico sin repetir automáticamente códigos OTP.

## Protección contra ejecuciones amplias

`qa.mjs` comprueba el origen HTTP exacto, la selección individual, `QA_ALLOW_HTTP_AUTH=true`, `QA_ALLOW_HTTP=true` y la lista explícita. Cualquier caso no autorizado falla con código 3 **antes de iniciar el navegador**, incluso si se selecciona desde CLI. El acceso al sitio sigue sujeto a los riesgos inherentes a HTTP.
