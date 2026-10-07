import { MediaCategory, MediaItem, StreamingProvider } from '../../types';
import { isTmdbConfigured, searchTmdb } from './tmdbService';
import { searchMangaDex } from './mangaDexService';
import { searchRawg } from './rawgService';
import { searchPodcasts } from './podcastSearchService';
import { searchMusic } from './musicSearchService';
import { searchRecipes } from './recipeSearchService';
import { searchPlaces } from './placeSearchService';
import { searchBoardGames } from './boardGameSearchService';
import { createTimeoutController, isAbortError } from './requestController';

// Curated library of cult titles with streaming/reading providers for instant results and offline fallback
export const CURATED_CULT_CATALOG: MediaItem[] = [
  // MOVIES
  {
    id: 'cult-movie-1',
    title: 'Blade Runner 2049',
    originalTitle: 'Blade Runner 2049',
    category: 'movie',
    year: 2017,
    releaseDate: '2017-10-06',
    director: 'Denis Villeneuve',
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas', 'Sylvia Hoeks', 'Robin Wright', 'Mackenzie Davis'],
    synopsis: 'Un nuevo blade runner de la policía de Los Ángeles desentierra un viejo secreto enterrado hace mucho tiempo que podría sumir lo que queda de la sociedad en el caos.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    genres: ['Ciencia Ficción', 'Cyberpunk', 'Misterio'],
    averageRating: 4.8,
    ratingsCount: 42,
    whereToWatchOrRead: [
      { id: 'p-netflix', name: 'Netflix', type: 'stream', color: '#E50914' },
      { id: 'p-prime', name: 'Prime Video', type: 'stream', color: '#00A8E1' },
      { id: 'p-apple', name: 'Apple TV', type: 'rent', color: '#000000' },
    ],
    externalLinks: [
      { label: 'JustWatch', url: 'https://www.justwatch.com/es/pelicula/blade-runner-2049' },
      { label: 'IMDb', url: 'https://www.imdb.com/title/tt1856101/' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-01T12:00:00Z',
    comments: [
      {
        id: 'c-1',
        userId: 'u2',
        userName: 'Sofía',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        text: 'La fotografía de Roger Deakins es una obra maestra absoluta.',
        rating: 5,
        createdAt: '2026-03-01T14:30:00Z'
      }
    ]
  },
  {
    id: 'cult-movie-2',
    title: 'El Viaje de Chihiro',
    originalTitle: 'Sen to Chihiro no kamikakushi',
    category: 'movie',
    year: 2001,
    releaseDate: '2001-07-20',
    director: 'Hayao Miyazaki',
    cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki', 'Takashi Naitô'],
    synopsis: 'Una niña de diez años queda atrapada en un mundo gobernado por dioses, brujas y espíritus, donde los humanos se transforman en bestias.',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    genres: ['Animación', 'Fantasía', 'Aventura'],
    averageRating: 4.9,
    ratingsCount: 88,
    whereToWatchOrRead: [
      { id: 'p-netflix', name: 'Netflix', type: 'stream', color: '#E50914' },
      { id: 'p-max', name: 'Max', type: 'stream', color: '#002BE7' }
    ],
    externalLinks: [
      { label: 'JustWatch', url: 'https://www.justwatch.com/es/pelicula/el-viaje-de-chihiro' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u3', name: 'Matías', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-02T10:15:00Z',
    comments: []
  },

  // SERIES
  {
    id: 'cult-series-1',
    title: 'Severance (Separación)',
    originalTitle: 'Severance',
    category: 'series',
    year: 2022,
    releaseDate: '2022-02-18',
    director: 'Ben Stiller & Aoife McArdle',
    cast: ['Adam Scott', 'Patricia Arquette', 'John Turturro', 'Christopher Walken', 'Britt Lower'],
    synopsis: 'Mark lidera un equipo de oficinistas cuyos recuerdos han sido divididos quirúrgicamente entre su vida laboral y personal.',
    posterUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    genres: ['Thriller Psicológico', 'Ciencia Ficción', 'Drama'],
    averageRating: 4.9,
    ratingsCount: 56,
    whereToWatchOrRead: [
      { id: 'p-apple', name: 'Apple TV+', type: 'stream', color: '#000000' }
    ],
    externalLinks: [
      { label: 'JustWatch', url: 'https://www.justwatch.com/es/serie/severance' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-02T18:00:00Z',
    comments: [
      {
        id: 'c-2',
        userId: 'u4',
        userName: 'Camila',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        text: '¡El final de la primera temporada te deja sin respiración!',
        rating: 5,
        createdAt: '2026-03-02T20:10:00Z'
      }
    ]
  },

  // ANIME
  {
    id: 'cult-anime-1',
    title: 'Cowboy Bebop',
    originalTitle: 'Kaubōi Bibappu',
    category: 'anime',
    year: 1998,
    releaseDate: '1998-04-03',
    director: 'Shinichirō Watanabe (Estudio Sunrise)',
    cast: ['Kōichi Yamadera', 'Unshō Ishizuka', 'Megumi Hayashibara', 'Aoi Tada'],
    synopsis: 'En el año 2071, la tripulación de cazarrecompensas de la nave Bebop viaja por el sistema solar intentando ganar dinero mientras huyen de su pasado.',
    posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    genres: ['Espacio', 'Jazz', 'Neo-Noir', 'Acción'],
    averageRating: 5.0,
    ratingsCount: 110,
    whereToWatchOrRead: [
      { id: 'p-crunchyroll', name: 'Crunchyroll', type: 'stream', color: '#F47521' },
      { id: 'p-netflix', name: 'Netflix', type: 'stream', color: '#E50914' }
    ],
    externalLinks: [
      { label: 'JustWatch', url: 'https://www.justwatch.com/es/serie/cowboy-bebop' },
      { label: 'MyAnimeList', url: 'https://myanimelist.net/anime/1/Cowboy_Bebop' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u2', name: 'Sofía', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-03T11:00:00Z',
    comments: []
  },

  // MANGA
  {
    id: 'cult-manga-1',
    title: 'Berserk',
    originalTitle: 'Beruseruku',
    category: 'manga',
    year: 1989,
    releaseDate: '1989-08-25',
    director: 'Kentarō Miura',
    cast: ['Guts', 'Griffith', 'Casca', 'Judeau'],
    synopsis: 'Guts, un mercenario errante conocido como el Espadachín Negro, empuña una espada colosal y busca venganza contra su antiguo amigo Griffith en un mundo de fantasía oscura.',
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    genres: ['Fantasía Oscura', 'Épico', 'Acción'],
    averageRating: 5.0,
    ratingsCount: 95,
    whereToWatchOrRead: [
      { id: 'p-panini', name: 'Panini Manga', type: 'read', color: '#E31B23' },
      { id: 'p-kindle', name: 'Amazon Kindle', type: 'read', color: '#FF9900' }
    ],
    externalLinks: [
      { label: 'MyAnimeList Manga', url: 'https://myanimelist.net/manga/2/Berserk' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u3', name: 'Matías', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-03T16:20:00Z',
    comments: []
  },

  // BOOKS
  {
    id: 'cult-book-1',
    title: 'Dune',
    originalTitle: 'Dune',
    category: 'book',
    year: 1965,
    releaseDate: '1965-08-01',
    director: 'Frank Herbert',
    cast: ['Paul Atreides', 'Lady Jessica', 'Duque Leto', 'Barón Harkonnen'],
    synopsis: 'En el inhóspito planeta desértico Arrakis, la Casa Atreides asume el control del recurso más valioso del universo: la especia melange.',
    posterUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    genres: ['Ciencia Ficción', 'Space Opera', 'Filosofía'],
    averageRating: 4.9,
    ratingsCount: 75,
    whereToWatchOrRead: [
      { id: 'p-kindle', name: 'Kindle Store', type: 'read', color: '#FF9900' },
      { id: 'p-audible', name: 'Audible (Audiolibro)', type: 'stream', color: '#F8991D' },
      { id: 'p-libreria', name: 'Casa del Libro', type: 'buy', color: '#007038' }
    ],
    externalLinks: [
      { label: 'Open Library', url: 'https://openlibrary.org/works/OL893415W/Dune' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-03T19:00:00Z',
    comments: []
  },
  {
    id: 'cult-book-2',
    title: 'Ficciones',
    originalTitle: 'Ficciones',
    category: 'book',
    year: 1944,
    releaseDate: '1944-01-01',
    director: 'Jorge Luis Borges',
    cast: ['Pierre Menard', 'Herbert Quain', 'Jaromir Hladík'],
    synopsis: 'Colección emblemática de cuentos de Jorge Luis Borges sobre laberintos, bibliotecas infinitas, espejos y la naturaleza de la realidad y el tiempo.',
    posterUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    genres: ['Ficción Filosófica', 'Realismo Mágico', 'Cuentos'],
    averageRating: 5.0,
    ratingsCount: 64,
    whereToWatchOrRead: [
      { id: 'p-kindle', name: 'Kindle Store', type: 'read', color: '#FF9900' },
      { id: 'p-biblioteca', name: 'Biblioteca Pública Digital', type: 'borrow', color: '#2B5797' }
    ],
    externalLinks: [
      { label: 'Open Library', url: 'https://openlibrary.org/works/OL1861788W/Ficciones' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u4', name: 'Camila', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-03T20:10:00Z',
    comments: []
  },

  // GAMES
  {
    id: 'cult-game-1',
    title: 'Chrono Trigger',
    originalTitle: 'Kurono Torigā',
    category: 'game',
    year: 1995,
    releaseDate: '1995-03-11',
    director: 'Square (Dream Team: Sakaguchi, Horii, Toriyama)',
    cast: ['Crono', 'Marle', 'Lucca', 'Frog', 'Robo', 'Magus'],
    synopsis: 'Una inolvidable aventura de rol a través del tiempo ideada por las mentes maestras de Final Fantasy, Dragon Quest y Dragon Ball.',
    posterUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    genres: ['JRPG', 'Viajes en el Tiempo', 'Aventura'],
    averageRating: 5.0,
    ratingsCount: 140,
    whereToWatchOrRead: [
      { id: 'p-steam', name: 'Steam', type: 'buy', color: '#171A21', url: 'https://store.steampowered.com/app/613830/CHRONO_TRIGGER/' },
      { id: 'p-appstore', name: 'App Store', type: 'buy', color: '#000000', url: 'https://apps.apple.com' },
      { id: 'p-googleplay', name: 'Google Play', type: 'buy', color: '#01875F', url: 'https://play.google.com' }
    ],
    externalLinks: [
      { label: 'RAWG', url: 'https://rawg.io/games/chrono-trigger' },
      { label: 'Wikipedia', url: 'https://es.wikipedia.org/wiki/Chrono_Trigger' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-04T09:00:00Z',
    comments: [
      {
        id: 'cg-1',
        userId: 'u2',
        userName: 'Sofía',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        text: 'La banda sonora de Yasunori Mitsuda es pura magia.',
        rating: 5,
        createdAt: '2026-03-04T10:15:00Z'
      }
    ]
  },
  {
    id: 'cult-game-2',
    title: 'Disco Elysium - The Final Cut',
    originalTitle: 'Disco Elysium',
    category: 'game',
    year: 2019,
    releaseDate: '2019-10-15',
    director: 'ZA/UM (Robert Kurvitz)',
    cast: ['Harry Du Bois', 'Kim Kitsuragi', 'Titus Hardie', 'Klaasje'],
    synopsis: 'Un innovador juego de rol detectivesco con un sistema de habilidades único y una ciudad entera en ruinas ideológicas para forjar tu camino.',
    posterUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    genres: ['RPG Narrativo', 'Neo-Noir', 'Filosófico'],
    averageRating: 4.9,
    ratingsCount: 92,
    whereToWatchOrRead: [
      { id: 'p-steam', name: 'Steam', type: 'buy', color: '#171A21', url: 'https://store.steampowered.com/app/632470/Disco_Elysium__The_Final_Cut/' },
      { id: 'p-gog', name: 'GOG.com', type: 'buy', color: '#8A2BE2', url: 'https://www.gog.com' },
      { id: 'p-playstation', name: 'PlayStation Store', type: 'buy', color: '#003791', url: 'https://store.playstation.com' },
      { id: 'p-nintendo', name: 'Nintendo eShop', type: 'buy', color: '#E60012', url: 'https://www.nintendo.com' }
    ],
    externalLinks: [
      { label: 'RAWG', url: 'https://rawg.io/games/disco-elysium' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u3', name: 'Matías', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-04T11:30:00Z',
    comments: []
  },
  {
    id: 'cult-game-3',
    title: 'Shadow of the Colossus',
    originalTitle: 'Wanda to Kyozō',
    category: 'game',
    year: 2005,
    releaseDate: '2005-10-18',
    director: 'Fumito Ueda (Team Ico)',
    cast: ['Wander', 'Mono', 'Agro', 'Dormin'],
    synopsis: 'Un joven viaja a una tierra prohibida para devolverle la vida a una doncella derrotando a dieciséis gigantes míticos en una experiencia poética y desoladora.',
    posterUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    genres: ['Acción y Aventura', 'Minimalista', 'Fantasía'],
    averageRating: 5.0,
    ratingsCount: 115,
    whereToWatchOrRead: [
      { id: 'p-playstation', name: 'PlayStation Store', type: 'buy', color: '#003791', url: 'https://store.playstation.com' }
    ],
    externalLinks: [
      { label: 'RAWG', url: 'https://rawg.io/games/shadow-of-the-colossus' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u2', name: 'Sofía', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-04T14:00:00Z',
    comments: []
  },
  {
    id: 'cult-game-4',
    title: 'Elden Ring',
    originalTitle: 'Elden Ring',
    category: 'game',
    year: 2022,
    releaseDate: '2022-02-25',
    director: 'Hidetaka Miyazaki & George R.R. Martin (FromSoftware)',
    cast: ['Tarnished', 'Melina', 'Ranni', 'Radagon', 'Malenia'],
    synopsis: 'Álzate, Sinluz, y déjate guiar por la gracia para esgrimir el poder del Círculo de Elden y convertirte en el Señor del Círculo en las Tierras Intermedias.',
    posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    genres: ['Soulslike', 'Mundo Abierto', 'Fantasía Oscura'],
    averageRating: 4.9,
    ratingsCount: 210,
    whereToWatchOrRead: [
      { id: 'p-steam', name: 'Steam', type: 'buy', color: '#171A21', url: 'https://store.steampowered.com/app/1245620/ELDEN_RING/' },
      { id: 'p-playstation', name: 'PlayStation Store', type: 'buy', color: '#003791', url: 'https://store.playstation.com' },
      { id: 'p-xbox', name: 'Xbox Store', type: 'buy', color: '#107C10', url: 'https://www.xbox.com' }
    ],
    externalLinks: [
      { label: 'RAWG', url: 'https://rawg.io/games/elden-ring' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-04T16:20:00Z',
    comments: []
  },

  // BOARD GAMES
  {
    id: 'cult-boardgame-1',
    title: 'Catán (Los Colonos de Catán)',
    originalTitle: 'Die Siedler von Catan',
    category: 'boardgame',
    year: 1995,
    releaseDate: '1995-01-01',
    director: 'Klaus Teuber',
    cast: ['3-4 Jugadores', 'Comercio', 'Estrategia', 'Gestión de Recursos'],
    synopsis: 'Los jugadores intentan ser la fuerza dominante en la isla de Catán construyendo asentamientos, ciudades y caminos mientras negocian recursos.',
    posterUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&auto=format&fit=crop&q=80',
    genres: ['Juego de Mesa', 'Estrategia', 'Comercio'],
    averageRating: 4.8,
    ratingsCount: 85,
    whereToWatchOrRead: [
      { id: 'p-bgg', name: 'BoardGameGeek', type: 'read', color: '#FF5100', url: 'https://boardgamegeek.com/boardgame/13/catan' }
    ],
    externalLinks: [
      { label: 'BoardGameGeek', url: 'https://boardgamegeek.com/boardgame/13/catan' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T10:00:00Z',
    comments: []
  },
  {
    id: 'cult-boardgame-2',
    title: 'Carcassonne',
    originalTitle: 'Carcassonne',
    category: 'boardgame',
    year: 2000,
    releaseDate: '2000-10-01',
    director: 'Klaus-Jürgen Wrede',
    cast: ['2-5 Jugadores', 'Colocación de Losetas', 'Control de Área'],
    synopsis: 'Juego de losetas en el que los jugadores construyen el mapa del sur de Francia medieval colocando caminos, ciudades, monasterios y campos.',
    posterUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?w=600&auto=format&fit=crop&q=80',
    genres: ['Juego de Mesa', 'Colocación de Losetas', 'Familiar'],
    averageRating: 4.7,
    ratingsCount: 65,
    whereToWatchOrRead: [
      { id: 'p-bgg', name: 'BoardGameGeek', type: 'read', color: '#FF5100', url: 'https://boardgamegeek.com/boardgame/822/carcassonne' }
    ],
    externalLinks: [
      { label: 'BoardGameGeek', url: 'https://boardgamegeek.com/boardgame/822/carcassonne' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u2', name: 'Sofía', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T11:00:00Z',
    comments: []
  },

  // PODCASTS
  {
    id: 'cult-podcast-1',
    title: 'Huberman Lab',
    originalTitle: 'Huberman Lab',
    category: 'podcast',
    year: 2021,
    releaseDate: '2021-01-01',
    director: 'Dr. Andrew Huberman (Stanford)',
    cast: ['Dr. Andrew Huberman'],
    synopsis: 'Neurociencia y herramientas aplicadas para optimizar la salud cerebral, el enfoque, el descanso, el ejercicio y la longevidad.',
    posterUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
    genres: ['Ciencia', 'Salud', 'Neurociencia'],
    averageRating: 4.9,
    ratingsCount: 140,
    whereToWatchOrRead: [
      { id: 'p-spotify', name: 'Spotify', type: 'stream', color: '#1DB954', url: 'https://open.spotify.com/show/7zRbptF8v08q2U1eBwV100' },
      { id: 'p-apple-podcasts', name: 'Apple Podcasts', type: 'stream', color: '#B150E2', url: 'https://podcasts.apple.com' }
    ],
    externalLinks: [
      { label: 'Sitio Oficial', url: 'https://hubermanlab.com' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u3', name: 'Matías', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T12:00:00Z',
    comments: []
  },
  {
    id: 'cult-podcast-2',
    title: 'Entiende Tu Mente',
    originalTitle: 'Entiende Tu Mente',
    category: 'podcast',
    year: 2017,
    releaseDate: '2017-04-01',
    director: 'Molo Cebrián, Luis Muiño y Mónica González',
    cast: ['Molo Cebrián', 'Luis Muiño', 'Mónica González'],
    synopsis: 'Pódcast en español más escuchado sobre psicología y autoconocimiento, explicando el funcionamiento de la mente en píldoras de 20 minutos.',
    posterUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&auto=format&fit=crop&q=80',
    genres: ['Psicología', 'Salud Mental', 'Desarrollo Personal'],
    averageRating: 4.9,
    ratingsCount: 95,
    whereToWatchOrRead: [
      { id: 'p-spotify', name: 'Spotify', type: 'stream', color: '#1DB954', url: 'https://open.spotify.com/show/0ohHQGk3UjE9Z33Jp39gRj' }
    ],
    externalLinks: [
      { label: 'Web Oficial', url: 'https://entiendetumente.info' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u4', name: 'Camila', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T13:00:00Z',
    comments: []
  },

  // MUSIC
  {
    id: 'cult-music-1',
    title: 'One More Time',
    originalTitle: 'Álbum: Discovery',
    category: 'music',
    year: 2000,
    releaseDate: '2000-11-13',
    director: 'Daft Punk',
    cast: ['Guy-Manuel de Homem-Christo', 'Thomas Bangalter', 'Romanthony'],
    synopsis: 'Himno legendario de la música electrónica francesa y house cósmico, tema central de la película de anime Interstella 5555.',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    genres: ['Electrónica', 'French House', 'Disco'],
    averageRating: 5.0,
    ratingsCount: 310,
    whereToWatchOrRead: [
      { id: 'p-spotify', name: 'Spotify', type: 'stream', color: '#1DB954', url: 'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV' },
      { id: 'p-apple-music', name: 'Apple Music', type: 'stream', color: '#FA2D48', url: 'https://music.apple.com' }
    ],
    externalLinks: [
      { label: 'Spotify', url: 'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T14:00:00Z',
    comments: []
  },
  {
    id: 'cult-music-2',
    title: 'Bohemian Rhapsody',
    originalTitle: 'Álbum: A Night at the Opera',
    category: 'music',
    year: 1975,
    releaseDate: '1975-10-31',
    director: 'Queen (Freddie Mercury)',
    cast: ['Freddie Mercury', 'Brian May', 'Roger Taylor', 'John Deacon'],
    synopsis: 'Suite de rock de seis minutos compuesta por una introducción coral, una balada, un solo de guitarra, una sección operística y una coda de hard rock.',
    posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    genres: ['Rock Progresivo', 'Hard Rock', 'Ópera Rock'],
    averageRating: 5.0,
    ratingsCount: 420,
    whereToWatchOrRead: [
      { id: 'p-spotify', name: 'Spotify', type: 'stream', color: '#1DB954', url: 'https://open.spotify.com/track/7tFiyTwD0nx5a1eklYtX2J' },
      { id: 'p-apple-music', name: 'Apple Music', type: 'stream', color: '#FA2D48', url: 'https://music.apple.com' }
    ],
    externalLinks: [
      { label: 'Spotify', url: 'https://open.spotify.com/track/7tFiyTwD0nx5a1eklYtX2J' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u2', name: 'Sofía', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T15:00:00Z',
    comments: []
  },

  // RECIPES
  {
    id: 'cult-recipe-1',
    title: 'Spaghetti alla Carbonara Tradicional',
    originalTitle: 'Pasta • Cocina Italiana',
    category: 'recipe',
    year: 2024,
    director: 'Cocina: Roma, Italia',
    cast: ['Spaghetti', 'Guanciale', 'Huevos frescos (yemas)', 'Queso Pecorino Romano', 'Pimienta negra'],
    synopsis: 'La auténtica carbonara romana: sin crema ni cebolla. El secreto reside en la emulsión de las yemas con el pecorino rallado y el agua de cocción de la pasta.',
    posterUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&auto=format&fit=crop&q=80',
    genres: ['Pasta', 'Cocina Italiana', 'Plato Principal'],
    averageRating: 4.9,
    ratingsCount: 110,
    whereToWatchOrRead: [
      { id: 'p-youtube', name: 'Tutorial en Video', type: 'stream', color: '#FF0000', url: 'https://www.youtube.com/results?search_query=autentica+carbonara+romana' }
    ],
    externalLinks: [
      { label: 'Video Receta en YouTube', url: 'https://www.youtube.com/results?search_query=autentica+carbonara+romana' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u3', name: 'Matías', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T16:00:00Z',
    comments: []
  },
  {
    id: 'cult-recipe-2',
    title: 'Ramen Shoyu Tradicional',
    originalTitle: 'Sopa • Cocina Japonesa',
    category: 'recipe',
    year: 2024,
    director: 'Cocina: Tokio, Japón',
    cast: ['Fideos ramen', 'Caldo Dashi / Chintan', 'Tare de Shoyu', 'Chashu de cerdo', 'Huevo ajitsuke tamago', 'Alga Nori'],
    synopsis: 'Ramen clásico a base de salsa de soya añejada, caldo claro cocinado a fuego lento durante horas y fideos con textura perfecta.',
    posterUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    genres: ['Sopas', 'Cocina Japonesa', 'Comfort Food'],
    averageRating: 4.9,
    ratingsCount: 88,
    whereToWatchOrRead: [
      { id: 'p-youtube', name: 'Tutorial en Video', type: 'stream', color: '#FF0000', url: 'https://www.youtube.com/results?search_query=receta+ramen+shoyu+casero' }
    ],
    externalLinks: [
      { label: 'Video en YouTube', url: 'https://www.youtube.com/results?search_query=receta+ramen+shoyu+casero' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u4', name: 'Camila', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T17:00:00Z',
    comments: []
  },

  // PLACES
  {
    id: 'cult-place-1',
    title: 'Santuario Histórico de Machu Picchu',
    originalTitle: 'Machu Pikchu',
    category: 'place',
    year: 1450,
    director: 'Ubicación: Cusco, Perú',
    cast: ['Maravilla del Mundo', 'Imperio Inca', 'Patrimonio UNESCO'],
    synopsis: 'Antigua llacta incaica construida a mediados del siglo XV en el promontorio rocoso que une las montañas Machu Picchu y Huayna Picchu.',
    posterUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1200&auto=format&fit=crop&q=80',
    genres: ['Patrimonio Mundial', 'Arqueología', 'Maravilla del Mundo'],
    averageRating: 5.0,
    ratingsCount: 520,
    whereToWatchOrRead: [
      { id: 'p-google-maps', name: 'Google Maps', type: 'read', color: '#4285F4', url: 'https://www.google.com/maps/search/?api=1&query=Machu+Picchu+Peru' },
      { id: 'p-wikipedia', name: 'Wikipedia', type: 'read', color: '#202124', url: 'https://es.wikipedia.org/wiki/Machu_Picchu' }
    ],
    externalLinks: [
      { label: 'Google Maps', url: 'https://www.google.com/maps/search/?api=1&query=Machu+Picchu+Peru' },
      { label: 'Wikipedia', url: 'https://es.wikipedia.org/wiki/Machu_Picchu' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u1', name: 'Luciano', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T18:00:00Z',
    comments: []
  },
  {
    id: 'cult-place-2',
    title: 'Kioto y sus Monumentos Históricos',
    originalTitle: 'Kyōto-shi (京都市)',
    category: 'place',
    year: 794,
    director: 'Ubicación: Prefectura de Kioto, Japón',
    cast: ['Templos Zen', 'Santuarios Shinto', 'Jardines Japoneses'],
    synopsis: 'La capital imperial de Japón durante más de mil años, hogar del Pabellón Dorado (Kinkaku-ji), el bosque de bambú de Arashiyama y miles de templos sublimes.',
    posterUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80',
    genres: ['Cultura Japonesa', 'Templos', 'Historia'],
    averageRating: 4.9,
    ratingsCount: 230,
    whereToWatchOrRead: [
      { id: 'p-google-maps', name: 'Google Maps', type: 'read', color: '#4285F4', url: 'https://www.google.com/maps/search/?api=1&query=Kyoto+Japan' },
      { id: 'p-wikipedia', name: 'Wikipedia', type: 'read', color: '#202124', url: 'https://es.wikipedia.org/wiki/Kioto' }
    ],
    externalLinks: [
      { label: 'Google Maps', url: 'https://www.google.com/maps/search/?api=1&query=Kyoto+Japan' },
      { label: 'Wikipedia', url: 'https://es.wikipedia.org/wiki/Kioto' }
    ],
    isManualEntry: false,
    addedBy: { id: 'u2', name: 'Sofía', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' },
    addedAt: '2026-03-05T19:00:00Z',
    comments: []
  }
];

export interface SearchOptions {
  category?: MediaCategory | 'all';
  /** With category 'all', restricts which providers are queried (e.g. the list's allowed types). */
  categories?: MediaCategory[];
  signal?: AbortSignal;
}

export const MIN_SEARCH_QUERY_LENGTH = 2;

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 50;
const searchCache = new Map<string, { at: number; items: MediaItem[] }>();

const readCache = (key: string): MediaItem[] | null => {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.items;
};

const writeCache = (key: string, items: MediaItem[]) => {
  searchCache.delete(key);
  searchCache.set(key, { at: Date.now(), items });
  if (searchCache.size > SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey !== undefined) searchCache.delete(oldestKey);
  }
};

const createAbortError = () => {
  const error = new Error('Search aborted');
  error.name = 'AbortError';
  return error;
};

const searchJikanAnime = async (cleanQuery: string, signal?: AbortSignal): Promise<MediaItem[]> => {
  const { controller, timeoutId } = createTimeoutController(3500, signal);
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanQuery)}&limit=5`, {
      signal: controller.signal
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) return [];

    const apiResults: MediaItem[] = data.data.map((item: any) => ({
      id: `jikan-${item.mal_id}`,
      title: item.title,
      originalTitle: item.title_japanese || item.title_english,
      category: 'anime' as MediaCategory,
      year: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : 2020),
      releaseDate: item.aired?.from ? item.aired.from.split('T')[0] : (item.aired?.string || undefined),
      director: item.studios?.[0]?.name ? `Estudio: ${item.studios[0].name}` : undefined,
      cast: item.producers?.map((p: any) => p.name).slice(0, 5),
      synopsis: item.synopsis || 'Sin sinopsis disponible.',
      posterUrl: item.images?.webp?.image_url || item.images?.jpg?.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      genres: item.genres?.map((g: any) => g.name) || ['Anime'],
      averageRating: item.score ? Math.round((item.score / 2) * 10) / 10 : 4.5,
      ratingsCount: item.scored_by || 15,
      // Las plataformas reales se piden a /anime/{id}/streaming al abrir el detalle
      whereToWatchOrRead: [],
      externalLinks: [
        { label: 'MyAnimeList', url: item.url }
      ],
      isManualEntry: false,
      addedBy: { id: 'current-user', name: 'Tú', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
      addedAt: new Date().toISOString(),
      comments: []
    }));

    return apiResults;
  } finally {
    clearTimeout(timeoutId);
  }
};

const searchOpenLibrary = async (cleanQuery: string, signal?: AbortSignal): Promise<MediaItem[]> => {
  const { controller, timeoutId } = createTimeoutController(3500, signal);
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=5`, {
      signal: controller.signal
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return [];

    const bookResults: MediaItem[] = data.docs.slice(0, 5).map((doc: any) => ({
      id: `ol-${doc.key?.replace('/works/', '') || Math.random().toString()}`,
      title: doc.title,
      originalTitle: doc.title_suggest,
      category: 'book' as MediaCategory,
      year: doc.first_publish_year || 2000,
      releaseDate: doc.first_publish_year ? String(doc.first_publish_year) : (doc.publish_date?.[0] || undefined),
      director: doc.author_name?.[0] ? `Autor: ${doc.author_name[0]}` : undefined,
      cast: doc.author_name?.slice(0, 4),
      synopsis: doc.first_sentence?.[0] || `Obra clásica por ${doc.author_name?.[0] || 'Autor Desconocido'}.`,
      posterUrl: doc.cover_i 
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` 
        : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      genres: doc.subject?.slice(0, 3) || ['Literatura'],
      averageRating: 4.7,
      ratingsCount: 20,
      whereToWatchOrRead: [
        {
          id: 'p-openlibrary',
          name: 'Open Library',
          type: 'borrow',
          color: '#006699',
          logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://openlibrary.org&size=128',
        },
        {
          id: 'p-kindle',
          name: 'Amazon Kindle',
          type: 'read',
          color: '#E67E22',
          logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://amazon.com&size=128',
        }
      ],
      externalLinks: [
        { label: 'Open Library', url: `https://openlibrary.org${doc.key}` }
      ],
      isManualEntry: false,
      addedBy: { id: 'current-user', name: 'Tú', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' },
      addedAt: new Date().toISOString(),
      comments: []
    }));

    return bookResults;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const searchMedia = async (query: string, options?: SearchOptions): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  const lowerQuery = cleanQuery.toLowerCase();
  const category = options?.category || 'all';
  const categories = options?.categories;
  const signal = options?.signal;
  const wants = (c: MediaCategory) =>
    category === c || (category === 'all' && (!categories || categories.includes(c)));

  if (!cleanQuery) {
    return CURATED_CULT_CATALOG.filter(item => wants(item.category));
  }

  const cacheKey = `${category}:${categories ? [...categories].sort().join(',') : '*'}::${lowerQuery}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;


  // Los proveedores se consultan en paralelo; el orden del array define el orden de los resultados
  const providers: { name: string; run: () => Promise<MediaItem[]> }[] = [];

  if ((wants('movie') || wants('series')) && isTmdbConfigured()) {
    const tmdbCategory = category === 'movie' ? 'movie' : category === 'series' ? 'series' : 'all';
    providers.push({ name: 'TMDB', run: () => searchTmdb(cleanQuery, tmdbCategory, 6, signal) });
  }
  if (wants('manga')) providers.push({ name: 'MangaDex', run: () => searchMangaDex(cleanQuery, 6, signal) });
  if (wants('anime')) providers.push({ name: 'Jikan', run: () => searchJikanAnime(cleanQuery, signal) });
  if (wants('book')) providers.push({ name: 'Open Library', run: () => searchOpenLibrary(cleanQuery, signal) });
  if (wants('game')) providers.push({ name: 'RAWG', run: () => searchRawg(cleanQuery, category === 'game' ? 8 : 4, signal) });
  if (wants('podcast')) providers.push({ name: 'Podcasts', run: () => searchPodcasts(cleanQuery, category === 'podcast' ? 8 : 3, signal) });
  if (wants('music')) providers.push({ name: 'Música', run: () => searchMusic(cleanQuery, category === 'music' ? 8 : 3, signal) });
  if (wants('recipe')) providers.push({ name: 'Recetas', run: () => searchRecipes(cleanQuery, category === 'recipe' ? 8 : 3, signal) });
  if (wants('place')) providers.push({ name: 'Lugares', run: () => searchPlaces(cleanQuery, category === 'place' ? 8 : 3, signal) });
  if (wants('boardgame')) providers.push({ name: 'Juegos de Mesa', run: () => searchBoardGames(cleanQuery, category === 'boardgame' ? 8 : 3, signal) });

  const settled = await Promise.allSettled(providers.map(p => p.run()));

  if (signal?.aborted) throw createAbortError();

  const results: MediaItem[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      results.push(...outcome.value);
    } else if (!isAbortError(outcome.reason)) {
      console.warn(`Error en búsqueda de ${providers[index].name}:`, outcome.reason);
    }
  });

  // 11. Complemento y fallback con el catálogo curado local
  const localMatches = CURATED_CULT_CATALOG.filter(item => {
    const matchesCategory = wants(item.category);
    const matchesQuery =
      item.title.toLowerCase().includes(lowerQuery) ||
      (item.originalTitle && item.originalTitle.toLowerCase().includes(lowerQuery)) ||
      item.genres.some(g => g.toLowerCase().includes(lowerQuery)) ||
      item.synopsis.toLowerCase().includes(lowerQuery);
    return matchesCategory && matchesQuery;
  });

  // Evitar duplicados por título y categoría si ya fueron obtenidos de la API
  for (const localItem of localMatches) {
    const alreadyPresent = results.some(
      r => r.title.toLowerCase() === localItem.title.toLowerCase() && r.category === localItem.category
    );
    if (!alreadyPresent) {
      results.push(localItem);
    }
  }

  writeCache(cacheKey, results);
  return results;
};
