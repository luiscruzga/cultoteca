<p align="center">
  <img src="assets/logo-text.png" alt="Cultoteca" width="420" />
</p>

<p align="center">
  <strong>Listas culturales colaborativas para compartir películas, series, anime, libros, juegos, música y mucho más con tus amigos.</strong>
</p>

<p align="center">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo" />
  <img alt="React Native 0.86" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript" />
  <img alt="Clerk" src="https://img.shields.io/badge/Auth-Clerk-6C47FF" />
  <img alt="MongoDB Atlas" src="https://img.shields.io/badge/DB-MongoDB%20Atlas-47A248?logo=mongodb" />
</p>

---

## Índice

- [¿Qué es Cultoteca?](#qué-es-cultoteca)
- [Funcionalidades](#funcionalidades)
- [Modo de uso](#modo-de-uso)
- [Integraciones y APIs externas](#integraciones-y-apis-externas)
- [Arquitectura](#arquitectura)
- [Ejecutar en local](#ejecutar-en-local)
- [Variables de entorno](#variables-de-entorno)
- [Compilar el APK de Android](#compilar-el-apk-de-android)
- [Publicar actualizaciones](#publicar-actualizaciones)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Scripts disponibles](#scripts-disponibles)
- [Solución de problemas](#solución-de-problemas)

---

## ¿Qué es Cultoteca?

Cultoteca es una aplicación móvil (Android, iOS y web) para **crear listas temáticas de recomendaciones culturales y co-editarlas con amigos**. Buscas una obra en decenas de fuentes públicas, la añades a una lista compartida, tus amigos la valoran y comentan, y la app te avisa de nuevos episodios, capítulos y actividad. Todo con un sistema de puntos, rangos y logros (*CultoScore*).

## Funcionalidades

### 📚 Listas colaborativas
- Crear listas con nombre, descripción, emoji/portada y **tipos de contenido permitidos** (p. ej. una lista solo de películas y series, o todo tipo de contenido).
- **Visibilidad pública o privada**: las privadas solo las ven sus miembros; las públicas aparecen en el explorador de la comunidad.
- **Permisos de contribución**: el creador decide si los miembros pueden añadir obras o solo él.
- **Invitar amigos** a una lista (solo se puede invitar a amigos conectados) y unirse mediante código o enlace.
- El propietario puede **editar** y **eliminar** la lista; los elementos los puede quitar el propietario o quien los añadió.
- **Búsqueda dentro de la lista** y **ordenación** (recientes, valoración de la crítica, valoración de los usuarios, título…).
- Cada elemento muestra quién lo aportó (*atribución*).

### 🔎 Catálogo multi-fuente
Búsqueda unificada en 13 tipos de contenido:

| Tipo | Fuente principal |
| --- | --- |
| 🎬 Películas · 📺 Series | TMDB (detalles, reparto, plataformas de streaming) |
| ⚡ Anime | Jikan (MyAnimeList) |
| 📚 Manga | MangaDex |
| 📖 Libros | Open Library |
| 🎮 Videojuegos | RAWG |
| 🎲 Juegos de mesa | BoardGameGeek / Ludopedia (vía backend) |
| 🎙️ Podcasts | iTunes Search API, fyyd |
| 🎵 Música | iTunes Search API (enlaces a Spotify, Apple Music y YouTube Music) |
| 🍳 Recetas | TheMealDB |
| 📍 Lugares | OpenStreetMap Nominatim (vía backend) |
| 🔗 Enlaces | Previsualización automática de cualquier URL (YouTube, X/Twitter, webs) |
| ✨ Otros | Entrada manual con categoría personalizada |

- **Ficha de detalle** con sinopsis en Markdown, enlaces interactivos, reparto (tocando un actor se ve su ficha), puntuación de la crítica y plataformas donde verlo, leerlo o jugarlo (Netflix, Crunchyroll, Steam, PlayStation, Xbox, Nintendo, GOG, Epic, Spotify…).
- **Entrada manual** de obras con título, imagen, enlace, valoración y categoría personalizada.
- **Valoraciones de media estrella** (0,5–5) y ranking dinámico.
- **Marcar como visto/completado** y **seguimiento de episodios o capítulos**.
- **Favoritos** guardados en tu perfil.
- Búsqueda eficiente: cancelación de peticiones obsoletas, *skeletons* de carga y detalles de TMDB bajo demanda.

### 🏠 Pantalla principal
- **Tendencias**: obras más añadidas y mejor valoradas por la comunidad.
- **Para ti**: sugerencias personalizadas según tus listas.
- Todo es navegable: un toque abre la ficha o la lista correspondiente.

### 📡 Radar de streaming
Muestra las obras recomendadas por tus amigos que están disponibles en **tus suscripciones activas** (Netflix, Disney+, Prime Video, etc., configurables en tu perfil).

### 🎰 CultoRuleta
¿No sabes qué ver? La ruleta elige al azar una obra pendiente de tus listas, ideal para decidir en grupo.

### 💬 Social
- **Hilos de comentarios** en cada obra.
- **Valoraciones separadas**: puntuación de la crítica vs. media de los usuarios de la lista.
- **Muro de actividad** con lo que agregan y comentan otros en tus listas.
- **Recomendaciones directas** a un amigo.
- **Búsqueda de usuarios** por nombre de usuario, código único o enlace directo, y conexión como amigos.
- **Explorador de listas públicas** de toda la comunidad, con búsqueda y filtros.

### 🏆 Gamificación (CultoScore)
Ganas puntos por cada acción y subes de rango (de *Novato Cultural* en adelante):

| Acción | Puntos |
| --- | --- |
| Crear una lista | 25 |
| Marcar como visto | 20 |
| Añadir una obra | 15 |
| Conectar con un amigo | 15 |
| Comentar | 10 |
| Girar la ruleta | 10 |

**Logros desbloqueables**: Cinéfilo de Culto, Otaku Supremo, Devorador de Páginas, Gamer de Culto, Curador Colaborativo, Maratón Cultural, Crítico Afilado, Ruleta de la Fortuna, Conector Cultural y Gran Coleccionista. Cada vez que ganas puntos aparece un *toast* de confirmación.

### 🔔 Notificaciones
- **Push nativas** (Expo Push + Firebase Cloud Messaging en Android) cuando alguien añade o comenta en tus listas o te recomienda algo.
- **Recordatorios locales** de estrenos: próximo episodio de tus series (TVmaze/TMDB) y nuevos capítulos de manga (MangaDex), con insignias en las tarjetas.
- Centro de notificaciones en la app con marcado de leídas.

### 👤 Perfil y cuenta
- Registro e inicio de sesión con **Clerk** (email + contraseña, verificación por código y segundo factor).
- Perfil con **código único**, suscripciones de streaming, logros y galería de favoritos.
- **Avatar**: iniciales por defecto, galería de presets o búsqueda de **personajes reales** de cine, series y anime (AniList, TVmaze, Wikipedia).

### ⬆️ Actualizaciones de la app
- Muestra la versión instalada.
- Busca nuevas versiones manualmente o de forma automática (GitHub Releases o un manifiesto JSON propio) y descarga el nuevo APK.

## Modo de uso

1. **Crea tu cuenta** desde la pantalla de bienvenida (email + contraseña y código de verificación).
2. **Personaliza tu perfil**: elige un avatar y marca tus suscripciones de streaming (alimentan el Radar).
3. **Conecta con amigos**: desde tu perfil busca por nombre de usuario o código, o comparte tu enlace.
4. **Crea una lista** en la pestaña *Listas* → elige nombre, tipos de contenido, si es pública o privada y si los miembros pueden contribuir.
5. **Invita a tus amigos** a la lista.
6. **Añade obras** con el botón `+`: elige la categoría, busca el título y pulsa añadir. Para enlaces, pega la URL y edita la previsualización. Si no aparece, créala a mano.
7. **Interactúa**: abre una obra para valorarla, comentarla, marcarla como vista, guardarla en favoritos, ver dónde verla o recomendarla.
8. **Descubre**: revisa *Principal* (tendencias y sugerencias), *Radar* (lo disponible en tus plataformas), *Muro* (actividad) y el explorador de listas públicas.
9. **¿Indecisos?** Gira la **CultoRuleta** dentro de una lista.
10. Consulta tus **logros y rango** desde el icono de trofeo/perfil.

## Integraciones y APIs externas

| Servicio | Uso | ¿Requiere clave? |
| --- | --- | --- |
| [Clerk](https://clerk.com) | Autenticación y sesiones | ✅ Publishable key (app) + Secret key (backend) |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Persistencia (listas, usuarios, notificaciones, auditoría) | ✅ Cadena de conexión (backend) |
| [TMDB](https://www.themoviedb.org) | Películas, series, reparto, proveedores de streaming | ✅ API key v3 |
| [RAWG](https://rawg.io) | Videojuegos y tiendas | ✅ API key |
| [Jikan](https://jikan.moe) | Anime (MyAnimeList) | ❌ |
| [MangaDex](https://api.mangadex.org) | Manga y seguimiento de capítulos | ❌ |
| [Open Library](https://openlibrary.org/developers/api) | Libros y portadas | ❌ |
| [iTunes Search API](https://performance-partners.apple.com/search-api) | Música y podcasts | ❌ |
| [fyyd](https://fyyd.de) | Podcasts | ❌ |
| [TheMealDB](https://www.themealdb.com/api.php) | Recetas | ❌ |
| [Wikidata / Wikipedia / Wikimedia Commons](https://www.wikidata.org) | Metadatos e imágenes complementarias | ❌ |
| [AniList](https://anilist.co), [TVmaze](https://www.tvmaze.com/api) | Avatares de personajes, próximos episodios | ❌ |
| [BoardGameGeek](https://boardgamegeek.com/using_the_xml_api) | Juegos de mesa y rankings (backend) | ⚠️ Token opcional |
| [Ludopedia](https://ludopedia.com.br/api/documentacao.html) | Juegos de mesa (backend) | ⚠️ Token opcional |
| [OpenStreetMap Nominatim](https://nominatim.org) | Lugares (backend) | ⚠️ Email de contacto recomendado |
| [FxTwitter](https://github.com/FixTweet/FxTwitter), oEmbed de YouTube/X | Previsualización de enlaces | ❌ |
| [Expo Push](https://docs.expo.dev/push-notifications/overview/) + [Firebase (FCM)](https://firebase.google.com) | Notificaciones push | ✅ `google-services.json` (Android) |
| [EAS Build](https://docs.expo.dev/build/introduction/) | Compilación del APK | ✅ Cuenta Expo |
| GitHub Releases | Distribución de actualizaciones del APK | ❌ (repo público) |

> Las búsquedas de juegos de mesa y lugares degradan con elegancia: si el backend no está disponible o no tiene token, la app sigue funcionando con el resto de categorías.

## Arquitectura

```
┌──────────────────────────┐        HTTPS + JWT de Clerk        ┌──────────────────────────┐
│  App Expo (este repo)    │ ─────────────────────────────────▶ │  cultoteca-api (Express) │
│  React Native + TS       │                                    │  repo aparte: /server    │
│  - Clerk (sesión)        │ ◀───────────────────────────────── │  - Valida sesión Clerk   │
│  - APIs públicas directas│                                    │  - MongoDB Atlas         │
│    (TMDB, RAWG, Jikan…)  │                                    │  - Proxy BGG/Nominatim   │
└──────────────────────────┘                                    │  - Envío Expo Push       │
                                                                └──────────────────────────┘
```

- **Frontend** (este repositorio): Expo SDK 57, React Native 0.86, TypeScript, `react-native-web` para el navegador.
- **Backend**: repositorio independiente [`cultoteca-api`](https://github.com/luiscruzga/cultoteca-api) (Node.js ≥ 20 + Express). Se clona dentro de `server/` (ignorada por git en este repo).

## Ejecutar en local

### Requisitos

- [Node.js](https://nodejs.org) ≥ 20 y npm
- [Git](https://git-scm.com)
- Para móvil: la app **Expo Go** en tu teléfono, o Android Studio (emulador) / Xcode (simulador iOS, solo macOS)
- Cuentas gratuitas en Clerk, MongoDB Atlas, TMDB y RAWG (ver [Variables de entorno](#variables-de-entorno))

### 1. Clonar el proyecto y el backend

```bash
git clone https://github.com/luiscruzga/cultoteca.git
cd cultoteca
git clone https://github.com/luiscruzga/cultoteca-api.git server
```

### 2. Instalar dependencias

```bash
npm install
npm --prefix server install
```

### 3. Configurar las variables de entorno

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Rellena ambos archivos (detalle en la sección siguiente).

### 4. Arrancar el backend

```bash
npm run server
# → http://localhost:5001  (comprueba: http://localhost:5001/api/health)
```

### 5. Arrancar la app

En otra terminal:

```bash
npm start          # menú de Expo: escanea el QR con Expo Go
npm run android    # emulador / dispositivo Android
npm run ios        # simulador iOS (macOS)
npm run web        # navegador
```

> **Dispositivo físico**: el teléfono no puede resolver `localhost`. Pon en `EXPO_PUBLIC_API_URL` la IP local de tu ordenador (p. ej. `http://192.168.1.50:5001`) y asegúrate de que ambos están en la misma red Wi-Fi.

> **Notificaciones push**: Expo Go tiene soporte limitado para push en Android; para probarlas a fondo usa un *development build* o el APK.

### 6. Verificar tipos y lint

```bash
npx tsc --noEmit
npm run lint
```

## Variables de entorno

### App (`.env` en la raíz)

> ⚠️ Todas las variables `EXPO_PUBLIC_*` se **incrustan en el bundle/APK** y son visibles para cualquiera. Nunca pongas aquí secretos.

| Variable | Obligatoria | Descripción | Dónde obtenerla |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clave pública de Clerk (`pk_test_…` / `pk_live_…`) | [dashboard.clerk.com](https://dashboard.clerk.com) → tu aplicación → **API Keys** → *Publishable key* |
| `EXPO_PUBLIC_API_URL` | ✅ | URL del backend | `http://localhost:5001` en local, la IP LAN para dispositivo físico, o la URL de tu despliegue |
| `EXPO_PUBLIC_TMDB_API_KEY` | ✅ | API key v3 de TMDB (películas y series) | Crea una cuenta en [themoviedb.org](https://www.themoviedb.org/signup) → [Settings → API](https://www.themoviedb.org/settings/api) → solicita una clave *Developer* → copia la **API Key (v3 auth)** |
| `EXPO_PUBLIC_RAWG_API_KEY` | ✅ | API key de RAWG (videojuegos) | Regístrate en [rawg.io](https://rawg.io/signup) → [rawg.io/apidocs](https://rawg.io/apidocs) → **Get API Key** |
| `EXPO_PUBLIC_GITHUB_REPO` | ➖ | Repo con releases del APK, formato `usuario/repo` (p. ej. `luiscruzga/cultoteca`) | Tu repositorio de GitHub |
| `EXPO_PUBLIC_UPDATE_URL` | ➖ | Alternativa: URL de un manifiesto JSON de versiones | Tu propio hosting (ver [Publicar actualizaciones](#publicar-actualizaciones)) |

### Backend (`server/.env`)

| Variable | Obligatoria | Descripción | Dónde obtenerla |
| --- | --- | --- | --- |
| `PORT` | ➖ | Puerto del servidor (por defecto `5001`) | — |
| `MONGODB_URI` | ✅* | Cadena completa `mongodb+srv://usuario:pass@cluster.xxxxx.mongodb.net/…` | [MongoDB Atlas](https://cloud.mongodb.com) → crea un cluster gratuito (M0) → **Database Access**: crea un usuario → **Network Access**: añade tu IP (o `0.0.0.0/0` en desarrollo) → **Connect → Drivers** → copia la cadena |
| `MONGODB_USERNAME` / `MONGODB_PASSWORD` / `MONGODB_CLUSTER` | ✅* | Alternativa a `MONGODB_URI` por partes | Los mismos datos del paso anterior |
| `MONGODB_DATABASE` | ➖ | Nombre de la base de datos (por defecto `cultoteca`) | — |
| `CLERK_SECRET_KEY` | ✅ | Clave secreta de Clerk (`sk_test_…`) para validar sesiones | [dashboard.clerk.com](https://dashboard.clerk.com) → **API Keys** → *Secret key* |
| `CLERK_PUBLISHABLE_KEY` | ✅ | La misma publishable key de la app | Igual que `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `BGG_API_TOKEN` | ➖ | Token de la API XML de BoardGameGeek | [boardgamegeek.com/applications](https://boardgamegeek.com/applications) → registra una aplicación |
| `LUDOPEDIA_ACCESS_TOKEN` | ➖ | Token de Ludopedia (juegos de mesa) | [ludopedia.com.br/aplicativos](https://ludopedia.com.br/aplicativos) |
| `BGG_RANKS_CSV_PATH` | ➖ | Ruta local al CSV diario `boardgames_ranks.csv` | [boardgamegeek.com/data_dumps/bg_ranks](https://boardgamegeek.com/data_dumps/bg_ranks) (requiere sesión en BGG) |
| `NOMINATIM_CONTACT_EMAIL` | ➖ | Email para el *User-Agent* exigido por la [política de Nominatim](https://operations.osmfoundation.org/policies/nominatim/) | Tu email de contacto |

\* Usa `MONGODB_URI` **o** el trío usuario/contraseña/cluster.

### Configuración de Clerk

1. Crea una aplicación en [dashboard.clerk.com](https://dashboard.clerk.com).
2. En **User & Authentication → Email, Phone, Username** habilita *Email address* y *Password*, y la verificación por código de email.
3. Habilita *Username* si quieres que los usuarios puedan buscarse por nombre de usuario.
4. Copia la *Publishable key* a ambos `.env` y la *Secret key* solo a `server/.env`.

### Firebase / notificaciones push (Android)

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com) y añade una app Android con el paquete `com.luiscruzga.cultoteca` (o el que definas en `app.json`).
2. Descarga **`google-services.json`** y colócalo en la raíz del proyecto.
3. Sube la clave de cuenta de servicio de FCM (v1) a Expo: `eas credentials` → Android → *Google Service Account Key for FCM V1*. Guía: [docs.expo.dev/push-notifications/fcm-credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).

## Compilar el APK de Android

Con [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview      # APK instalable (distribución interna)
eas build -p android --profile production   # AAB para Google Play
```

- El código de versión se gestiona en remoto y se incrementa solo (`autoIncrement` en `eas.json`).
- EAS sube tu `.env` (ver `.easignore`) para fijar las variables `EXPO_PUBLIC_*` en el binario. Alternativamente, defínelas como [variables de entorno de EAS](https://docs.expo.dev/eas/environment-variables/).
- Antes de cada release, sube `version` en `app.json` y `package.json`.

## Publicar actualizaciones

La app compara su versión con la última publicada y ofrece descargar el APK nuevo. Dos opciones:

**Opción 1 — GitHub Releases** (`EXPO_PUBLIC_GITHUB_REPO=usuario/repo`): crea un release con un tag de versión (p. ej. `v1.0.2`) y adjunta el `.apk`. La app consulta `releases/latest` y usa el primer asset que termine en `.apk`.

**Opción 2 — Manifiesto propio** (`EXPO_PUBLIC_UPDATE_URL`): publica un JSON como este:

```json
{
  "version": "1.0.2",
  "apkUrl": "https://tudominio.com/cultoteca-1.0.2.apk",
  "releaseNotes": "Corrección de errores y nuevas funcionalidades",
  "publishedAt": "2026-10-06T00:00:00Z"
}
```

## Estructura del proyecto

```
cultoteca/
├── App.tsx                  # Navegación principal (Principal · Listas · Radar · Muro)
├── index.ts                 # Punto de entrada
├── app.json / eas.json      # Configuración de Expo y EAS Build
├── assets/                  # Iconos, logos y splash
├── server/                  # Backend cultoteca-api (repo aparte, ignorado)
└── src/
    ├── components/          # Pantallas y modales (detalle, ruleta, perfil, notificaciones…)
    ├── constants/           # Presets de avatar
    ├── services/
    │   ├── api/             # Clientes de TMDB, RAWG, MangaDex, música, podcasts, recetas, lugares…
    │   ├── mongoDbService.ts        # Cliente del backend (con token de Clerk)
    │   ├── gamificationService.ts   # Puntos, rangos y logros
    │   ├── cultoRouletteService.ts  # CultoRuleta
    │   ├── notificationService.ts   # Push y notificaciones locales
    │   ├── releaseTrackingService.ts# Seguimiento de episodios y capítulos
    │   └── updateService.ts         # Comprobación de actualizaciones
    ├── types/               # Tipos compartidos
    └── utils/               # Categorías, ratings, logos de plataformas, imágenes
```

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm start` | Arranca el servidor de desarrollo de Expo |
| `npm run android` | Abre la app en Android |
| `npm run ios` | Abre la app en el simulador iOS |
| `npm run web` | Abre la app en el navegador |
| `npm run server` | Arranca el backend en `server/` |
| `npm run lint` | ESLint (config de Expo) |

> Para instalar módulos nativos usa siempre `npx expo install <paquete>` para obtener versiones compatibles con el SDK.

## Solución de problemas

- **La app no conecta con el backend en el móvil**: usa la IP local de tu ordenador en `EXPO_PUBLIC_API_URL`, no `localhost`, y revisa el firewall.
- **Cambié el `.env` y no se refleja**: reinicia Expo limpiando la caché: `npx expo start -c`.
- **Errores de certificados detrás de un proxy corporativo** (Zscaler, etc.): los scripts ya usan `NODE_TLS_REJECT_UNAUTHORIZED=0` en desarrollo; el backend exporta los certificados del sistema en macOS (`start.js`).
- **MongoDB: `IP not whitelisted`**: añade tu IP en *Network Access* de Atlas.
- **No hay resultados de juegos de mesa o lugares**: comprueba que el backend está en marcha y, para BGG, que `BGG_API_TOKEN` está configurado.

---

Hecho con ❤️ para los amantes de la cultura.
