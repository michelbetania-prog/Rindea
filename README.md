# BIEM Cotiza

> Plataforma Expo/React Native + Express/tRPC/Drizzle para calcular precios, crear cotizaciones y organizar la actividad comercial de emprendedores.

## Estado del handoff

- **Base funcional confirmada:** commit [`58f3239`](#continuidad-desde-el-commit-confirmado) — `feat: add secure workspace foundation`.
- **Fase 1 implementada:** MySQL, usuarios, workspaces personales, membresías, perfil comercial inicial, numeración de cotizaciones, autenticación obligatoria y procedimiento tRPC de workspace.
- **Fase 2 pendiente:** las pantallas comerciales siguen usando `AsyncStorage` como fuente de datos. Aún no se han creado los routers tRPC ni la persistencia MySQL de catálogo, clientes, cotizaciones, historial y reportes.
- **Publicación:** no se publicó esta versión. La exportación no incluye datos, contraseñas ni credenciales.

La guía de transición está en [`docs/manus-to-codex-migration.md`](docs/manus-to-codex-migration.md). El inventario de dependencias exclusivas de Manus está en [`docs/manus-dependency-inventory.md`](docs/manus-dependency-inventory.md).

## Arquitectura actual

```text
app/                 Rutas Expo Router y pantallas React Native/Web
components/          Sistema visual BIEM y puerta de autenticación
lib/                 tRPC cliente, estado comercial local y utilidades financieras
server/              Express, tRPC, autenticación, MySQL y servicios del starter
drizzle/             Esquema Drizzle, relaciones y migraciones MySQL
assets/images/       Iconos, favicon, splash y recursos de marca
shared/              Tipos, constantes y errores compartidos
tests/               Pruebas de cookies, logout y protección de workspace
```

El frontend Expo está diseñado para navegador, Android e iOS. El backend es un proceso Express independiente en el puerto `3000`; Metro/Web se sirve en el puerto `8081` durante desarrollo.

## Requisitos locales

- Node.js **22** o superior
- Corepack y `pnpm` **9.12.0**
- MySQL **8.0** compatible
- Una solución de autenticación externa antes de habilitar logins fuera de Manus; ver [Autenticación](#autenticación-fuera-de-manus)

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

## Instalación desde el ZIP o Git bundle

```bash
# ZIP
unzip biem-cotiza-codex-export-*.zip
cd biem-cotiza

# o, para conservar el historial completo
mkdir biem-cotiza && cd biem-cotiza
git clone ../biem-cotiza-58f3239.git.bundle .
git checkout main

pnpm install --frozen-lockfile
cp .env.example .env
```

Completa **solo** las variables de tu proveedor externo en `.env`; nunca subas ese archivo al repositorio.

## MySQL externo

1. Crea una base de datos y un usuario de aplicación con permisos únicamente sobre esa base.
2. Define `DATABASE_URL` en `.env`, por ejemplo:

```dotenv
DATABASE_URL=mysql://biem_app:CAMBIA_ESTA_CONTRASENA@127.0.0.1:3306/biem_cotiza
```

3. Revisa el esquema en [`drizzle/schema.ts`](drizzle/schema.ts) y las migraciones versionadas en [`drizzle/`](drizzle/).
4. Ejecuta las migraciones existentes contra **una base externa nueva**:

```bash
pnpm db:push
```

`pnpm db:push` ejecuta `drizzle-kit generate && drizzle-kit migrate`. Para cambios futuros, genera y versiona una migración nueva; no edites `0000_elite_eternals.sql` ni `0001_first_apocalypse.sql` después de aplicar una base compartida.

> No copies ni conectes de forma accidental la `DATABASE_URL` administrada por Manus. Esta exportación solo contiene estructura, no datos reales.

## Desarrollo

Una vez configuradas una base MySQL externa y la autenticación externa:

```bash
pnpm dev
```

- Web Expo/Metro: `http://localhost:8081`
- API Express/tRPC: `http://localhost:3000`
- Salud del API: `http://localhost:3000/api/health`

Comandos útiles:

```bash
pnpm check          # TypeScript
pnpm lint           # ESLint de Expo
pnpm test           # Vitest
pnpm build          # Bundle de servidor Express
pnpm exec expo export --platform web --output-dir dist/web
```

## Despliegue web en Vercel

La configuración de `vercel.json` instala con el lockfile y exporta Expo Web a
`dist/web`. En Vercel, selecciona la raíz del repositorio como **Root Directory**
y **Other** como framework. La configuración versionada define el comando de
compilación y el directorio de salida; elimina cualquier override antiguo que
apunte a `public` y vuelve a desplegar el último commit.

El frontend estático se acompaña de una función Vercel en `api/index.ts`
que sirve Express bajo `/api/*`, sin abrir un puerto. Comprueba `/api/health`
después del despliegue: debe devolver JSON con `ok: true`.
Configura `APP_PUBLIC_ORIGIN` con el origen HTTPS exacto de la web (sin barra
final) para CORS y la redirección posterior al login. Deja
`EXPO_PUBLIC_API_BASE_URL` sin definir para usar el API del mismo dominio;
si despliegas el API por separado, define esta variable antes de compilar.
El login usa Supabase Auth y requiere un secreto de sesión y MySQL;
publicar el API no sustituye esos requisitos. Introduce las
credenciales en las variables de entorno de Vercel, nunca en Git.

## Autenticación fuera de Manus

El acceso web usa **Supabase Auth** con correo y contraseña, confirmación de
correo y una sesión propia de una hora en cookie HttpOnly. El backend verifica
la identidad contra Supabase y guarda `supabase:<id>` en `users.openId`, después
aprovisiona el workspace antes de emitir la cookie. Los endpoints de Manus solo
se registran con `AUTH_PROVIDER=manus` para compatibilidad con la exportación.
La nueva pantalla web no utiliza ese flujo.

Sigue [Configurar cuentas reales](docs/account-setup.md) para crear los servicios,
aplicar las migraciones existentes y configurar Vercel. Sin esos servicios el
acceso devuelve un error de configuración y no crea una sesión. Esta integración
web requiere validación contra tus servicios reales antes de considerarse lista.

Los datos comerciales siguen en el navegador, ahora separados por workspace.
Los datos anteriores de `biem-cotiza-state-v1` se conservan, sin importarlos
automáticamente en una cuenta. La sincronización de catálogo, clientes y
cotizaciones con MySQL sigue pendiente de Fase 2. La autenticación nativa de
Expo requiere una adaptación posterior; este cambio prepara el acceso web.

La regla que debe preservarse es:

1. validar la sesión del proveedor en el backend;
2. mapear el identificador estable del proveedor al campo `users.openId` o a un nuevo `externalSubject`;
3. resolver la membresía en `workspaceMembers` en **cada** procedimiento tRPC comercial;
4. filtrar siempre por `workspaceId` impuesto por el servidor, nunca por un ID enviado por el cliente.

## Continuidad desde el commit confirmado

```bash
git log --oneline --all
git checkout 58f3239
```

El commit `58f3239` contiene la última mejora funcional confirmada de Fase 1. Los commits posteriores de handoff añaden documentación y corrigen una compatibilidad de tipos de Expo Router detectada al instalar el proyecto desde cero; no modifican la lógica comercial ni los datos.

Para empezar Fase 2 en Codex:

1. Lee `docs/manus-to-codex-migration.md` y `docs/multiuser-sync-architecture.md`.
2. Configura Supabase Auth y MySQL externo en un entorno aislado.
3. Implementa repositorios y routers tRPC por workspace para productos, clientes, cotizaciones, ítems y perfil comercial.
4. Cambia `lib/biem/store.tsx` para que consulte y mutacione el API, conservando `AsyncStorage` únicamente como fuente de migración voluntaria y respaldo local temporal.
5. Implementa la vista previa, importación idempotente y reanudable de datos locales sin importar las muestras `initialData`.
6. Completa las pruebas de aislamiento entre workspaces, idempotencia de cotizaciones y persistencia entre navegadores.

## Exportación reproducible

El script [`scripts/create-codex-export.sh`](scripts/create-codex-export.sh) genera dos artefactos desde un commit limpio:

- un ZIP de código fuente sin `.git`, `node_modules`, `.expo` ni variables de entorno;
- un Git bundle que conserva todo el historial versionado y no contiene credenciales de transporte.

```bash
bash scripts/create-codex-export.sh ../export-biem-cotiza
```

## Seguridad básica para el repositorio privado

- Mantén `.env` fuera de Git; el `.env.example` solo admite marcadores de posición.
- Rota y define fuera del código el secreto de sesión, la URL de MySQL y las claves de proveedores.
- Conserva MySQL en una red privada, con TLS cuando el proveedor lo permita, y copias de seguridad verificables.
- Antes de desplegar, configura cookies `HttpOnly`, `Secure` y `SameSite` conforme al dominio final y habilita CORS solo para los orígenes web autorizados.
- Revisa la matriz de sustituciones de Manus antes de exponer rutas de almacenamiento, IA, voz o notificaciones.

## Licencia y propiedad

No se añadió una licencia pública. Al crear el repositorio de destino, configúralo como **privado** y define la licencia y propiedad intelectual que correspondan al negocio.
