# Inventario de dependencias de Manus

Este documento identifica los acoplamientos presentes en el snapshot de BIEM Cotiza basado en el commit `58f3239`. No elimina ni sustituye código: sirve para planificar una transición controlada a infraestructura externa.

## Resumen ejecutivo

| Área | Estado actual | Bloquea ejecución externa | Sustitución sugerida |
|---|---|---:|---|
| Autenticación | Manus OAuth, JWT y cookie de Preview | Sí | OIDC externo / Better Auth / Auth0 / Clerk / Supabase Auth |
| MySQL | `DATABASE_URL` inyectada por Manus | Sí para datos y login | MySQL 8 gestionado externo + secreto propio |
| Almacenamiento | Forge Storage y `/manus-storage/*` | Solo si se usa upload/archivo | S3, Cloudflare R2, Supabase Storage o Cloudinary |
| IA / imágenes / voz / Data API | Helpers Forge del starter | No para BIEM actual | Eliminar si no se usa o integrar proveedor elegido |
| Preview/runtime | URLs y variables Expo de Manus | No para el código de negocio | Vite/Expo/hosting propio, orígenes públicos propios |
| Metadatos móviles | Bundle ID, scheme y logo bajo Manus | Sí para builds móviles propios | IDs, scheme y assets alojados por el negocio |
| Repositorio | Origen Git administrado por Manus | No para el ZIP/bundle | Repositorio GitHub privado propio |

## 1. Autenticación e identidad

### Variables actuales

| Variable | Archivo(s) | Uso |
|---|---|---|
| `MANUS_PROJECT_ID` | `server/_core/env.ts`, `app.config.ts`, `scripts/load-env.js` | Identificador de cliente OAuth y `appId` de sesión. |
| `MANUS_JWT_SECRET` | `server/_core/env.ts`, `server/_core/sdk.ts` | Firma/verificación JWT de sesión. |
| `MANUS_OAUTH_PORTAL_URL` | `server/_core/env.ts`, `app.config.ts`, `constants/oauth.ts` | Redirección al portal de inicio de sesión. |
| `MANUS_OAUTH_API_URL` | `server/_core/env.ts`, `server/_core/sdk.ts`, `app.config.ts` | Intercambio de token y perfil de usuario. |
| `EXPO_PACKAGER_PROXY_URL`, `EXPO_WEB_PREVIEW_URL` | `server/_core/cors.ts`, `server/_core/cookies.ts`, `server/_core/oauth.ts`, pruebas | Compatibilidad con Preview de Manus. |

### Archivos acoplados

- `server/_core/oauth.ts`
- `server/_core/sdk.ts`
- `server/_core/cookies.ts`
- `server/_core/context.ts`
- `constants/oauth.ts`
- `lib/_core/auth.ts`
- `components/auth-gate.tsx`
- `app/oauth/callback.tsx`
- `server/_core/types/manusTypes.ts`
- `scripts/load-env.js`

### Sustitución

1. Elegir un proveedor de identidad compatible con navegador y Expo nativo.
2. Sustituir `/api/oauth/start` y `/api/oauth/callback` por sus rutas/SDK.
3. Validar el token solo en backend y extraer un `subject` estable.
4. Mapear ese `subject` a `users.openId`; `workspaces` y `workspace_members` se mantienen sin cambios.
5. Mantener `workspaceProcedure` como frontera obligatoria para todos los routers comerciales.
6. Mantener cookies `HttpOnly`, `Secure` y configurar `SameSite` para el dominio final. Retirar la excepción específica de `webdev_app_session` cuando ya no se utilice Preview de Manus.

## 2. Base de datos administrada

| Elemento | Archivo(s) | Sustitución |
|---|---|---|
| `DATABASE_URL` / `DRIZZLE_DATABASE_URL` | `server/db.ts`, `drizzle.config.ts` | Usar `DATABASE_URL` en un gestor de secretos externo. |
| MySQL compartido de Manus | Infraestructura de plataforma | Crear MySQL 8 externo con backups, TLS y entornos separados para staging/producción. |

El esquema y las migraciones son portables porque usan `drizzle-orm`, `mysql2` y `drizzle-kit`. No se deben copiar datos desde la base administrada sin una autorización separada, exportación controlada y evaluación de privacidad.

## 3. Almacenamiento Forge

| Elemento | Archivo(s) | Dependencia |
|---|---|---|
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | `server/_core/env.ts`, `server/storage.ts`, `server/_core/storageProxy.ts` | Presigned URLs y proxy de assets. |
| Ruta `/manus-storage/*` | `server/_core/storageProxy.ts` | Redirección hacia objetos guardados por Forge. |
| URL de logo Manus CDN | `app.config.ts`, `lib/biem/store.tsx` | Activo visual actual alojado en `files.manuscdn.com`. |

**Sustitución:** implementar un adaptador de objeto compatible con S3/R2 y conservar una interfaz `put/get/signedUrl`, o usar el SDK del proveedor elegido. El acceso debe validar `workspaceId` cuando se almacenen documentos o logos de usuarios. Copiar el logo actual a un bucket propio antes de retirar el origen Manus.

## 4. Servicios Forge no requeridos por BIEM hoy

Los módulos siguientes proceden del starter. No se observan rutas de producto BIEM que dependan de ellos en la Fase 1, pero siguen formando parte del código fuente:

| Módulo | Dependencia | Decisión al migrar |
|---|---|---|
| `server/_core/llm.ts` | Forge/OpenAI compatible | Eliminar si no se usará IA, o inyectar `OPENAI_API_KEY`/proveedor propio solo en backend. |
| `server/_core/imageGeneration.ts` | Forge Images | Sustituir por proveedor de imágenes o eliminar. |
| `server/_core/voiceTranscription.ts` | Forge Speech | Sustituir por proveedor de transcripción o eliminar. |
| `server/_core/dataApi.ts` | Forge Data API | Eliminar o integrar fuente externa. |
| `server/_core/heartbeat.ts` | Forge API, headers Manus | Eliminar si no se usa monitorización específica. |
| `server/_core/notification.ts` | Servicios de plataforma | Reemplazar por correo/notificaciones propios si se habilita esa función. |

Antes de eliminar alguno, realizar una búsqueda de importaciones y ejecutar pruebas. Ninguno debe configurarse con credenciales de Manus fuera de la plataforma.

## 5. Runtime, Preview y metadatos Expo

| Elemento | Archivo(s) | Acción externa |
|---|---|---|
| `lib/_core/manus-runtime.ts` | `app/_layout.tsx` | Revisar si solo aporta safe-area/preview. Sustituir por la API estándar del dispositivo si procede. |
| `EXPO_USE_METRO_WORKSPACE_ROOT`, `EXPO_PORT` | `package.json` | Opcionales para Metro local; no representan un servicio de Manus. |
| `space.manus...` y scheme `manus...` | `app.config.ts`, `constants/oauth.ts` | Cambiar a identificadores propios antes de distribuir builds móviles. |
| `.manus-starter-init.json` | Raíz | No se necesita fuera de Manus; el script de exportación lo excluye. |
| `logoUrl` CDN Manus | `app.config.ts` | Alojamiento propio HTTPS. |

## 6. Repositorio y despliegue

| Elemento | Estado | Acción externa |
|---|---|---|
| `origin` actual | Repositorio administrado por Manus | Crear repositorio GitHub privado e importar ZIP/Git bundle. |
| `publishing.auto_publish` | `false` | No cambia durante el handoff. |
| Preview, puertos y origen público | Runtime Manus | Elegir host (Railway, Render, Fly.io, AWS, GCP, Vercel + API, etc.) y definir dominios propios. |

## 7. Variables externas mínimas posteriores

```dotenv
DATABASE_URL=mysql://USUARIO:CONTRASENA@HOST:3306/biem_cotiza
APP_PUBLIC_ORIGIN=https://app.tu-dominio.com
EXPO_PUBLIC_API_BASE_URL=https://api.tu-dominio.com
JWT_SECRET=secreto-servidor-largo-y-aleatorio
AUTH_PROVIDER=nombre-del-proveedor
AUTH_ISSUER_URL=https://issuer.example.com
AUTH_CLIENT_ID=...
AUTH_CLIENT_SECRET=...
```

Los nombres exactos de autenticación cambian con el proveedor elegido. No expongas `AUTH_CLIENT_SECRET`, `JWT_SECRET`, claves de almacenamiento ni `DATABASE_URL` en Expo `extra`, variables `EXPO_PUBLIC_*` ni bundles web.

## 8. Riesgos y orden de sustitución

1. Crear una rama de migración externa y una base MySQL vacía.
2. Sustituir autenticación y comprobar sesiones con dos usuarios de prueba.
3. Validar `workspaceProcedure` y aislamiento antes de crear routers comerciales.
4. Sustituir almacenamiento solo si se habilitan uploads, PDFs almacenados o logos administrados.
5. Retirar módulos Forge no usados tras una revisión de imports y pruebas.
6. Cambiar configuraciones de Expo, dominio, CORS y cookies para producción.
7. Configurar backups y monitorización en el proveedor elegido antes del piloto.
