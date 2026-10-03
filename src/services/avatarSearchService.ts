export interface AvatarSearchResult {
  id: string;
  name: string;
  category: 'anime' | 'cine_series' | 'graciosas' | 'clasicos' | 'busqueda';
  url: string;
  source?: string;
}

const memoryCache = new Map<string, AvatarSearchResult[]>();

export const AvatarSearchService = {
  async search(query: string): Promise<AvatarSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const cacheKey = trimmed.toLowerCase();
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey)!;
    }

    const results: AvatarSearchResult[] = [];

    // Parallel calls: AniList (anime/manga) and TVMaze + Wikipedia (cinema/series)
    const promises = [
      this.searchAniList(trimmed),
      this.searchTVMaze(trimmed),
      this.searchWikipedia(trimmed),
    ];

    const settled = await Promise.allSettled(promises);
    for (const res of settled) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        results.push(...res.value);
      }
    }

    // Deduplicate by URL or Name
    const seenUrls = new Set<string>();
    const deduplicated = results.filter(item => {
      if (!item.url || seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    memoryCache.set(cacheKey, deduplicated);
    return deduplicated;
  },

  async searchAniList(query: string): Promise<AvatarSearchResult[]> {
    try {
      const graphqlQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 8) {
            characters(search: $search) {
              id
              name {
                full
              }
              image {
                large
                medium
              }
            }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { search: query },
        }),
      });

      if (!response.ok) return [];
      const json = await response.json();
      const list = json?.data?.Page?.characters || [];

      return list
        .filter((c: any) => c.image?.large || c.image?.medium)
        .map((c: any) => ({
          id: `anilist-${c.id}`,
          name: c.name?.full || query,
          category: 'anime' as const,
          url: c.image.large || c.image.medium,
          source: 'AniList',
        }));
    } catch (e) {
      console.warn('AniList search failed:', e);
      return [];
    }
  },

  async searchTVMaze(query: string): Promise<AvatarSearchResult[]> {
    try {
      const url = `https://api.tvmaze.com/search/people?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const list = await res.json();

      return list
        .filter((item: any) => item?.person?.image?.medium || item?.person?.image?.original)
        .slice(0, 6)
        .map((item: any) => ({
          id: `tvmaze-${item.person.id}`,
          name: item.person.name,
          category: 'cine_series' as const,
          url: item.person.image.original || item.person.image.medium,
          source: 'TVMaze',
        }));
    } catch (e) {
      console.warn('TVMaze search failed:', e);
      return [];
    }
  },

  async searchWikipedia(query: string): Promise<AvatarSearchResult[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=300&generator=prefixsearch&gpssearch=${encodeURIComponent(
        query
      )}&gpslimit=6`;

      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const pages = json?.query?.pages;
      if (!pages) return [];

      return Object.values(pages)
        .filter((p: any) => p.thumbnail?.source)
        .map((p: any) => ({
          id: `wiki-${p.pageid}`,
          name: p.title,
          category: 'cine_series' as const,
          url: p.thumbnail.source,
          source: 'Wikipedia',
        }));
    } catch (e) {
      console.warn('Wikipedia image search failed:', e);
      return [];
    }
  },
};
