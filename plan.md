# Plan de implementación — BIEM Cotiza Fase 1: cuentas privadas y workspaces

## Objetivo

Convertir la aplicación actual en una base segura para lanzamiento web privado, sin reconstruir Expo/React Native ni eliminar el flujo móvil. La fase crea el límite de datos por negocio, exige una sesión válida antes de mostrar la aplicación y prepara el backend para conectar las entidades comerciales a MySQL en la siguiente iteración.

## Alcance de esta fase

1. Añadir tablas MySQL aditivas para `workspaces`, membresías, perfil comercial, productos, clientes, cotizaciones, ítems, secuencias y auditoría.
2. Crear un workspace personal y una membresía `owner` de manera idempotente para cada usuario autenticado.
3. Extender el contexto tRPC con `workspace` y `membership`; añadir `workspaceProcedure` para el acceso futuro a datos comerciales.
4. Exponer `auth.me` y `workspaces.current` con el contexto autenticado para confirmar cuenta y espacio activo.
5. Aplicar autenticación obligatoria en el cliente mediante un guard que muestra login o carga antes de montar las pantallas comerciales.
6. Normalizar la sesión web con la cookie `webdev_app_session`, state/nonce de OAuth de vida corta y cookie segura compatible con Preview.
7. Ejecutar y verificar migraciones Drizzle, tipos, lint y flujos básicos de API.

## Fuera de alcance deliberadamente

- Reemplazar el estado actual de productos/clientes/cotizaciones en AsyncStorage por consultas MySQL en todas las pantallas.
- Migrar silenciosamente los datos locales existentes.
- Invitaciones, roles `editor`/`viewer`, selección de múltiples workspaces y sincronización offline.
- Publicación, dominio, Dockerfile o configuración de tiendas móviles.

## Decisiones técnicas

- **Identidad:** Manus OAuth existente; no se crea contraseña propia.
- **Tenancy:** todas las tablas comerciales llevan `workspaceId`; el servidor, no el cliente, resuelve el workspace mediante la membresía autenticada.
- **Workspace inicial:** uno personal por usuario, identificado de forma idempotente por `personalForUserId`; el modelo deja abierta la colaboración posterior con `workspaceMembers`.
- **Datos financieros:** cantidades monetarias futuras se almacenan como `bigint` en unidad menor y tasas como puntos básicos; la UI actual se conserva hasta conectar los repositorios.
- **Concurrencia:** cada entidad de negocio incorpora `version`, auditoría y borrado lógico para la siguiente fase de sync.
- **Sesión:** la API usa `webdev_app_session`; las operaciones de navegador se validan del lado servidor. No se usa localStorage como prueba de identidad.

## Diseño de guard de acceso

El guard respeta la dirección "Control Comercial Claro": fondo `#F6F9FC`, sello BIEM, tarjeta blanca, azul `#087DBB` para intención y un único CTA visible “Continuar con Manus”. En móvil queda centrado y táctil; en escritorio conserva composición sobria. No cambia la navegación interior ni la identidad visual de la aplicación.

## Estructura

| Módulo | Responsabilidad |
| --- | --- |
| `drizzle/schema.ts` | Tablas y tipos de identidad, tenancy y entidades comerciales. |
| `server/db.ts` | Resolución idempotente del workspace personal y consultas de acceso. |
| `server/_core/context.ts` | Usuario, workspace y membresía autenticados por request. |
| `server/_core/trpc.ts` | `protectedProcedure` y `workspaceProcedure`. |
| `server/routers.ts` | Consulta de sesión y workspace actual. |
| `server/_core/oauth.ts` / `cookies.ts` | Inicio OAuth web, nonce y sesión segura. |
| `components/auth-gate.tsx` | Guard de cuenta obligatoria para web y Expo nativo. |
| `app/_layout.tsx` | Montaje del guard antes de los datos y pantallas comerciales. |
