# Migración técnica: Manus → OpenAI Codex

**Proyecto:** BIEM Cotiza
**Base funcional verificada:** `58f3239515028dbd780ac008865d23c9f7b375c8` (`feat: add secure workspace foundation`)
**Objetivo del handoff:** continuar el proyecto en un repositorio privado externo sin reconstruir la aplicación ni transferir secretos o datos de producción.

## 1. Alcance de esta exportación

Esta entrega contiene el código fuente versionado de Expo/React Native, Express, tRPC, Drizzle, migraciones MySQL, pruebas, configuración, recursos visuales y documentación. No contiene:

- credenciales de MySQL;
- cookies, tokens, claves OAuth o claves de Manus;
- datos de la base de datos administrada;
- `node_modules`, cachés de Expo, `.git` dentro del ZIP ni metadatos operativos de Manus;
- una migración de datos reales o una publicación.

El ZIP es suficiente para iniciar un repositorio privado externo. El Git bundle opcional conserva los commits hasta el estado exportado y evita depender del remoto administrado por Manus.

## 2. Estado de Git y GitHub

El proyecto está actualmente en un **repositorio administrado por Manus**, con remoto `origin` de esa plataforma y `git_repository.provider = manus`. No existe una conexión activa a GitHub; el conector GitHub aparece deshabilitado y no se creó ni vinculó ningún repositorio externo durante esta exportación.

### Opción recomendada: crear un repositorio privado desde el ZIP

```bash
unzip biem-cotiza-codex-export-*.zip
cd biem-cotiza

git init -b main
git add .
git commit -m "chore: import BIEM Cotiza from Manus handoff"
git remote add origin https://github.com/TU_ORGANIZACION/biem-cotiza.git
git push -u origin main
```

Crea previamente `TU_ORGANIZACION/biem-cotiza` como repositorio **privado** en GitHub. No pegues tokens en el remoto ni en archivos del proyecto; usa GitHub CLI, SSH o el administrador de credenciales del sistema.

### Opción para conservar el historial completo

```bash
git clone biem-cotiza-58f3239.git.bundle biem-cotiza
git -C biem-cotiza remote add origin https://github.com/TU_ORGANIZACION/biem-cotiza.git
git -C biem-cotiza push -u origin main
```

El Git bundle es un artefacto de solo lectura con el historial local; no contiene las credenciales del remoto administrado.

## 3. Preparación local para Codex

### Requisitos

- Node.js 22+
- Corepack + pnpm 9.12.0
- MySQL 8.0+
- Git
- Un proveedor externo de autenticación antes de habilitar accesos reales

### Instalación

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

No copies un `.env` desde Manus. Rellena `DATABASE_URL`, el secreto de sesión y las variables del proveedor de autenticación externo usando un gestor de secretos local o de hosting.

### Base de datos externa

1. Crea una base vacía, por ejemplo `biem_cotiza`.
2. Crea un usuario de aplicación con privilegios limitados a esa base.
3. Define `DATABASE_URL` en `.env`.
4. Ejecuta:

```bash
pnpm db:push
```

La configuración está en [`../drizzle.config.ts`](../drizzle.config.ts), el modelo completo en [`../drizzle/schema.ts`](../drizzle/schema.ts), las relaciones en [`../drizzle/relations.ts`](../drizzle/relations.ts) y las migraciones en [`../drizzle/`](../drizzle/).

> `pnpm db:push` genera una migración si detecta cambios y ejecuta `drizzle-kit migrate`. Para un equipo, se recomienda separar ambos pasos en scripts de CI antes de producción y revisar el SQL generado antes de aplicarlo.

### Ejecución y controles

```bash
pnpm dev
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm exec expo export --platform web --output-dir dist/web
```

- Expo Web / Metro: `http://localhost:8081`
- API Express: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

## 4. Qué ya está construido

### Experiencia de producto

- Panel de actividad comercial responsive para web, móvil y escritorio.
- Calculadora de precios con costos, gastos, margen, impuesto y precio sugerido.
- Catálogo de productos y servicios reutilizable.
- Clientes, cotización rápida, ítems manuales y de catálogo, descuentos, impuestos, estados, historial y reportes visuales.
- Exportación e impresión de cotizaciones en PDF para web y funciones Expo Print/Sharing para móvil.
- Diseño BIEM claro, responsive, con navegación de escritorio y pestañas móviles.

### Fase 1: seguridad y multi-tenencia

- Tablas Drizzle/MySQL: `users`, `workspaces`, `workspace_members`, `business_profiles`, `workspace_sequences`, `products`, `clients`, `quotes`, `quote_items` y `workspace_audit_events`.
- Aprovisionamiento idempotente de un workspace personal al autenticar una cuenta.
- Rol `owner` y membresías de workspace.
- Contexto tRPC con `user`, `workspace` y `membership`.
- `workspaceProcedure` que exige sesión y membresía activa.
- Guard visual de login obligatorio.
- Cookie de sesión, nonce OAuth y callback para el flujo Manus actual.
- Pruebas de logout, cookies/CORS y protección de workspace.

## 5. Migrar Manus OAuth sin romper workspaces

La implementación actual depende de Manus OAuth. Estos módulos deben sustituirse de forma coordinada:

| Área | Archivos actuales | Acción externa requerida |
|---|---|---|
| Inicio y callback OAuth | `server/_core/oauth.ts`, `constants/oauth.ts`, `app/oauth/callback.tsx` | Reemplazar por la redirección/callback del proveedor OIDC o SDK de autenticación elegido. |
| Validación de identidad | `server/_core/sdk.ts`, `server/_core/env.ts` | Verificar el JWT o sesión del proveedor mediante JWKS/introspección; no confiar en identificadores recibidos desde el cliente. |
| Sesión y cookie | `server/_core/cookies.ts`, `lib/_core/auth.ts` | Usar una cookie firmada `HttpOnly`, `Secure` y `SameSite` adecuada al dominio; mantener soporte de Bearer token solo si también se requiere Expo nativo. |
| Puerta de acceso | `components/auth-gate.tsx`, `app/_layout.tsx` | Mantener la interfaz, cambiando únicamente el cliente de sesión y la acción de iniciar/cerrar sesión. |
| Tipos del proveedor | `server/_core/types/manusTypes.ts` | Eliminar o archivar una vez que ningún módulo los importe. |

### Contrato de identidad recomendado

1. El proveedor devuelve un `subject` estable (OIDC `sub`).
2. El backend resuelve o crea `users` con `openId = subject` durante la primera sesión. Se puede renombrar esa columna mediante una migración futura, pero no es necesario para desbloquear Fase 2.
3. El backend llama `getOrCreatePersonalWorkspace(user)` solo después de validar la identidad.
4. Cada router comercial usa `workspaceProcedure`; obtiene el `workspaceId` desde `ctx.workspace.id`, no desde el request.
5. Toda lectura y mutación filtra/insertar por el `workspaceId` del contexto.
6. Al añadir equipos en el futuro, se selecciona un workspace permitido en servidor y se valida la membresía antes de cambiarlo.

### Proveedores válidos

Se puede adoptar Better Auth, Auth0, Clerk, Supabase Auth o cualquier proveedor OIDC estándar. La decisión debe considerar Expo nativo y el dominio web definitivo. La aplicación no debe continuar llamando a `MANUS_OAUTH_*`, `MANUS_PROJECT_ID` ni `MANUS_JWT_SECRET` después de la sustitución.

## 6. Dependencias exclusivas de Manus

Consulta el detalle completo en [`manus-dependency-inventory.md`](manus-dependency-inventory.md). Las sustituciones prioritarias son:

1. **Autenticación Manus OAuth** → proveedor OIDC/servicio de autenticación externo.
2. **MySQL administrado por Manus** → MySQL gestionado externo con `DATABASE_URL` propia.
3. **Forge Storage** (`BUILT_IN_FORGE_*`, `/manus-storage`) → S3/R2/Supabase Storage/Cloudinary o equivalente.
4. **Forge IA, imagen, voz, Data API, heartbeat y notificaciones** → eliminar si no se usan o sustituir por APIs elegidas y variables propias.
5. **Runtime/Preview de Manus** → variables de origen, hosting, CORS y cookies del proveedor de despliegue.
6. **Metadatos nativos de Manus** en `app.config.ts` y `.manus-starter-init.json` → usar identificadores propios de bundle y esquema deep-link.

## 7. Continuidad de Fase 2

Fase 2 no se inició para no mezclar la exportación con cambios funcionales. Codex debe continuar por este orden:

1. Crear los routers protegidos `products`, `clients`, `quotes`, `business` y `reports` alrededor de `workspaceProcedure`.
2. Llevar las fórmulas de subtotal, descuento, impuestos, total y numeración al servidor, usando transacciones para crear cotizaciones e ítems.
3. Persistir snapshots de nombre, unidad, precio e impuesto en `quote_items`; una edición de catálogo no puede alterar una cotización histórica.
4. Introducir claves de idempotencia para creación de cotizaciones y reintentos de red.
5. Convertir `lib/biem/store.tsx` en una capa de consultas/mutaciones tRPC con invalidación de React Query.
6. Crear una migración voluntaria desde `AsyncStorage`, que muestre el resumen primero, detecte y excluya `initialData` de demostración, sea reanudable y conserve los datos locales hasta verificar la importación.
7. Mantener PDF, historial, dashboard y reportes alimentados por los datos de servidor y los snapshots de cotización.
8. Añadir pruebas de integración para persistencia entre sesiones/navegadores, aislamiento entre workspaces, idempotencia y reanudación de importación.

## 8. Pruebas obligatorias para Fase 2

Antes de declarar Fase 2 completa, automatiza o documenta explícitamente:

- crear cotización, cerrar sesión, volver a entrar y recuperarla;
- acceder desde un segundo navegador con la misma cuenta y ver los mismos datos;
- impedir que un segundo workspace lea o modifique datos ajenos;
- repetir una solicitud de creación y comprobar una sola cotización/número;
- verificar que PDF, historial y total usan el snapshot correcto;
- interrumpir una importación local, reanudarla y no duplicar registros;
- verificar que los datos locales originales no se eliminan hasta confirmar la importación completa.

## 9. Preparación web de producción posterior

Después de completar Fase 2:

1. Separar build estático de Expo Web y API Express en el hosting elegido, o servir ambos desde un contenedor único.
2. Definir `APP_PUBLIC_ORIGIN`, `EXPO_PUBLIC_API_BASE_URL`, CORS, dominio personalizado y cookies seguras para ese dominio.
3. Configurar migraciones en CI/CD como tarea controlada y backups programados del MySQL externo.
4. Mover el logo actual de `files.manuscdn.com` a almacenamiento propio y sustituir `logoUrl` en `app.config.ts`.
5. Cambiar bundle IDs y scheme `manus...` por identificadores propios antes de cualquier build móvil distribuible.
6. Preparar un entorno staging independiente y un piloto privado con cuentas reales.

## 10. Comandos de handoff para Codex

```text
Abre este repositorio de BIEM Cotiza. Conserva Expo Router, React Native Web,
Express, tRPC, Drizzle y el diseño existente. Parte del commit 58f3239 y lee
README.md, docs/manus-to-codex-migration.md y docs/multiuser-sync-architecture.md.
No reconstruyas la interfaz ni reemplaces el modelo de workspaces. Primero sustituye
Manus OAuth por el proveedor externo seleccionado y configura MySQL externo. Luego
implementa Fase 2: routers tRPC con workspaceProcedure para catálogo, clientes,
cotizaciones, snapshots de ítems, idempotencia, reportes y migración voluntaria
reanudable desde AsyncStorage sin importar datos de demostración. Ejecuta TypeScript,
lint y pruebas de integración antes de cada handoff.
```
