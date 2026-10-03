import { MediaItem } from '../../types';
import { createTimeoutController } from './requestController';

export const searchMusic = async (query: string, limit: number = 8, signal?: AbortSignal): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const { controller, timeoutId } = createTimeoutController(4000, signal);

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=song&limit=${limit}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => {
      const title = item.trackName || item.collectionName || 'Canción';
      const artist = item.artistName || 'Artista desconocido';
      const album = item.collectionName || '';
      const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024;
      const genre = item.primaryGenreName || 'Música';
      
      const posterUrl = item.artworkUrl100 
        ? item.artworkUrl100.replace('100x100bb', '600x600bb') 
        : (item.artworkUrl60 || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80');

      const appleUrl = item.trackViewUrl || item.collectionViewUrl;
      const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`;
      const youtubeUrl = `https://music.youtube.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`;

      const synopsis = `Tema musical "${title}" de ${artist}${album ? `, perteneciente al álbum "${album}"` : ''}. Género: ${genre}. Publicado en ${year}.`;

      return {
        id: `music-${item.trackId || Math.random().toString()}`,
        title,
        originalTitle: album ? `Álbum: ${album}` : undefined,
        category: 'music',
        year,
        releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : String(year),
        director: `Artista: ${artist}`,
        cast: [artist, ...(album ? [`Álbum: ${album}`] : [])],
        synopsis,
        posterUrl,
        genres: [genre, 'Música'].filter((v, i, a) => a.indexOf(v) === i),
        averageRating: 4.9,
        ratingsCount: 50,
        url: item.previewUrl || undefined,
        siteName: 'Apple Music',
        whereToWatchOrRead: [
          {
            id: 'p-spotify',
            name: 'Spotify',
            type: 'stream',
            color: '#1DB954',
            logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://spotify.com&size=128',
            url: spotifyUrl,
          },
          {
            id: 'p-apple-music',
            name: 'Apple Music',
            type: 'stream',
            color: '#FA2D48',
            logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://music.apple.com&size=128',
            url: appleUrl,
          },
          {
            id: 'p-youtube-music',
            name: 'YouTube Music',
            type: 'stream',
            color: '#FF0000',
            logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://music.youtube.com&size=128',
            url: youtubeUrl,
          },
        ],
        externalLinks: [
          ...(appleUrl ? [{ label: 'Apple Music', url: appleUrl }] : []),
          { label: 'Spotify', url: spotifyUrl },
          { label: 'YouTube Music', url: youtubeUrl },
          ...(item.previewUrl ? [{ label: 'Escuchar preview (30s)', url: item.previewUrl }] : []),
        ],
        isManualEntry: false,
        addedBy: {
          id: 'current-user',
          name: 'Tú',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        },
        addedAt: new Date().toISOString(),
        comments: [],
      };
    });
  } catch (error) {
    console.warn('Error al buscar música:', error);
    return [];
  }
};
