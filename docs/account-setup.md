# Configurar cuentas reales

La integración web de registro/login está preparada para Supabase Auth y PostgreSQL de Supabase.
El proyecto Supabase ya se seleccionó; falta configurar la conexión SQL y la sesión. No existe acceso de invitado.

El proyecto Supabase seleccionado es `hmdqdqwmxxivzaijkvzt`, con URL
`https://hmdqdqwmxxivzaijkvzt.supabase.co`. Su configuración pública se guarda
en el `.env` local ignorado por Git y en el borrador del entorno de Codex.
Vercel requiere configurar sus propias variables; el `.env` local no se sube.
También se aceptan los nombres `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como alternativas en el backend.
Los helpers `next/headers`, `next/server` y `@supabase/ssr` del tutorial de
Next.js no se utilizan en este proyecto Expo/Express: el backend ya consume
Supabase Auth por HTTPS y emite la cookie de sesión del proyecto.

1. Abre tu proyecto en [Supabase](https://supabase.com/dashboard).
   Activa el proveedor Email y conserva la confirmación de correo habilitada.
   En URL Configuration define Site URL y el redirect permitido como
   `https://cost-five-cyan.vercel.app` (o tu dominio definitivo).
   Obtén la URL del proyecto y su clave **publishable** o **anon**.
   No uses una clave service_role o secret: la aplicación no la necesita.
   Configura SMTP para envíos fiables; el correo integrado de Supabase tiene
   restricciones de destinatarios y cuotas que pueden impedir registros reales.
2. En **Connect → Transaction pooler**, copia la conexión PostgreSQL de ese
   proyecto y sustituye la contraseña de la base en tu gestor de secretos.
   Guarda la URL completa como `DATABASE_URL`; esta conexión es sensible y no
   puede obtenerse usando la clave pública de Auth. Usa `sslmode=verify-full`.
   El backend usa TLS verificado y `prepare: false` para el pooler. Si el
   certificado requiere una CA adicional, instala la CA oficial y configura
   `PGSSLROOTCERT`; nunca desactives la verificación de certificados.
3. En Vercel, configura estas variables para Production (y valores separados
   para Preview si vas a probarlo):

   | Variable | Valor |
   | --- | --- |
   | `AUTH_PROVIDER` | `supabase` |
   | `SUPABASE_URL` | URL HTTPS de tu proyecto |
   | `SUPABASE_PUBLISHABLE_KEY` | Clave publishable o anon |
   | `DATABASE_URL` | URL PostgreSQL del pooler de Supabase; valor sensible |
   | `JWT_SECRET` | Secreto aleatorio de al menos 32 bytes; valor sensible |
   | `APP_PUBLIC_ORIGIN` | `https://cost-five-cyan.vercel.app`, sin barra final |

   Deja `EXPO_PUBLIC_API_BASE_URL` sin definir para usar el API del mismo dominio.
   Nunca coloques credenciales PostgreSQL ni el secreto de sesión en variables
   `EXPO_PUBLIC_*`, Git o el chat. Genera el secreto en tu gestor de contraseñas
   y guárdalo directamente en las variables sensibles de Vercel.
4. Aplica las migraciones versionadas a la base **nueva** desde el checkout con
   `DATABASE_URL` configurada de forma segura en el proceso o en un `.env` local
   ignorado por Git:

   ```bash
   pnpm db:migrate
   ```

   Este comando aplica las migraciones nuevas de `drizzle/postgres/`; no genera
   ni modifica SQL. Conserva las migraciones MySQL históricas sin ejecutarlas.
   Las tablas se crean en el esquema privado `biem` con RLS habilitado. Usa una
   conexión de backend propietaria del esquema (la conexión del pooler indicada
   por Supabase); no expongas `biem` en el Data API ni uses la clave pública para
   consultar directamente las tablas.
   No lo ejecutes contra una base de producción compartida sin revisar el destino.
5. Despliega el último commit. Verifica que `/api/health` responde con `ok: true`.
   Crea una cuenta, confirma el correo y vuelve a la web para iniciar sesión con
   correo y contraseña. Una respuesta 503 en login indica que faltan servicios
   o que no se pudo crear el workspace; un 404 indica un problema de despliegue.
6. Prueba cerrar sesión, volver a entrar y entrar con una segunda cuenta.
   No debería poder reutilizar una sesión de otra aplicación ni ver datos
   guardados por otro workspace. Las sesiones caducan en una hora y requieren
   volver a iniciar sesión. No hay renovación automática ni recuperación de
   contraseña en la interfaz todavía; la revocación de una cuenta en Supabase
   no invalida de inmediato una cookie ya emitida, que caduca en hasta una hora.

Las pruebas de autenticación sustituyen Supabase con dobles controlados.
La suite PostgreSQL se validó con PostgreSQL 17 local, incluyendo migraciones,
upserts, logins concurrentes y aislamiento de workspaces. Esto no demuestra
entrega real de correo, conexión al proyecto Supabase ni login en Vercel.
Estos controles deben ejecutarse después de configurar los servicios.

Los datos comerciales se conservan localmente por workspace, sin sincronización
entre navegadores. El antiguo almacenamiento sin cuenta no se borra ni se importa
automáticamente. La persistencia comercial PostgreSQL sigue pendiente de Fase 2.

Para probar en Codex, declara las mismas variables en la configuración del
entorno. `JWT_SECRET` y `DATABASE_URL` requieren valores reales en el proceso,
no placeholders de secretos sustituidos solo por un proxy HTTPS. Autoriza el
hostname HTTPS de tu proyecto Supabase y verifica la conectividad PostgreSQL antes
de intentar el login. No reutilices bases ni credenciales de Manus.
