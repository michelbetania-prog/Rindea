# BIEM Cotiza — Requerimientos técnicos y arquitectura de sincronización multiusuario

**Estado:** propuesta para la siguiente fase
**Alcance:** sincronización segura de negocio, catálogo, clientes y cotizaciones entre varios dispositivos y colaboradores
**Base analizada:** Expo/React Native, servidor Express + tRPC, Drizzle/MySQL administrado, Manus OAuth y estado actual en `AsyncStorage`

## 1. Decisión arquitectónica

La aplicación debe pasar de un estado local monolítico a una arquitectura **offline-first con autoridad en servidor**.

- **Servidor:** fuente canónica de identidad, permisos, datos comerciales, números de cotización, versiones y conflictos.
- **Dispositivo:** caché local transaccional para renderizar sin red, cola de mutaciones pendientes y cursor de sincronización.
- **Transporte inicial:** tRPC sobre HTTP con operaciones `bootstrap`, `pull` y `push`. No se debe bloquear la primera entrega esperando WebSocket o sincronización en tiempo real.
- **Actualización:** sincronización al iniciar sesión, al recuperar conectividad, al volver la app a foreground, después de una mutación local y mediante reintentos con backoff.
- **Tiempo real opcional:** una segunda iteración puede añadir SSE/WebSocket o notificaciones para eventos relevantes; no es requisito del núcleo de sincronización.

La arquitectura conserva Expo Router, las fórmulas de BIEM, generación de PDF, compartición y las rutas actuales. El cambio principal consiste en reemplazar el estado global persistido como fuente de verdad por repositorios locales + API sincronizable.

## 2. Estado actual y brecha

| Área | Situación actual | Requisito para multiusuario |
| --- | --- | --- |
| Persistencia móvil | Un JSON bajo `biem-cotiza-state-v1` en AsyncStorage | SQLite local con transacciones, metadatos de sincronización y outbox |
| Backend | Express, tRPC y contexto con `ctx.user`; no hay routers de dominio | Procedimientos protegidos y filtrados por workspace |
| Base de datos | Tabla `users` | Tenant lógico por workspace, membresías, entidades comerciales, cambios y deduplicación |
| Identidad | Manus OAuth disponible en el starter | Login obligatorio para datos sincronizados; `webdev_app_session` validada en servidor |
| Identificadores | Strings locales como `product-brand` y `quote-047` | UUID/ULID estables para sincronización; el número visible de cotización lo asigna el servidor |
| Concurrencia | No existe control de versiones | `version`, `baseVersion`, cursor monotónico y resolución explícita de conflictos |
| Totales | Cálculos JavaScript con `number` | Recalculo canónico en servidor usando importes enteros en unidad menor o DECIMAL |

El estado inicial de demostración no debe subirse automáticamente como si fuera información real. La migración debe mostrar al usuario qué registros locales propone importar.

## 3. Modelo de tenancy y autorización

### 3.1 Workspace como límite de seguridad

La unidad de propiedad debe ser `workspace`, no el usuario individual. Un workspace representa un negocio o estudio y contiene su perfil comercial, catálogo, clientes y cotizaciones.

Cada query y mutation debe recibir el workspace desde el contexto autenticado y comprobar la membresía en el servidor. El cliente nunca puede establecer libremente `workspaceId` para saltarse esta comprobación.

El contexto recomendado es:

```ts
type AppContext = TrpcContext & {
  user: User | null;
  workspace: Workspace | null;
  membership: WorkspaceMember | null;
};
```

`protectedProcedure` debe rechazar llamadas sin usuario. Un middleware `workspaceProcedure` debe resolver el workspace seleccionado y rechazar cualquier acceso sin membresía activa. El rol y el workspace se deben leer desde la base de datos, nunca confiar en valores enviados por el cliente.

### 3.2 Roles iniciales

| Rol | Alcance |
| --- | --- |
| `owner` | Todo el workspace, facturación futura, miembros, eliminación y exportación |
| `admin` | Todo el trabajo operativo y gestión de miembros salvo transferencia de propiedad |
| `editor` | Crear y editar productos, clientes y cotizaciones; cambiar estados |
| `viewer` | Lectura, reportes y descarga/compartición permitida; sin mutaciones |

La primera entrega puede crear el workspace automáticamente para el primer usuario autenticado. La invitación de colaboradores debe ser una capacidad separada, con token de un solo uso y fecha de expiración.

### 3.3 Autenticación

Usar **Manus OAuth** como proveedor por defecto. No se debe crear un sistema paralelo de email/contraseña.

Requisitos:

1. Mantener la cookie de sesión `webdev_app_session` compatible con Preview.
2. Validar JWT, expiración y `appId` con `MANUS_JWT_SECRET` mediante el SDK existente.
3. Crear o actualizar `users` por `openId`.
4. No confundir visibilidad del proyecto con autenticación de la aplicación.
5. Proteger todos los routers de datos; únicamente health, OAuth y endpoints explícitamente públicos quedan fuera.
6. Enviar a la app solo datos del workspace autorizado.
7. Aplicar `SameSite=None; Secure` en Preview HTTPS embebido cuando el servidor establezca cookies de sesión.

## 4. Esquema de datos recomendado

Los nombres son orientativos y deben traducirse a tablas Drizzle con migraciones aditivas. Se recomienda usar IDs UUID/ULID como `varchar(36)` o `varchar(26)` para permitir creación offline. Los importes no deben usar `float` en MySQL.

### 4.1 Identidad y colaboración

#### `workspaces`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | UUID/ULID | PK |
| `name` | varchar | Obligatorio |
| `createdByUserId` | int | FK a `users` |
| `createdAt`, `updatedAt` | timestamp | Auditoría |
| `version` | bigint | Versión de entidad |
| `deletedAt` | timestamp nullable | Borrado lógico |

#### `workspaceMembers`

| Campo | Tipo | Regla |
| --- | --- | --- |
| `workspaceId` | UUID/ULID | FK |
| `userId` | int | FK |
| `role` | enum | `owner`, `admin`, `editor`, `viewer` |
| `status` | enum | `active`, `invited`, `suspended` |
| `createdAt`, `updatedAt` | timestamp | Auditoría |
| `version` | bigint | Control de cambios |

PK compuesta `(workspaceId, userId)` e índice por `userId`.

#### `workspaceInvites` — recomendable desde el inicio si habrá colaboradores

Debe guardar `workspaceId`, email normalizado, `role`, hash del token, `invitedBy`, `expiresAt`, `acceptedAt`, `createdAt`. Nunca almacenar el token en texto plano.

### 4.2 Perfil y entidades comerciales

#### `businessProfiles`

Un registro por workspace. Contiene los campos actuales de `BusinessProfile` y añade:

- `currencyCode` (`char(3)`), locale y zona horaria.
- `logoUrl` validada contra un origen permitido.
- `createdAt`, `updatedAt`, `updatedByUserId`, `version`.

La moneda es necesaria porque el formato actual usa números JavaScript y no persiste una divisa explícita.

#### `products`

Conservar el dominio actual y agregar:

- `workspaceId`, `id`, `name`, `unit`, `category`.
- `costMinor`, `expensesMinor`, `netPriceMinor`, `suggestedPriceMinor` como `bigint` o `decimal(19,4)`.
- `marginBps` y `taxRateBps` como enteros en puntos básicos; por ejemplo, 35% = 3500.
- `createdByUserId`, `updatedByUserId`, `createdAt`, `updatedAt`, `version`, `deletedAt`.
- `legacyKey` nullable y único por workspace durante la migración.

Los valores derivados (`netPrice`, `suggestedPrice`) deben recalcularse en servidor al crear o editar, aunque el cliente los muestre antes de confirmar.

#### `clients`

Conservar nombre, empresa, email, teléfono y dirección, con `workspaceId`, auditoría, `version` y `deletedAt`. Email y teléfono no deben ser globalmente únicos porque un negocio puede registrar contactos compartidos; como mínimo, normalizar búsquedas por workspace.

#### `quotes`

| Campo | Propósito |
| --- | --- |
| `id` | ID estable offline |
| `workspaceId` | Límite de tenancy |
| `number` | Número visible, asignado por servidor |
| `clientId` | Nullable; cliente opcional |
| `clientNameSnapshot` | Nombre congelado del documento |
| `title` | Título de la propuesta |
| `discountBps` | Descuento aplicado |
| `currencyCode` | Divisa congelada para el documento |
| `subtotalMinor`, `discountMinor`, `taxMinor`, `totalMinor` | Totales canónicos |
| `issuedAt`, `validUntil` | Fechas del documento |
| `conditions` | Condiciones comerciales |
| `status` | Estado de negocio |
| `createdByUserId`, `updatedByUserId` | Auditoría |
| `createdAt`, `updatedAt` | Auditoría técnica |
| `version` | Control de concurrencia |
| `deletedAt` | Borrado lógico |

El número debe asignarse dentro de una transacción con una tabla `workspaceSequences` o una estrategia equivalente. No se debe calcular con `quotes.length + 48`, porque falla con dispositivos offline y escrituras concurrentes.

#### `quoteItems`

Cada ítem debe ser un snapshot del documento, no una referencia mutable al catálogo solamente:

- `quoteId`, `id`, `productId` nullable.
- `source` (`catalog` o `manual`).
- `name`, `unit`, `quantity` decimal, `unitPriceMinor`, `taxRateBps`.
- `lineSubtotalMinor`, `lineTaxMinor`, `lineTotalMinor`.
- `position` entero.

Así, cambiar un producto después no modifica una cotización histórica.

### 4.3 Sincronización y auditoría

#### `syncChanges`

Log append-only por workspace:

| Campo | Tipo | Regla |
| --- | --- | --- |
| `cursor` | bigint autoincremental | Cursor global monotónico |
| `workspaceId` | UUID/ULID | Índice principal |
| `entity` | varchar | `business`, `product`, `client`, `quote`, `quoteItem`, `member` |
| `entityId` | varchar | ID de la entidad |
| `operation` | enum | `upsert`, `delete` |
| `entityVersion` | bigint | Versión resultante |
| `payload` | JSON | Snapshot suficiente para actualizar el caché |
| `actorUserId` | int | Quién originó el cambio |
| `createdAt` | timestamp | Retención y diagnóstico |

Índice `(workspaceId, cursor)` y retención inicial de 30–90 días. Si el cursor del cliente quedó fuera de retención, el servidor responde `RESET_REQUIRED` y la app ejecuta bootstrap completo.

#### `syncMutations`

Tabla de idempotencia:

- `workspaceId`, `mutationId` y `deviceId`.
- `entity`, `entityId`, `operation`, `resultVersion`.
- `status` (`applied`, `conflict`, `rejected`).
- `responsePayload`, `createdAt`.

Unique `(workspaceId, mutationId)`. Un reintento de red debe devolver el mismo resultado y nunca duplicar clientes, productos o cotizaciones.

#### `auditEvents` — recomendable

Para acciones sensibles: invitar miembro, cambiar rol, modificar condiciones, eliminar cliente/producto, cambiar estado de cotización y exportar. Guardar actor, entidad, acción, datos mínimos y timestamp; evitar almacenar información personal innecesaria.

## 5. Contrato de sincronización

### 5.1 Bootstrap

`sync.bootstrap` es una query protegida que recibe el workspace seleccionado y devuelve:

```ts
type BootstrapResponse = {
  workspace: WorkspaceDto;
  membership: MembershipDto;
  business: BusinessProfileDto | null;
  products: ProductDto[];
  clients: ClientDto[];
  quotes: QuoteWithItemsDto[];
  cursor: string;
  serverTime: string;
  schemaVersion: number;
};
```

Se usa al iniciar sesión, al instalar la app, después de `RESET_REQUIRED` y después de cerrar la sesión de otro usuario en el mismo dispositivo.

### 5.2 Pull incremental

`sync.pull({ workspaceId, cursor, limit })` devuelve:

```ts
type PullResponse = {
  changes: ChangeDto[];
  nextCursor: string;
  hasMore: boolean;
  serverTime: string;
};
```

Reglas:

- `cursor` debe ser opaco para el cliente, aunque internamente sea bigint.
- Ordenar por cursor ascendente.
- Procesar páginas pequeñas, por ejemplo 100–500 cambios.
- Aplicar cada cambio en una transacción local.
- Persistir `nextCursor` solo después de aplicar correctamente la página.
- Si el cursor ya no es válido, devolver `RESET_REQUIRED`.

### 5.3 Push de mutaciones

`sync.push({ workspaceId, deviceId, mutations })` recibe lotes pequeños:

```ts
type MutationDto = {
  mutationId: string;
  entity: "business" | "product" | "client" | "quote";
  operation: "create" | "update" | "delete";
  entityId: string;
  baseVersion: number;
  payload: unknown;
  clientUpdatedAt: string;
};
```

Respuesta por mutación:

```ts
type MutationResult =
  | { mutationId: string; status: "applied"; entity: EntityDto; version: number; cursor: string }
  | { mutationId: string; status: "conflict"; serverEntity: EntityDto; serverVersion: number; conflictFields: string[] }
  | { mutationId: string; status: "rejected"; code: string; message: string };
```

El servidor debe procesar cada mutación dentro de una transacción que:

1. Verifica autenticación y rol.
2. Verifica membresía en el workspace.
3. Valida el payload con Zod.
4. Comprueba `baseVersion`.
5. Recalcula campos derivados y totales.
6. Asigna número de cotización si aplica.
7. Escribe la entidad y la nueva versión.
8. Inserta `syncChanges`.
9. Inserta `syncMutations` para idempotencia.
10. Devuelve la entidad canónica.

Una mutación de actualización no debe aceptar como autoridad del cliente `updatedAt`, totales, número visible, propietario, workspace, permisos ni campos derivados.

## 6. Cliente offline-first

### 6.1 Sustitución de AsyncStorage

AsyncStorage debe conservarse solo para preferencias pequeñas, como tema, onboarding o último workspace. Para datos sincronizables se recomienda `expo-sqlite` con un esquema local normalizado:

- `local_workspaces`
- `local_memberships`
- `local_business_profiles`
- `local_products`
- `local_clients`
- `local_quotes`
- `local_quote_items`
- `sync_metadata`
- `sync_outbox`
- `sync_conflicts`

La migración debe ser atómica y tener una versión de esquema local. Nunca sobrescribir el JSON antiguo hasta completar la importación o permitir al usuario descartarla.

### 6.2 Outbox

Toda acción local se escribe primero en una transacción que modifica la tabla local y crea una fila en `sync_outbox`:

```ts
type OutboxRow = {
  mutationId: string;
  workspaceId: string;
  entity: string;
  entityId: string;
  operation: string;
  baseVersion: number;
  payload: string;
  attempts: number;
  nextAttemptAt: string;
  createdAt: string;
};
```

El worker de sincronización:

1. Comprueba sesión y conectividad.
2. Ejecuta `pull` antes de `push` para reducir conflictos.
3. Envía hasta 20–50 mutaciones por lote.
4. Marca como confirmadas las respuestas `applied`.
5. Conserva `conflict` para la interfaz de resolución.
6. Usa backoff exponencial con jitter y límite de reintentos.
7. No elimina una mutación solo porque una petición HTTP terminó; debe existir respuesta idempotente del servidor.

### 6.3 Estado de interfaz

Mostrar un estado pequeño y persistente, no intrusivo:

- `Sincronizado`
- `Sin conexión · cambios guardados en este dispositivo`
- `Sincronizando…`
- `N cambios pendientes`
- `Revisión necesaria`

La app debe permitir crear y editar offline, pero no prometer que una invitación, PDF compartido o cambio de permisos se completó hasta recibir confirmación del servidor.

## 7. Resolución de conflictos

No conviene aplicar un único “última escritura gana” a todas las entidades.

| Entidad | Estrategia |
| --- | --- |
| Perfil de negocio | Merge por campo para campos no coincidentes; si dos usuarios cambian el mismo campo, mostrar conflicto y conservar ambas versiones hasta resolver |
| Producto | Rechazo por versión obsoleta; merge de campos independientes; recalcular precios en servidor |
| Cliente | Merge por campo, con pantalla de revisión si hay colisiones |
| Cotización en borrador | Conflicto a nivel de documento: mostrar versión local y versión servidor; permitir elegir una o duplicar |
| Cotización enviada/aprobada/completada | No sobrescribir silenciosamente; exigir versión actual y registrar auditoría |
| Estado de cotización | Máquina de estados validada en servidor; nunca permitir que un dispositivo offline retroceda una cotización sin confirmación |
| Eliminación | Borrado lógico con tombstone; una entidad eliminada debe seguir apareciendo en el log hasta que todos los clientes válidos superen el cursor |

### Estados permitidos

- `Borrador → Enviada`, `Cancelada`.
- `Enviada → Aprobada`, `Rechazada`, `Cancelada`.
- `Aprobada → Completada`, `Cancelada`.
- `Completada` y `Cancelada` son terminales salvo una acción administrativa auditada.

## 8. Migración del estado actual

La migración debe tener dos caminos:

### Usuario no autenticado

Puede seguir trabajando localmente, pero verá un aviso de que los datos no se sincronizan hasta iniciar sesión. No se deben enviar datos anónimos al backend.

### Primer inicio de sesión

1. Crear o resolver workspace.
2. Leer el estado heredado de `biem-cotiza-state-v1`.
3. Comparar los registros con el conjunto inicial de demostración conocido.
4. Mostrar un resumen: negocio, productos, clientes y cotizaciones a importar.
5. Permitir **Importar**, **No importar** o revisar posteriormente.
6. Convertir IDs heredados en `legacyKey` y asignar UUID/ULID nuevos.
7. Subir en orden: perfil → productos/clientes → cotizaciones → ítems.
8. Guardar un `migrationId` idempotente para que una interrupción pueda reanudarse.
9. Marcar la migración terminada solo después de confirmación de todas las mutaciones.
10. Mantener una copia local de respaldo durante al menos una sesión completa.

Nunca se debe reemplazar el estado local con el bootstrap remoto sin una decisión explícita cuando ambos contienen cambios.

## 9. API y estructura de código

Propuesta de estructura:

```text
server/
  domain/
    workspaces.service.ts
    members.service.ts
    products.service.ts
    clients.service.ts
    quotes.service.ts
    pricing.service.ts
    sync.service.ts
  routers/
    auth.router.ts
    workspaces.router.ts
    products.router.ts
    clients.router.ts
    quotes.router.ts
    sync.router.ts
  _core/
    context.ts
    permissions.ts
    errors.ts
  db.ts

db/
  repositories/
  migrations/

lib/biem/
  local-db.ts
  repositories/
  sync-engine.ts
  sync-types.ts
  migration.ts
  store.tsx
```

El `store.tsx` actual debe convertirse en una fachada de UI que consuma repositorios locales. Las pantallas no deben llamar directamente a `fetch`, SQL o tRPC. Las mutaciones de la UI deben pasar por funciones de dominio como `quotes.create`, `quotes.update`, `clients.upsert` y `sync.enqueue`.

Routers tRPC iniciales:

- `auth.me`, `auth.logout`.
- `workspaces.list`, `workspaces.select`, `workspaces.create`.
- `members.list`, `members.invite`, `members.updateRole`, `members.remove`.
- `business.get`, `business.update`.
- `products.list`, `products.upsert`, `products.delete`.
- `clients.list`, `clients.upsert`, `clients.delete`.
- `quotes.list`, `quotes.get`, `quotes.create`, `quotes.update`, `quotes.updateStatus`, `quotes.duplicate`.
- `sync.bootstrap`, `sync.pull`, `sync.push`, `sync.resolveConflict`.

Todos deben compartir esquemas Zod y respuestas serializables; los routers de lectura deben paginar listas grandes.

## 10. Requisitos no funcionales

### Seguridad

- Aislamiento obligatorio por `workspaceId` en cada query y mutation.
- Zod en frontera de API; límites de tamaño para texto, número de ítems, logo y lotes de sync.
- Rate limiting por usuario/workspace para login, invitaciones y push de mutaciones.
- Logs sin tokens, cookies, contraseñas ni contenido completo de cotizaciones.
- Validación de URLs de logo y protección contra HTML no escapado en PDF/impresión.
- Borrado lógico y auditoría para datos comerciales; no borrar físicamente en la primera fase.

### Consistencia

- Idempotencia de mutations.
- Versionado optimista.
- Totales calculados y verificados en backend.
- Números de cotización únicos por workspace.
- UTC en timestamps; fechas de documento con timezone del workspace.
- Cursor persistente y detección de cursor obsoleto.

### Rendimiento

Objetivos iniciales para una cuenta de hasta 10.000 entidades:

- Bootstrap inicial menor de 3 segundos en red estable, excluyendo login.
- Pull incremental menor de 500 ms para páginas normales.
- Push confirmado menor de 800 ms en red estable.
- Lotes de 20–50 mutaciones.
- Listas paginadas; no enviar todos los PDFs ni logos en bootstrap.
- Logo y archivos grandes fuera del payload de sync; usar Storage y guardar solo URL estable.

### Disponibilidad

- El usuario puede leer y editar datos locales sin red.
- El servidor debe ser stateless en el runtime; el estado durable vive en MySQL/Storage.
- Retries seguros y observables.
- Health endpoint separado de readiness de base de datos.
- Las migraciones deben ser aditivas, versionadas y ejecutarse fuera del arranque normal si requieren preparación.

## 11. Pruebas obligatorias

### Unitarias

- Cálculo de precio con margen, impuesto y redondeo.
- Recalculo de subtotales, descuentos e impuestos.
- Máquina de estados de cotización.
- Resolución de `baseVersion`.
- Generación y verificación de `mutationId`.
- Idempotencia de create/update/delete.
- Serialización y paginación del cursor.

### Integración

- Dos usuarios del mismo workspace ven el mismo catálogo.
- Dos workspaces no pueden leer datos cruzados aunque manipulen el payload.
- Reintentar la misma mutation no duplica filas.
- Crear offline y reconectar termina en una sola entidad.
- Pull con cursor válido aplica solo cambios nuevos.
- Cursor caducado devuelve `RESET_REQUIRED`.
- Conflicto de cotización muestra versión local y servidor.
- Cambio de rol revoca mutaciones posteriores.
- Primer login importa datos heredados sin duplicarlos.

### E2E móvil

- Login/logout y cambio de workspace.
- Crear cotización sin cliente y sin catálogo.
- Editar una cotización en dos dispositivos.
- Cambiar estado y comprobar la actualización en otro dispositivo.
- Trabajar sin red, cerrar la app, volver a abrir y sincronizar.
- Compartir PDF antes y después de sincronizar.

## 12. Observabilidad y operación

Registrar métricas agregadas:

- Duración de bootstrap, pull y push.
- Tamaño de lotes y número de mutaciones aplicadas, conflictivas y rechazadas.
- Edad máxima del outbox por workspace.
- Conteo de `RESET_REQUIRED`.
- Errores de autorización por código, sin datos sensibles.
- Tiempo de migración heredada y porcentaje completado.

Añadir un `requestId` por llamada tRPC y propagarlo a logs. El panel de diagnóstico de la app debe mostrar solo al usuario: última sincronización, pendientes y estado de conexión. Los detalles técnicos quedan en logs del servidor.

## 13. Plan de entrega por fases

### Fase A — Fundaciones

Crear workspace/memberships, proteger tRPC con workspace, agregar tablas comerciales, migraciones Drizzle, `currencyCode`, IDs estables y repositorios de servidor. No activar todavía la sincronización para todos.

### Fase B — Cliente local y migración

Añadir `expo-sqlite`, esquema local versionado, repositorios, outbox y migrador de `biem-cotiza-state-v1`. Mantener la UI actual detrás de la fachada `useBiem`.

### Fase C — Sync HTTP

Implementar `bootstrap`, `pull`, `push`, cursores, idempotencia, backoff y resolución de conflictos. Activarlo en un workspace de prueba y después con feature flag.

### Fase D — Colaboración

Añadir invitaciones, roles, auditoría y selector de workspace. Incorporar filtros de permisos en todas las pantallas y reportes.

### Fase E — Tiempo real y hardening

Evaluar SSE/WebSocket o notificaciones para cambios importantes, compactación del log, exportación administrativa, alertas y pruebas de carga.

## 14. Criterios de aceptación de la fase

La fase se puede considerar lista cuando:

1. Un usuario autenticado puede crear un workspace y ver únicamente sus datos.
2. Dos dispositivos con la misma cuenta pueden crear y consultar cotizaciones sincronizadas.
3. Dos colaboradores con roles distintos reciben respuestas coherentes con sus permisos.
4. Las operaciones offline se conservan después de cerrar y abrir la app.
5. Reintentos de red no duplican registros.
6. Los conflictos aparecen explícitamente y ninguna cotización aprobada se sobrescribe silenciosamente.
7. Los totales, impuestos, moneda y número de cotización provienen del servidor.
8. La migración desde AsyncStorage es visible, reanudable e idempotente.
9. TypeScript, lint, unitarias, integración y E2E pasan en CI.
10. El sistema puede recuperar un cliente cuyo cursor quedó obsoleto mediante bootstrap completo sin perder sus cambios locales pendientes.

## 15. Decisiones que deben aprobarse antes de implementar

1. **Workspace inicial:** uno por usuario o permitir varios desde la primera versión.
2. **Invitaciones:** por email real en esta fase o solo miembros ya autenticados.
3. **Divisa por defecto:** el estado actual no la persiste; debe definirse antes de migrar importes.
4. **SQLite:** recomendada para la entrega multiusuario; mantener AsyncStorage sería una opción de menor esfuerzo pero con peor atomicidad y recuperación.
5. **Resolución de cotizaciones:** conflicto explícito a nivel de documento, recomendado, frente a merge automático.
6. **Tiempo real:** dejarlo fuera de la primera entrega y sincronizar por foreground/conectividad, recomendado.
