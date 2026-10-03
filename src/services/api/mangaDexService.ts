import { MediaItem, ReleaseChapterInfo, StreamingProvider } from '../../types';
import { createTimeoutController } from './requestController';

const MANGADEX_BASE_URL = 'https://api.mangadex.org';
const MANGADEX_COVER_BASE = 'https://uploads.mangadex.org/covers';

/**
 * Busca mangas en la API oficial de MangaDex v5
 */
export const searchMangaDex = async (
  query: string,
  limit: number = 6,
  signal?: AbortSignal
): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const { controller, timeoutId } = createTimeoutController(4000, signal);

    const url = `${MANGADEX_BASE_URL}/manga?title=${encodeURIComponent(
      cleanQuery
    )}&limit=${limit}&includes[]=cover_art&includes[]=author&includes[]=artist&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`MangaDex search failed with status: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return [];
    }

    const results: MediaItem[] = data.data.map((item: any) => {
      const mangaId: string = item.id;
      const attrs = item.attributes || {};

      // 1. Título preferido (español -> inglés -> primer disponible)
      const titles = attrs.title || {};
      const title: string =
        titles['es'] ||
        titles['es-la'] ||
        titles['en'] ||
        titles['ja-ro'] ||
        Object.values(titles)[0] ||
        'Manga sin título';

      // Título original (japonés o alternativo)
      const originalTitle: string | undefined =
        titles['ja'] || titles['ja-ro'] || undefined;

      // 2. Sinopsis (preferir español, fallback a inglés o texto descriptivo)
      const descriptions = attrs.description || {};
      const synopsis: string =
        descriptions['es'] ||
        descriptions['es-la'] ||
        descriptions['en'] ||
        'Sinopsis no disponible en español.';

      // 3. Carátula oficial desde relationships cover_art
      let coverFileName: string | undefined;
      if (Array.isArray(item.relationships)) {
        const coverRel = item.relationships.find(
          (rel: any) => rel.type === 'cover_art'
        );
        if (coverRel && coverRel.attributes && coverRel.attributes.fileName) {
          coverFileName = coverRel.attributes.fileName;
        }
      }

      const posterUrl = coverFileName
        ? `${MANGADEX_COVER_BASE}/${mangaId}/${coverFileName}.512.jpg`
        : 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80';

      // 4. Géneros / Tags
      const genres: string[] = [];
      if (Array.isArray(attrs.tags)) {
        attrs.tags.forEach((tag: any) => {
          const name = tag?.attributes?.name?.['en'];
          if (name) genres.push(name);
        });
      }
      if (genres.length === 0) {
        genres.push('Manga');
      }

      // 5. Año
      const year = attrs.year || (attrs.createdAt ? new Date(attrs.createdAt).getFullYear() : 2020);

      // 6. Proveedores de lectura
      const readingProviders: StreamingProvider[] = [
        {
          id: `p-mangadex-${mangaId}`,
          name: 'MangaDex',
          type: 'read',
          color: '#FF6740',
          logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://mangadex.org&size=128',
          url: `https://mangadex.org/title/${mangaId}`,
        },
        {
          id: 'p-kindle-manga',
          name: 'Amazon Kindle',
          type: 'read',
          color: '#E67E22',
          logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://amazon.com&size=128',
        },
      ];

      const externalLinks = [
        {
          label: 'MangaDex',
          url: `https://mangadex.org/title/${mangaId}`,
        },
      ];

      let authorName: string | undefined;
      if (Array.isArray(item.relationships)) {
        const authorRel = item.relationships.find(
          (rel: any) => rel.type === 'author' || rel.type === 'artist'
        );
        if (authorRel && authorRel.attributes && authorRel.attributes.name) {
          authorName = authorRel.attributes.name;
        }
      }

      const releaseDate = attrs.year
        ? String(attrs.year)
        : attrs.createdAt
        ? attrs.createdAt.split('T')[0]
        : undefined;

      return {
        id: `mangadex-${mangaId}`,
        title,
        originalTitle: originalTitle !== title ? originalTitle : undefined,
        category: 'manga',
        year: typeof year === 'number' ? year : 2020,
        releaseDate,
        director: authorName ? `Autor: ${authorName}` : undefined,
        cast: authorName ? [authorName] : undefined,
        synopsis,
        posterUrl,
        genres: genres.slice(0, 4),
        averageRating: 4.8, // MangaDex v5 público no expone rating directo en /manga
        ratingsCount: 50,
        whereToWatchOrRead: readingProviders,
        externalLinks,
        isManualEntry: false,
        addedBy: {
          id: 'current-user',
          name: 'Tú',
          avatar:
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        },
        addedAt: new Date().toISOString(),
        comments: [],
      };
    });

    return results;
  } catch (error) {
    console.warn('Error en MangaDex API:', error);
    return [];
  }
};

/**
 * Consulta el último capítulo publicado de un manga en MangaDex v5
 */
export const fetchMangaLatestChapter = async (
  mangaId: string
): Promise<{ latestChapter?: ReleaseChapterInfo; status?: string } | null> => {
  const cleanId = mangaId.replace(/^mangadex-/, '').trim();
  if (!cleanId) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `${MANGADEX_BASE_URL}/manga/${cleanId}/feed?limit=1&order[chapter]=desc&translatedLanguage[]=es&translatedLanguage[]=es-la&translatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      // Intento fallback sin filtro de idioma
      const fallbackUrl = `${MANGADEX_BASE_URL}/manga/${cleanId}/feed?limit=1&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json' },
      });
      if (!fallbackRes.ok) return null;
      const fallbackData = await fallbackRes.json();
      if (!fallbackData.data || !Array.isArray(fallbackData.data) || fallbackData.data.length === 0) {
        return null;
      }
      const item = fallbackData.data[0];
      const attrs = item.attributes || {};
      return {
        latestChapter: {
          chapterNumber: attrs.chapter || '1',
          title: attrs.title || undefined,
          publishAt: attrs.publishAt || attrs.readableAt || new Date().toISOString(),
        },
      };
    }

    const item = data.data[0];
    const attrs = item.attributes || {};
    return {
      latestChapter: {
        chapterNumber: attrs.chapter || '1',
        title: attrs.title || undefined,
        publishAt: attrs.publishAt || attrs.readableAt || new Date().toISOString(),
      },
    };
  } catch (error) {
    console.warn(`Error fetching latest chapter for manga ${mangaId} from MangaDex:`, error);
    return null;
  }
};

