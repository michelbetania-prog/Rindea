# BIEM Cotiza — Diagnóstico para lanzamiento web responsive

**Fecha:** 10 de octubre de 2026
**Decisión de producto:** lanzar primero una plataforma web responsive privada, conservando Expo/React Native y las capacidades móviles existentes.
**Conclusión:** es viable convertir el proyecto actual en una plataforma web de producción **sin reconstruirlo**. El primer lanzamiento debe ser web **online-first**, con MySQL y autenticación reales; la sincronización offline avanzada y colaboración multiusuario completa se incorporan después del piloto.

> El preview actual demuestra la interfaz y la compatibilidad web, pero no es una plataforma de producción: los datos comerciales siguen en `AsyncStorage`, la UI no exige autenticación y no existe configuración de despliegue, dominio ni rutas de producción.

## 1. Resumen ejecutivo

### Recomendación

Publicar BIEM Cotiza como una aplicación **híbrida**:

```text
Navegador móvil / escritorio
             │
             ▼
Static hosting (Expo web export)
  - HTML, JS, CSS, iconos
  - rutas de Expo Router
             │ /api/* mismo dominio
             ▼
Express + tRPC en contenedor
  - Manus OAuth
  - permisos por workspace
  - validación Zod
  - cálculo canónico de cotizaciones
             │
             ▼
MySQL administrado
  - usuarios, workspaces, catálogo,
    clientes, cotizaciones y auditoría
```

Esta forma conserva:

- Expo Router y React Native Web.
- Las pantallas responsive ya implementadas.
- La futura opción de volver a distribuir Android/iOS sin duplicar producto.
- PDF y compartir, con comportamiento de navegador para impresión/hoja de compartir.
- El servidor Express/tRPC y Drizzle ya incorporados en el starter.

No requiere convertir la app a Next.js, rehacer la interfaz en HTML/CSS ni abandonar la base móvil.

### Enfoque de lanzamiento recomendado

| Etapa | Propósito | Alcance |
| --- | --- | --- |
| **Web v1 privada** | Validar cotizaciones reales sin riesgo de fuga de datos | Cuenta, workspace individual, MySQL, catálogo, clientes, cotizaciones, PDF, reportes, migración local y piloto |
| **Web v1.1** | Mejorar fiabilidad y adopción | Recuperación, exportación, telemetría, PWA básica, correcciones del piloto |
| **Colaboración v2** | Varios usuarios y dispositivos | Invitaciones, roles, auditoría, resolución de conflictos y sincronización incremental |
| **Offline avanzado v3** | Operación sin red prolongada | SQLite/IndexedDB, outbox, pull/push y conflictos de datos |

Para el primer piloto no se necesita WebSocket, tiempo real, invitaciones ni un motor completo de sincronización offline. Es más importante que un emprendedor pueda iniciar sesión, crear una cotización, guardarla en la nube y verla desde otro navegador.

## 2. Evidencia del diagnóstico

### Lo que ya funciona en web

| Evidencia | Resultado | Implicación |
| --- | --- | --- |
| `app.config.ts` | `web.output: "static"` y Metro configurado | Expo puede generar una aplicación web estática sin cambiar el stack |
| Exportación local | `expo export --platform web` completó correctamente | Se generaron `index.html`, CSS/JS y páginas estáticas para las rutas principales |
| Rutas exportadas | `/`, `/cotizaciones`, `/historial`, `/clientes`, `/calculadora`, `/negocio`, `/reportes` | La navegación actual es publicable como aplicación web |
| Prueba visual de 1440 px | Dashboard, nueva cotización e historial renderizan correctamente | El diseño de escritorio ya presenta rail lateral, barra superior y tablas/acciones de trabajo |
| Prueba visual de 390 px | Dashboard, nueva cotización e historial renderizan correctamente | La navegación inferior, tarjetas y controles se adaptan a navegador móvil |
| API local | `GET /api/health` devuelve 200 | Express está operativo y puede ser la mitad servidor del despliegue híbrido |
| Capacidades del proyecto | `server` y `database` están activadas | No hace falta habilitar capacidades nuevas para el backend seguro |
| Starter | tRPC, Drizzle, Manus OAuth y MySQL ya están presentes | La base técnica de la fase 1 existe |

### Funcionalidades del producto preservadas

- Calculadora de precios y catálogo de productos/servicios.
- Cotización rápida con cliente opcional, ítems manuales o de catálogo, descuento e impuestos.
- Historial y cambio de estado.
- Clientes, perfil comercial y logo.
- Reportes derivados de cotizaciones.
- Exportación PDF y compartir; en navegador se apoya en impresión/guardar PDF y, cuando el navegador lo permite, Web Share.
- Responsive en formatos móvil y escritorio.

## 3. Qué no está listo para producción

### Bloqueadores de lanzamiento

| Área | Estado observado | Riesgo | Acción necesaria |
| --- | --- | --- | --- |
| Datos comerciales | `BiemProvider` carga `products`, `clients`, `quotes` y perfil desde `AsyncStorage` | Datos no viajan entre navegadores; no hay propiedad por cuenta | Mover la fuente de verdad a MySQL |
| Privacidad | La UI entra directamente con datos de muestra; no hay guardia de sesión | Un usuario no tiene aislamiento real | Añadir pantalla/guardia de login y workspace activo |
| Backend de negocio | `appRouter` solo expone `system` y `auth`; no existen routers de cotizaciones/clientes | No se puede persistir ni autorizar el dominio comercial | Crear routers/services protegidos |
| Esquema MySQL | Solo existe `users` | No hay entidades de negocio ni tenancy | Agregar workspaces, miembros y tablas comerciales |
| Permisos | Existe `protectedProcedure`, pero los datos actuales no la usan | No hay enforcement por negocio | Crear `workspaceProcedure` y aplicarla a cada consulta/mutación |
| Numeración | El número visible de cotización se calcula localmente por longitud del arreglo | Colisiones entre usuarios/dispositivos | Secuencia transaccional por workspace en servidor |
| Producción | No hay `build`, `deploy`, `routes`, Dockerfile ni hosting configurado | Preview no se puede interpretar como sitio publicado | Añadir contrato híbrido y probarlo |
| Dominio/OAuth | La URL de callback redirige a variables de Preview/localhost | Login puede volver al host incorrecto en producción | Definir origen público real y permitirlo en OAuth/CORS |
| Recuperación | La base administrada no ofrece backup/restauración punto-en-tiempo como parte de la capacidad | Riesgo operativo sin plan de exportación y restauración | Exportación lógica, soft delete, auditoría y simulacro de recuperación |

### Gaps importantes, pero no bloqueadores del piloto

- Bundle web principal aproximado: **5,2 MB** sin compresión, según el export. Hay que medir Web Vitals y optimizar después de que el flujo de cuenta/datos sea correcto.
- No existe un manifiesto `public/manus-routes.json`, requerido para declarar explícitamente las rutas del sitio web.
- La exportación incluye rutas internas como `/dev/theme-lab` y variantes de `(tabs)`. Deben eliminarse de la salida productiva o restringirse antes de publicar.
- No hay política de privacidad, términos, soporte o exportación de datos.
- No existe analítica configurada para medir activación o creación/envío de cotizaciones.
- La aplicación privada no debe indexarse. SEO público es secundario y, si se crea una landing, debe separarse de las rutas autenticadas.
- No hay declaración PWA. La plataforma puede servir un manifiesto por defecto una vez publicada, pero eso no implementa un service worker ni offline.

## 4. Arquitectura web de producción propuesta

### 4.1 Despliegue híbrido en el mismo dominio

La recomendación es servir aplicación y API bajo un mismo origen:

```text
https://app.biemcotiza.com/             → frontend estático Expo
https://app.biemcotiza.com/cotizaciones → fallback SPA estático
https://app.biemcotiza.com/api/*        → Express/tRPC en contenedor
```

Ventajas:

- Cookies de sesión same-origin.
- Menos complejidad de CORS y menos problemas con Safari/terceras cookies.
- URL estable para OAuth.
- No hay que publicar dos productos o mantener dominios frontend/API distintos.
- La app actual ya puede utilizar una base API relativa en producción; se debe completar el manejo de origen público para OAuth.

### 4.2 Configuración de publicación que se debe implementar

Cuando la fase de backend esté lista, configurar:

```json
{
  "build": {
    "command": "corepack enable && pnpm install --frozen-lockfile && pnpm exec expo export --platform web --output-dir web-dist",
    "outputDirectory": "web-dist"
  },
  "deploy": {
    "dockerfilePath": "Dockerfile",
    "healthPath": "/api/health"
  },
  "routes": [
    { "path": "/api/*", "target": "server", "cache": "no-cache" },
    { "path": "/*", "target": "static", "spaFallback": true }
  ]
}
```

Además:

- Crear `Dockerfile` que instale dependencias, ejecute `pnpm build` y arranque el API Express en `PORT`.
- Mantener `GET /api/health` público, pequeño y sin depender de sesión.
- Usar cache corto/no-cache para rutas de la aplicación privada; los assets exportados llevan hash y pueden servirse con cache de larga duración.
- Añadir `public/manus-routes.json` con las rutas web intencionales.
- Excluir `dev/theme-lab` y cualquier ruta interna de la superficie publicada.

### 4.3 Autenticación web y URL pública

Hay código de Manus OAuth y de cookie, pero necesita completarse para producción:

1. Definir **un origen público canónico**, por ejemplo `https://app.biemcotiza.com`.
2. Incorporar una variable pública, por ejemplo `EXPO_PUBLIC_APP_ORIGIN`, en el build web.
3. Incorporar una variable solo de servidor, por ejemplo `APP_PUBLIC_ORIGIN`, para redirigir desde OAuth al frontend correcto.
4. Formar el callback como URL absoluta: `https://app.biemcotiza.com/api/oauth/callback`.
5. Añadir el origen canónico a la lista CORS; el CORS actual solo reconoce los orígenes de Preview.
6. Mantener cookies `HttpOnly`, `Secure`, `SameSite=None` en Preview HTTPS; en producción same-origin se puede usar la política requerida por el flujo validado, sin bifurcar seguridad por `NODE_ENV` solamente.
7. Implementar un `AuthGate` antes de cargar `BiemProvider`: mostrar login hasta que `auth.me` valide una sesión real.
8. Borrar la dependencia de `localStorage` como evidencia de identidad; `auth.me` del servidor es la fuente de identidad.
9. Requerir `protectedProcedure` y una segunda capa `workspaceProcedure` para todos los datos comerciales.

## 5. Fase 1: backend seguro para el lanzamiento web

La fase 1 debe resolver cuentas privadas y persistencia web sin esperar la sincronización offline completa.

### 5.1 Modelo mínimo

| Tabla | Finalidad |
| --- | --- |
| `users` | Ya existe; identidad de Manus OAuth |
| `workspaces` | El negocio dueño de los datos |
| `workspaceMembers` | Relación usuario-negocio, inicialmente con `owner` |
| `businessProfiles` | Datos fiscales/comerciales y preferencias de cotización |
| `products` | Catálogo por workspace |
| `clients` | Clientes por workspace |
| `quotes` | Cabecera, estado, totales, fechas y autoría |
| `quoteItems` | Snapshot de los ítems históricos |
| `workspaceSequences` | Numeración única de cotizaciones por negocio |
| `auditEvents` | Cambios sensibles y recuperación operativa |

Todos los datos de negocio deben llevar `workspaceId`, `createdAt`, `updatedAt`, `createdByUserId`, `updatedByUserId`, `version` y `deletedAt` cuando aplique.

### 5.2 Decisiones técnicas de importes y documentos

- Guardar importes en unidad menor (`amountMinor`) o `DECIMAL(19,4)`, no `float`.
- Guardar tasas como puntos básicos (`taxRateBps`, `discountBps`).
- Calcular en servidor subtotal, impuestos, descuento y total.
- Asignar el número de cotización dentro de una transacción.
- Guardar en `quoteItems` el precio y nombre final; un cambio en catálogo nunca debe cambiar un PDF histórico.
- Conservar borrado lógico y auditoría en el piloto; no aplicar borrados físicos.

### 5.3 API mínima

| Router | Procedimientos de v1 |
| --- | --- |
| `auth` | `me`, `logout` |
| `workspaces` | `current`, `createFirst`, `select` |
| `business` | `get`, `update` |
| `products` | `list`, `upsert`, `archive` |
| `clients` | `list`, `upsert`, `archive` |
| `quotes` | `list`, `get`, `create`, `update`, `updateStatus`, `duplicate` |
| `migration` | `inspectLocalData`, `importLegacyData`, `status` |

Para el primer piloto, todas las lecturas y escrituras de la web pueden ir directamente al servidor mediante React Query/tRPC. Después de cada mutation se invalida/refresca la query correspondiente. La UI conserva su estructura; se sustituye el contenido interno de `useBiem` por un repositorio de datos autenticado.

## 6. Migración desde el preview actual

La migración se debe ejecutar al primer login, nunca en silencio:

1. Leer el estado local `biem-cotiza-state-v1`.
2. Distinguir la semilla de demostración conocida de datos añadidos por el usuario.
3. Mostrar un resumen con negocio, productos, clientes y cotizaciones importables.
4. Permitir **Importar ahora**, **Omitir** o **Decidir después**.
5. Crear el workspace inicial y subir datos de manera idempotente con `migrationId`.
6. Mantener la copia local hasta que el servidor confirme todas las entidades.
7. Reemplazar el estado de UI con los datos canónicos del servidor.

No se debe eliminar AsyncStorage durante el lanzamiento web. Se conserva como respaldo de migración y para mantener la app móvil existente funcional mientras se introduce el repositorio compartido.

## 7. Seguridad, respaldo y recuperación

### Seguridad mínima antes del piloto

- Manus OAuth, sesión validada y guardia de navegación.
- `workspaceProcedure` obligatorio; el cliente no elige arbitrariamente el workspace que se usa para una query.
- Validación Zod y límites de payload en todas las mutations.
- CORS limitado al origen de Preview y al dominio final, sin comodines.
- Cookies `HttpOnly`, `Secure`; state OAuth con nonce único, de vida corta y validado en callback.
- Rate limiting para login, API y creación de cotizaciones.
- CSP compatible con el markup de plataforma; verificar después de publicar, no copiar una CSP rígida sin pruebas.
- Datos de HTML/PDF escapados, URL de logo validada y uploads en Storage, no en el filesystem del contenedor.
- Auditoría de acceso, cambios de estado, edición de perfil y exportación.
- Logs sin tokens, cookies, datos completos del cliente ni contenido de cotizaciones.

### Respaldo y recuperación

La base MySQL administrada es durable, pero la capacidad actual no proporciona un API de backup/restauración punto-en-tiempo separada. Por tanto, el plan debe ser de aplicación:

1. **Exportación por workspace:** endpoint autorizado que genere un archivo JSON/CSV con perfil, catálogo, clientes y cotizaciones.
2. **Snapshot operativo:** tarea programada de backup lógico hacia Storage con retención definida; no guardar secretos ni respaldos solo en el filesystem efímero del contenedor.
3. **Soft delete y auditoría:** recuperación de una eliminación o edición reciente sin restaurar toda la base.
4. **Prueba de restauración:** restaurar un backup en un workspace de ensayo y verificar conteos/totales antes del piloto.
5. **Migrations seguras:** aditivas, versionadas, revisadas y nunca destructivas en la base compartida entre Preview y producción.
6. **Runbook:** definir responsable, frecuencia, retención, RPO/RTO objetivo y pasos para restaurar un workspace.

No se debe afirmar que existe recuperación automática hasta ejecutar y validar el simulacro de restauración.

## 8. Dominio personalizado y entorno de producción

### Estado

No existe una publicación activa, dominio, declaración de hosting ni configuración de `build`/`deploy`. El proyecto está en Preview; `auto_publish` está desactivado.

### Pasos correctos

1. Completar el backend seguro y el contrato híbrido.
2. Publicar una primera versión controlada para obtener el entorno de producción.
3. Configurar el dominio personalizado desde el flujo de dominio del Dashboard y crear **exactamente** los registros DNS que solicite la plataforma.
4. Elegir un dominio de aplicación, por ejemplo `app.biemcotiza.com`; reservar un dominio distinto para una futura landing pública, por ejemplo `www.biemcotiza.com`.
5. Configurar el origen canónico del dominio para OAuth, CORS y metadatos.
6. Verificar HTTPS, callback OAuth, logout, deep links web, requests `/api/*` y rutas directas como `/cotizaciones`.
7. No activar publicación pública amplia hasta cerrar el piloto.

El sistema actual no expone un campo de dominio en su configuración de proyecto. Por eso el dominio se debe conectar **después de tener una publicación funcional**, usando el proceso del Dashboard y los datos DNS que este entregue; no se deben inventar registros DNS desde esta fase de diagnóstico.

### Hosting recomendado para el piloto

- **Piloto:** `on_demand` es aceptable si se comunica la posible latencia de arranque en periodos de inactividad.
- **Siempre activo:** solo se justifica si los emprendedores requieren respuesta inmediata y se acepta el costo/confirmación correspondiente.
- En ambos modos, MySQL/Storage son los únicos lugares para estado durable; nunca memoria del proceso o filesystem del contenedor.

## 9. Experiencia web: ajustes antes del piloto

### Validaciones realizadas

- **Escritorio 1440×960:** dashboard, creación de cotización e historial muestran la estructura SaaS correcta; rail lateral, buscador, tablas y acciones son utilizables.
- **Móvil 390×844:** dashboard, nueva cotización e historial usan navegación inferior, tarjetas y controles táctiles sin desbordamiento visual observado.
- **Export estático:** las rutas principales se generaron sin error.

### Validaciones que siguen pendientes

| Área | Prueba requerida |
| --- | --- |
| Navegadores | Chrome y Edge de escritorio; Chrome Android; Safari iOS; Safari macOS si el piloto lo usa |
| Autenticación | Login, refresh, logout, expiración, callback OAuth y bloqueo de rutas sin sesión |
| PDF | Guardar como PDF en Chrome/Safari, Web Share cuando esté disponible, y formato con datos reales |
| Formularios | Teclado virtual, autocompletar, zoom, scroll, focus visible y errores de validación |
| Deep links | Entrar directamente a `/cotizaciones`, `/historial` y `/clientes` en el dominio publicado |
| Accesibilidad | Navegación por teclado, lectores de pantalla básicos, contraste, objetivos táctiles y reducción de movimiento |
| Rendimiento | LCP, INP, bundle, caché de assets y render de listas reales |
| Privacidad | Cuenta A nunca ve, busca, exporta ni infiere datos de cuenta B |

## 10. Plan de ejecución orientado al lanzamiento

### Prioridad 1 — Ingresos y privacidad

**Fase Web A: cuenta privada y datos persistentes.**

1. Crear esquema MySQL de workspace y negocio.
2. Implementar OAuth real con `AuthGate` y origen de producción configurable.
3. Crear routers/services protegidos por workspace.
4. Conectar catálogo, clientes, cotizaciones, historial y reportes a tRPC/MySQL.
5. Hacer números de cotización y totales canónicos en backend.
6. Implementar importación voluntaria desde AsyncStorage.
7. Pruebas de aislamiento de datos con dos cuentas.

**Resultado esperado:** un emprendedor inicia sesión, tiene su propio negocio, guarda una cotización y puede volver a verla desde otro navegador. Esta es la condición mínima para captar feedback y uso real.

### Prioridad 2 — Plataforma web publicable

**Fase Web B: build, dominio y endurecimiento.**

1. Crear `Dockerfile`, contrato `build`, `deploy` y rutas híbridas.
2. Añadir `manus-routes.json`; retirar rutas de desarrollo de producción.
3. Configurar dominio y origen público después de la primera publicación controlada.
4. Aplicar CORS, cookies, rate limit, CSP revisada, logs y health/readiness.
5. Definir exportaciones, backups, soft delete, auditoría y runbook.
6. Ejecutar validaciones cross-browser y de rutas directas.

**Resultado esperado:** una web privada con URL estable, HTTPS, OAuth funcional y recuperación operativa documentada.

### Prioridad 3 — Piloto privado

1. Seleccionar 3–5 emprendedores con necesidades de cotización frecuentes.
2. Crear un workspace por negocio, sin invitar colaboradores todavía.
3. Importar datos existentes solo con su consentimiento.
4. Dar guía de onboarding: crear catálogo opcional, crear cotización, guardar/exportar/enviar.
5. Medir activación, cotizaciones creadas, cotizaciones enviadas, tiempo a primera cotización, errores y soporte.
6. Realizar revisión semanal y corregir bloqueadores antes de ampliar el piloto.

### Dejar para después

- Invitaciones, roles múltiples y colaboración simultánea.
- Motor offline-first completo con outbox y conflictos avanzados.
- WebSocket/SSE y notificaciones en tiempo real.
- Publicación Google Play/App Store.
- WhatsApp Business API, pagos, suscripciones y automatizaciones.
- Landing pública SEO; la aplicación privada debe permanecer `noindex` hasta que se defina una estrategia de marketing separada.

## 11. Definición de listo para piloto web

No iniciar el piloto si falta alguno:

- [ ] Login obligatorio y logout funcional.
- [ ] Workspace individual creado y seleccionado en servidor.
- [ ] Productos, clientes, cotizaciones, PDF e historial persistidos en MySQL.
- [ ] Prueba demostrable de aislamiento entre al menos dos cuentas.
- [ ] Cálculo, totales, moneda y número de cotización validados en backend.
- [ ] Migración voluntaria desde AsyncStorage sin duplicados ni pérdida de datos.
- [ ] Exportación/recuperación de un workspace comprobada.
- [ ] Build híbrido y endpoint `/api/health` publicados correctamente.
- [ ] Dominio, HTTPS, OAuth y rutas directas comprobados.
- [ ] Pruebas web en móvil y escritorio aprobadas.
- [ ] Privacidad, términos, canal de soporte y protocolo de incidentes definidos.

## 12. Primera tarea de implementación recomendada

Implementar **Fase Web A: workspace, autenticación y persistencia de cotizaciones en MySQL** antes de diseñar más pantallas o iniciar la configuración de tiendas móviles.

Esta tarea entrega el mayor impacto de lanzamiento: permite que cada emprendedor tenga una cuenta, que sus datos sean privados y que las cotizaciones sigan existiendo al abrir BIEM Cotiza en otro navegador.
