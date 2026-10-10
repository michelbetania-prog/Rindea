# BIEM Cotiza — Próximos pasos para conectar la siguiente fase y lanzar

## Decisión principal

No conviene intentar sincronización multiusuario, tiempo real, invitaciones, pagos y una app móvil publicada en una sola entrega. El lanzamiento debe dividirse en dos objetivos:

1. **Lanzamiento operativo inicial:** una versión estable para que Mariana y un grupo pequeño de negocios creen, guarden, exporten y compartan cotizaciones con datos sincronizados en la nube.
2. **Colaboración multiusuario:** invitaciones, roles, conflictos, múltiples dispositivos y sincronización offline avanzada.

La prioridad de negocio es validar que las personas crean y envían cotizaciones; la prioridad técnica es que sus datos no se pierdan ni se mezclen entre negocios.

## Qué está listo hoy y qué falta

### Ya existe

- Aplicación Expo/React Native responsive.
- Dashboard, cotización rápida, historial, clientes, catálogo y reportes.
- Cálculo de precios, descuentos, impuestos, PDF y compartir.
- Backend Express + tRPC iniciado.
- Manus OAuth disponible en el proyecto.
- MySQL administrado habilitado.
- Preview funcional en móvil y escritorio.

### Todavía no debe considerarse listo para producción multiusuario

- Los datos comerciales aún viven principalmente en `AsyncStorage`.
- La base de datos solo tiene el modelo de usuarios del starter.
- No existe todavía `workspace` ni membresías.
- No hay protección completa por tenant para productos, clientes y cotizaciones.
- No hay sincronización incremental ni outbox offline.
- La numeración de cotizaciones todavía depende de datos locales.
- No hay flujo productivo de invitaciones ni roles.
- El proyecto está con publicación automática desactivada; el preview no equivale a lanzamiento.

## Ruta recomendada de conexión

```text
UI actual
  ↓
useBiem / repositorios de dominio
  ↓
SQLite local + outbox de mutaciones
  ↓
sync-engine: bootstrap / pull / push
  ↓
tRPC protegido por Manus OAuth
  ↓
services de dominio + permisos
  ↓
Drizzle / MySQL administrado
```

La UI no debe llamar SQL ni endpoints directamente. Se conserva `useBiem` como fachada para no reescribir todas las pantallas de una vez.

## Fase 0 — Decisiones y preparación

**Duración sugerida:** 1–2 días.

Antes de programar, cerrar estas decisiones:

| Decisión | Recomendación |
| --- | --- |
| Primer lanzamiento | Un workspace por negocio; permitir varios más adelante |
| Proveedor de login | Manus OAuth, sin crear email/contraseña propia |
| Divisa | Añadir `currencyCode` antes de migrar importes |
| Datos offline | `expo-sqlite`; AsyncStorage solo para preferencias |
| Tiempo real | No incluirlo en el primer lanzamiento; sincronizar al iniciar, recuperar red y volver a foreground |
| Conflictos | Conflicto explícito para cotizaciones; merge por campo para clientes/productos |
| Invitaciones | Después de validar el flujo de un solo propietario |
| Publicación | Lanzamiento controlado primero, no publicación pública masiva |

**Salida de la fase:** decisiones aprobadas, entorno de staging identificado y criterios de aceptación firmados.

## Fase 1 — Backend mínimo seguro

**Objetivo:** que una cuenta autenticada pueda guardar su negocio y sus cotizaciones en la nube sin mezclar datos.

### Trabajo técnico

1. Extender `drizzle/schema.ts` con:
   - `workspaces`.
   - `workspaceMembers`.
   - `businessProfiles`.
   - `products`.
   - `clients`.
   - `quotes`.
   - `quoteItems`.
   - `workspaceSequences`.
   - Versiones, auditoría y `deletedAt`.
2. Añadir migración Drizzle revisada. La base administrada es compartida entre desarrollo y publicación: no ejecutar DDL destructivo.
3. Crear `protectedProcedure` y `workspaceProcedure` en `server/_core/trpc.ts`.
4. Crear services separados para workspace, negocio, productos, clientes y cotizaciones.
5. Crear routers tRPC:
   - `auth.me`.
   - `workspaces.current`.
   - `business.get/update`.
   - `products.list/upsert/delete`.
   - `clients.list/upsert/delete`.
   - `quotes.list/get/create/update/updateStatus`.
6. Validar todos los payloads con Zod.
7. Mover el cálculo de totales al servidor y usar importes enteros en unidad menor o `DECIMAL`; no usar `float`.
8. Hacer que el número visible de cotización se asigne en una transacción con `workspaceSequences`.
9. Añadir paginación a historial, clientes y catálogo.

### Puerta de salida

No avanzar si dos usuarios pueden leer datos cruzados, si un usuario puede enviar un `workspaceId` ajeno, o si dos creaciones concurrentes generan el mismo número de cotización.

## Fase 2 — Cliente local sincronizable

**Objetivo:** conservar la experiencia rápida y permitir trabajo sin red.

### Trabajo técnico

1. Instalar y configurar `expo-sqlite`.
2. Crear migraciones locales versionadas.
3. Crear repositorios locales para `business`, `products`, `clients`, `quotes` y `quoteItems`.
4. Crear `sync_metadata` con `workspaceId`, `cursor`, `lastSyncAt`, `deviceId` y `schemaVersion`.
5. Crear `sync_outbox` con `mutationId`, `entityId`, `baseVersion`, payload y estado de reintento.
6. Adaptar `useBiem` para que lea del repositorio local y mantenga la misma API que las pantallas actuales.
7. Mantener AsyncStorage únicamente para preferencias y respaldo temporal.
8. Añadir estados de UI: “Sincronizado”, “Sin conexión”, “Sincronizando”, “N cambios pendientes” y “Revisión necesaria”.

### Puerta de salida

Crear una cotización en modo avión, cerrar la aplicación, abrirla nuevamente y comprobar que sigue disponible en el dispositivo.

## Fase 3 — Motor de sincronización

**Objetivo:** replicar cambios sin duplicados ni pérdidas.

### API

Implementar en `server/routers/sync.router.ts`:

- `sync.bootstrap` para descargar el estado inicial.
- `sync.pull` para descargar cambios desde un cursor.
- `sync.push` para enviar lotes idempotentes.
- `sync.resolveConflict` para confirmar la decisión del usuario.

Implementar en `lib/biem/sync-engine.ts`:

1. Login o selección de workspace.
2. Bootstrap si no hay cursor local.
3. Pull antes de push.
4. Push de 20–50 mutaciones.
5. Confirmación local solo después de respuesta del servidor.
6. Reintentos con backoff y jitter.
7. Detención segura si aparece un conflicto.
8. Bootstrap completo cuando el servidor responda `RESET_REQUIRED`.

### Reglas de conflicto

- Productos, clientes y perfil: merge por campos que no colisionan.
- Cotizaciones en borrador: mostrar versión local y versión servidor.
- Cotizaciones enviadas, aprobadas o completadas: nunca sobrescribir silenciosamente.
- Estados terminales: `Completada` y `Cancelada` requieren acción administrativa para cambiarse.
- El servidor siempre devuelve la versión canónica y los totales recalculados.

### Puerta de salida

Repetir la misma mutation diez veces no debe duplicar una entidad. Dos dispositivos deben ver el mismo cambio después de sincronizar. Una mutación con `baseVersion` antiguo debe producir un conflicto visible y recuperable.

## Fase 4 — Migración de datos existentes

**Objetivo:** no perder lo que hoy existe en el dispositivo.

1. Leer `biem-cotiza-state-v1` sin borrarlo.
2. Detectar datos que coincidan con la semilla de demostración.
3. Mostrar al usuario un resumen de lo que se puede importar.
4. Permitir Importar, No importar o hacerlo más tarde.
5. Convertir IDs locales a IDs estables y guardar `legacyKey`.
6. Subir perfil, catálogo, clientes y cotizaciones con un `migrationId` idempotente.
7. Mantener respaldo local hasta que el servidor confirme todo.
8. Si el proceso se interrumpe, reanudarlo sin duplicar registros.

**Importante:** no ejecutar una migración silenciosa que reemplace el estado local con el bootstrap remoto.

## Fase 5 — Prueba piloto cerrada

**Objetivo:** validar comportamiento real antes de publicar para todos.

### Grupo recomendado

- 3–5 negocios.
- 1 propietario por negocio al principio.
- 2 dispositivos por negocio.
- 20–50 cotizaciones reales por cuenta.
- Al menos una semana de uso.

### Medir

- Cotizaciones creadas por negocio.
- Cotizaciones enviadas.
- Tiempo de creación.
- Errores de sincronización.
- Registros pendientes durante más de 10 minutos.
- Conflictos por cuenta.
- Fallos de PDF/compartición.
- Usuarios que abandonan antes de enviar la primera cotización.

No invertir todavía en tiempo real ni en personalizaciones complejas si el piloto no demuestra que el flujo crear → enviar se utiliza.

## Fase 6 — Colaboración multiusuario

Después de validar el propietario único:

1. Añadir `workspaceInvites`.
2. Crear invitaciones con token hash, expiración y uso único.
3. Añadir gestión de miembros y roles.
4. Filtrar acciones por rol en backend y UI.
5. Añadir auditoría de cambios sensibles.
6. Añadir selector de workspace si una cuenta pertenece a más de uno.
7. Añadir reportes por workspace y, si aplica, por usuario creador.
8. Incorporar notificaciones o tiempo real solo para eventos que tengan valor claro: cotización aprobada, cambio de estado o invitación.

## Requisitos para el lanzamiento

### Bloqueadores técnicos

No lanzar si ocurre cualquiera de estos casos:

- Se pueden consultar datos de otro workspace.
- El usuario puede perder una cotización al cerrar la app durante una sincronización.
- Se duplican cotizaciones o números visibles.
- Las cotizaciones históricas cambian al editar un producto del catálogo.
- El servidor acepta totales, permisos o workspace sin validarlos.
- No hay forma de recuperar un conflicto.
- El PDF muestra datos incompletos o inseguros.
- No existe una ruta de migración para el estado local actual.

### Requisitos de publicación

- Build reproducible con dependencias instaladas desde lockfile.
- `pnpm check`, `pnpm lint`, unitarias y pruebas de integración en verde.
- Migraciones Drizzle revisadas y aplicadas en el orden correcto.
- Health/readiness del API.
- Logs con `requestId`, sin datos sensibles.
- Política de privacidad y términos de uso.
- Canal de soporte para reportar errores.
- Copias/exportación de datos operativa antes de incorporar datos reales.
- App Store/Google Play: bundle IDs, iconos, splash, permisos, privacidad y builds firmadas.
- Página de lanzamiento o enlace de instalación para el piloto.

## Orden de trabajo por impacto

### Prioridad 1 — imprescindible

1. Proteger workspace y permisos.
2. Persistir en MySQL los datos comerciales.
3. Corregir numeración y cálculos en servidor.
4. Crear migración segura desde AsyncStorage.
5. Implementar bootstrap/pull/push idempotente.
6. Probar offline, reconexión y aislamiento de datos.
7. Lanzar piloto privado.

### Prioridad 2 — necesaria para colaboración

1. Invitaciones.
2. Roles y gestión de miembros.
3. Resolución visual de conflictos.
4. Auditoría.
5. Reportes por workspace.

### Prioridad 3 — diferible

1. WebSocket o tiempo real completo.
2. Notificaciones avanzadas.
3. Facturación y suscripciones.
4. Integración directa con WhatsApp Business API.
5. Automatizaciones complejas.
6. Personalización profunda de permisos.

## Qué no hacer todavía

No reconstruir la interfaz desde cero, no reemplazar tRPC por otro transporte, no añadir una base externa mientras MySQL administrado esté disponible, no crear login propio, no habilitar publicación automática sin revisar el piloto y no invertir en funciones secundarias antes de medir cotizaciones enviadas.

## Checklist de lanzamiento

- [ ] Workspace y membresías implementados.
- [ ] Datos comerciales en MySQL.
- [ ] Permisos comprobados en servidor.
- [ ] SQLite local y outbox funcionando.
- [ ] Bootstrap/pull/push implementados.
- [ ] Conflictos visibles y recuperables.
- [ ] Migración desde AsyncStorage probada.
- [ ] Totales, moneda y números canónicos en servidor.
- [ ] Pruebas unitarias, integración y E2E en verde.
- [ ] Piloto con negocios reales completado.
- [ ] Errores críticos resueltos.
- [ ] Política de privacidad, términos y soporte disponibles.
- [ ] Build móvil firmada y revisada.
- [ ] Publicación controlada autorizada.
