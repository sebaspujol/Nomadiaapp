# Nomadia 🗺️
### Encontrá tu espacio de trabajo ideal, en cualquier ciudad

---

## Deploy completo en ~30 minutos (sin saber programar)

Necesitás crear 4 cuentas gratuitas: GitHub, Supabase, Google Cloud (solo para el login con Gmail —
el mapa, la búsqueda de ciudad y la búsqueda de lugares ya no usan Google, usan OpenStreetMap,
gratis y sin API key), Vercel.

---

## PASO 1 — GitHub (subir el código)

1. Entrá a github.com → creá cuenta → verificá el email
2. Hacé clic en "New repository" → nombre: nomadia · Private → "Create repository"
3. Tocá "uploading an existing file" → arrastrá TODOS los archivos del ZIP → "Commit changes"

---

## PASO 2 — Base de datos con Supabase (gratis)

1. Entrá a supabase.com → "Start your project" → creá cuenta con GitHub
2. "New project" → nombre: nomadia → región: West EU (Ireland) → generá contraseña (guardala)
3. Esperá ~2 minutos
4. Settings → Database → Connection string → URI → copiá ese string

---

## PASO 3 — Google Cloud (solo para "iniciar sesión con Google")

Esto ya no tiene nada que ver con mapas ni con lugares — es únicamente para que la gente pueda
loguearse con su cuenta de Gmail en vez de crear una contraseña. Es gratis y no requiere tarjeta.

1. console.cloud.google.com → New Project → nombre: nomadia
2. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Web application
3. Authorized redirect URIs: `https://TU-APP.vercel.app/api/auth/callback/google`
4. Copiá el Client ID y el Client Secret

(Si preferís no lidiar con esto todavía, la app funciona igual solo con el login de
email/contraseña — el botón de Google es un extra, no un requisito.)

---

## PASO 4 — Deploy en Vercel

1. vercel.com → Sign up con GitHub → New Project → repo nomadia → Import
2. Environment Variables — agregá estas:

DATABASE_URL          = string de Supabase
NEXTAUTH_SECRET       = cualquier texto largo random
NEXTAUTH_URL          = https://nomadia.vercel.app
GOOGLE_CLIENT_ID      = del paso 3 (opcional, solo si querés el botón de login con Google)
GOOGLE_CLIENT_SECRET  = del paso 3 (opcional, idem)
ANTHROPIC_API_KEY     = de platform.anthropic.com
ADMIN_EMAILS          = spujol@riamoneytransfer.com (tu email de login, separá con comas si sumás más admins)

3. Deploy → en 2-3 minutos tenés URL tipo nomadia.vercel.app

### Paso 4b — Crear tablas en la base de datos
En tu computadora: instalá Node.js → abrí la carpeta del proyecto → corré:

```
npm install
npx prisma db push
```

### Paso 4c — Precargar Madrid y Buenos Aires (para el lanzamiento friends & family)
El resto del mundo se carga solo, la primera vez que alguien busca esa zona (import bajo demanda
desde OpenStreetMap, gratis). Para que Madrid y Buenos Aires ya tengan datos desde el primer día,
corré localmente (con tu `.env.local` configurado con las mismas variables de arriba):

```
npm run seed:madrid
npm run seed:buenosaires
```

---

## PASO 5 — Tu dashboard de métricas

Una vez logueado en la app con el mismo email que pusiste en `ADMIN_EMAILS`, vas a ver un ícono
extra al lado de tu avatar (arriba a la derecha) que te lleva a `/admin`. Ahí ves: usuarios nuevos
(totales, últimos 7 y 30 días), locales nuevos, check-ins activos ahora mismo, reviews, puntos
otorgados en total, un top 10 de locales mejor puntuados, tus usuarios más activos, y el desglose
de locales por tipo / origen (Google vs. comunidad) / ciudad. Nadie más que los emails en
`ADMIN_EMAILS` puede entrar ahí, aunque conozcan la URL.

Si en algún momento querés sumar a alguien más de tu equipo, agregale el email a la variable
`ADMIN_EMAILS` en Vercel (Project → Settings → Environment Variables) separado por comas y
redeployá.

---

## Cómo subir cambios después del primer deploy

Una vez que ya hiciste el deploy inicial (pasos 1 a 4), subir una actualización — como esta, con
el dashboard nuevo — es mucho más simple, no hace falta repetir todo:

1. Bajá el ZIP nuevo que te mandé y descomprimilo.
2. Entrá a tu repo en GitHub → arrastrá y reemplazá los archivos que cambiaron (o subí la carpeta
   entera de nuevo con "uploading an existing file", GitHub sobreescribe los que ya existían) →
   "Commit changes".
3. Si esta actualización agrega una variable de entorno nueva (como `ADMIN_EMAILS` en este caso),
   sumala en Vercel → tu proyecto → Settings → Environment Variables antes de que vuelva a
   compilar, o el deploy va a fallar.
4. Vercel detecta el cambio en GitHub solo y arranca el redeploy automáticamente — en 2-3 minutos
   está en producción. Lo podés seguir en la pestaña "Deployments" de tu proyecto en Vercel.
5. Si la actualización cambió `prisma/schema.prisma` (agregó una tabla o un campo nuevo), corré
   una vez más, en tu computadora:
   ```
   npx prisma db push
   ```
   Esta versión no tocó el schema, así que este paso no hace falta para el dashboard.

Con este flujo no necesitás volver a crear cuentas ni repetir los pasos 2 y 3 — Supabase y Google
Cloud quedan tal cual, solo actualizás el código en GitHub.

---

## Modo 100% gratis (mientras no sepas si te va a ser rentable)

Reemplazamos toda la parte que podía costar plata (mapa, geocoding, búsqueda de lugares nuevos) por
su equivalente gratuito de **OpenStreetMap**, el proyecto de mapas colaborativo y libre (como una
"Wikipedia de mapas"). No es un truco de configuración para quedarse dentro de una cuota gratis
limitada — es un servicio que directamente no tiene modelo de facturación para este uso, así que no
hay "cuánto tenés hasta que empiece a cobrarte": nunca cobra.

- **El mapa** usa Leaflet (una librería open-source) con los tiles (las "baldosas" de imagen del
  mapa) de OpenStreetMap. Se ve y se siente igual que antes — mismo estilo de pines burbuja, mismo
  zoom, misma leyenda — pero corriendo sobre datos e infraestructura gratuita. Por licencia, tiene
  que mostrarse el crédito "© OpenStreetMap contributors" (chiquito, abajo a la derecha) — no se
  puede sacar, pero no molesta al diseño.
- **La búsqueda de ciudad** (el buscador del header) usa Nominatim, el geocoder gratuito de
  OpenStreetMap, en vez de la Geocoding API de Google.
- **La búsqueda de lugares nuevos** (cafés, coworks, bibliotecas, hoteles en una zona) usa Overpass
  API, también de OpenStreetMap, en vez de Google Places. Como es gratis, esta vez la dejamos
  **activada por defecto** (`ENABLE_LIVE_PLACE_IMPORT=true`) — antes la teníamos apagada
  específicamente para no arriesgar gasto en Google, pero con OpenStreetMap ese riesgo no existe.
- **Las fotos siguen sin depender de ningún servicio pago**: los locales importados arrancan sin
  foto (mismo placeholder de siempre) y se enriquecen con la primera foto real que sube la
  comunidad al dejar su review — con un puntito extra (0.25) para quien la sube, una sola vez por
  local.

Una diferencia real a tener en cuenta: los datos de OpenStreetMap dependen de voluntarios, así que
en ciudades grandes como Madrid o Buenos Aires suelen estar bastante completos, pero puede faltar
algún café chico o cowork nuevo que en Google sí aparecería. Se compensa solo con el tiempo (más
gente sumando lugares a mano con "+ Añadir lugar") y es la única concesión real de este enfoque —
a cambio, el costo de infraestructura de mapas/lugares queda en cero para siempre, no solo
"mientras no superes tal cantidad de visitas".

Si en algún momento — ya con el proyecto probado y con tráfico real — quisieras la cobertura de
datos de Google (mejores fotos, algún local más que OSM no tiene), sería una decisión de negocio
puntual, no algo que necesites resolver ahora.

---

## Qué cambió en esta versión

- Check-in y reviews son reales (antes eran solo estado del navegador, se perdían al refrescar).
- Las reviews puntúan 6 factores por separado (comodidad, silencio y concentración, enchufes,
  conectividad, servicio, comida) más tiempo máximo y consumo mínimo — no un genérico de estrellas.
- El mapa de descubrimiento lee tu propia base de datos, combinada con un import automático desde
  OpenStreetMap (gratis) para zonas sin datos todavía — ver "Modo 100% gratis" más abajo. Los
  locales importados quedan marcados "Sin verificación" hasta que alguien deje la primera review
  real.
- Sistema de puntos (0.25 por check-in, 1 por review, tope de 2 por día, sin poder repetir puntos
  en el mismo local antes de 14 días) — el saldo se guarda desde ya, aunque todavía no hay canjes
  con partners.
- El menú escaneado con IA ahora se guarda de verdad y muestra la fecha de última actualización.
- No existe un rol de "dueño de local": es una sola cuenta para todos. Cualquier usuario logueado
  puede sumar un lugar que falte (botón "+ Añadir lugar") y, una vez que hizo check-in real ahí,
  puede dejar su review, escanear/actualizar el menú y subir una foto de portada — exactamente
  igual que cualquier otro miembro de la comunidad.
- Las fotos de portada salen siempre de la comunidad: la primera foto real que alguien suba junto a
  su review para cada local. Nunca dependen de una API paga.
- Look and feel rediseñado por completo (tipografías Plus Jakarta Sans / JetBrains Mono, acento
  verde, mapa con pines tipo burbuja y leyenda de categorías, tarjetas con foto/rating/tipo de lugar).
- Nuevo dashboard de métricas en `/admin` (solo visible para los emails en `ADMIN_EMAILS`): usuarios
  y locales nuevos por día, check-ins activos, reviews, puntos otorgados, top de locales mejor
  puntuados, usuarios más activos, y desgloses por tipo de local / origen / ciudad.
- Puntos por subir la primera foto de un local: 0.25 puntos, una sola vez por local (no importa
  cuántas fotos se suban después ni quién las suba).
- **Modo 100% gratis para siempre**: se reemplazó Google Maps (mapa), Google Geocoding (buscador de
  ciudad) y Google Places (búsqueda de lugares nuevos) por su equivalente gratuito de
  OpenStreetMap — Leaflet + tiles OSM, Nominatim y Overpass API respectivamente. Google Cloud ahora
  solo se usa, opcionalmente, para el botón de "iniciar sesión con Google".

---

## Stack
Next.js 14 · Prisma · PostgreSQL (Supabase) · NextAuth · Leaflet + OpenStreetMap (mapa, geocoding y
búsqueda de lugares) · Claude API · Vercel
