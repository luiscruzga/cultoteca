import { MediaItem } from '../../types';
import { createTimeoutController } from './requestController';

export const searchRecipes = async (query: string, limit: number = 8, signal?: AbortSignal): Promise<MediaItem[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const { controller, timeoutId } = createTimeoutController(4000, signal);

    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(cleanQuery)}`;
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!data.meals || !Array.isArray(data.meals)) {
      return [];
    }

    return data.meals.slice(0, limit).map((meal: any) => {
      const title = meal.strMeal || 'Receta';
      const category = meal.strCategory || 'Platillo';
      const area = meal.strArea || 'Internacional';
      
      // Extraer ingredientes principales
      const ingredients: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
          ingredients.push(measure && measure.trim() ? `${measure.trim()} ${ing.trim()}` : ing.trim());
        }
      }

      const instructions = meal.strInstructions 
        ? meal.strInstructions.trim().replace(/\r\n/g, '\n') 
        : 'Sigue la preparación tradicional de este platillo culinario.';

      const youtubeUrl = meal.strYoutube || `https://www.youtube.com/results?search_query=${encodeURIComponent('receta ' + title)}`;
      const sourceUrl = meal.strSource;

      return {
        id: `recipe-${meal.idMeal || Math.random().toString()}`,
        title,
        originalTitle: `${category} • Cocina ${area}`,
        category: 'recipe',
        year: 2024,
        director: `Cocina: ${area}`,
        cast: ingredients.length > 0 ? ingredients : ['Ingredientes frescos'],
        synopsis: instructions,
        posterUrl: meal.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
        genres: [category, `Cocina ${area}`, 'Recetas'].filter((v, i, a) => a.indexOf(v) === i),
        averageRating: 4.8,
        ratingsCount: 30,
        whereToWatchOrRead: [
          {
            id: 'p-youtube',
            name: 'Tutorial en Video',
            type: 'stream',
            color: '#FF0000',
            logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://youtube.com&size=128',
            url: youtubeUrl,
          },
          ...(sourceUrl ? [{
            id: 'p-recipe-source',
            name: 'Receta Web',
            type: 'read' as const,
            color: '#10B981',
            logoUrl: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=' + sourceUrl + '&size=128',
            url: sourceUrl,
          }] : []),
        ],
        externalLinks: [
          ...(meal.strYoutube ? [{ label: 'Video en YouTube', url: meal.strYoutube }] : []),
          ...(sourceUrl ? [{ label: 'Fuente de la Receta', url: sourceUrl }] : []),
          { label: 'Buscar preparación', url: `https://www.google.com/search?q=${encodeURIComponent('receta ' + title)}` },
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
    console.warn('Error al buscar recetas:', error);
    return [];
  }
};
