/**
 * Cliente para Jikan API (MyAnimeList unofficial API)
 * https://jikan.moe/
 * Documentación: https://docs.api.jikan.moe/
 */

const JIKAN_URL = 'https://api.jikan.moe/v4';

// Rate limiting: Jikan permite 3 requests por segundo
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // ms entre requests

/**
 * Ejecuta una petición a Jikan con rate limiting
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} params - Parámetros de query
 * @returns {Promise<Object>} Respuesta de Jikan
 */
async function jikanRequest(endpoint, params = {}) {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  // Construir URL con parámetros
  const url = new URL(`${JIKAN_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (response.status === 429) {
    // Rate limited, esperar y reintentar
    console.log('Jikan rate limited, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return jikanRequest(endpoint, params);
  }

  if (!response.ok) {
    throw new Error(`Jikan API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Busca manga en Jikan/MyAnimeList
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas encontrados
 */
export async function searchJikan(query, limit = 20) {
  try {
    console.log('Jikan search:', query);

    const data = await jikanRequest('/manga', {
      q: query,
      limit: limit,
      order_by: 'popularity',
      sort: 'asc'
    });

    return (data.data || []).map(manga => formatJikanManga(manga));
  } catch (error) {
    console.error('Error searching Jikan:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un manga por ID
 * @param {number} id - MAL ID
 * @returns {Promise<Object>} Detalles del manga
 */
export async function getJikanDetails(id) {
  try {
    console.log('Jikan details:', id);

    // Obtener detalles básicos
    const data = await jikanRequest(`/manga/${id}/full`);
    const manga = data.data;

    return formatJikanDetails(manga);
  } catch (error) {
    console.error('Error getting Jikan details:', error);
    throw error;
  }
}

/**
 * Obtiene mangas populares
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas populares
 */
export async function getPopularManga(limit = 20) {
  try {
    const data = await jikanRequest('/top/manga', {
      limit: limit,
      filter: 'bypopularity'
    });

    return (data.data || []).map(manga => formatJikanManga(manga));
  } catch (error) {
    console.error('Error getting popular manga:', error);
    throw error;
  }
}

/**
 * Obtiene mangas publicándose actualmente
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas en publicación
 */
export async function getPublishingManga(limit = 20) {
  try {
    const data = await jikanRequest('/manga', {
      status: 'publishing',
      order_by: 'popularity',
      sort: 'asc',
      limit: limit
    });

    return (data.data || []).map(manga => formatJikanManga(manga));
  } catch (error) {
    console.error('Error getting publishing manga:', error);
    throw error;
  }
}

/**
 * Formatea un manga de Jikan al formato de la app
 */
function formatJikanManga(manga) {
  // Determinar tipo
  let type = 'manga';
  const typeStr = (manga.type || '').toLowerCase();
  if (typeStr === 'manhwa' || typeStr === 'korean comic') {
    type = 'manhwa';
  } else if (typeStr === 'manhua' || typeStr === 'chinese comic') {
    type = 'manhua';
  } else if (typeStr === 'light novel' || typeStr === 'novel') {
    type = 'lightnovel';
  } else if (typeStr === 'one-shot') {
    type = 'oneshot';
  }

  // Extraer géneros
  const genres = (manga.genres || []).map(g => g.name);
  const themes = (manga.themes || []).map(t => t.name);
  const demographics = (manga.demographics || []).map(d => d.name);

  return {
    id: `jikan-${manga.mal_id}`,
    malId: manga.mal_id,
    title: manga.title,
    titleEnglish: manga.title_english,
    titleJapanese: manga.title_japanese,
    titleSynonyms: manga.title_synonyms || [],
    description: manga.synopsis || 'Sin descripción disponible',
    coverUrl: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || '/images/no-cover.jpg',
    type,
    status: mapStatus(manga.status),
    year: manga.published?.prop?.from?.year,
    chapters: manga.chapters,
    volumes: manga.volumes,
    genres: [...genres, ...themes, ...demographics],
    score: manga.score,
    scoredBy: manga.scored_by,
    rank: manga.rank,
    popularity: manga.popularity,
    members: manga.members,
    favorites: manga.favorites,
    isPublishing: manga.publishing,
    source: 'jikan',
    sourceUrl: manga.url
  };
}

/**
 * Formatea detalles completos de Jikan
 */
function formatJikanDetails(manga) {
  const basic = formatJikanManga(manga);

  // Extraer autores
  const authors = (manga.authors || []).map(a => a.name);
  const author = authors[0] || 'Desconocido';

  // Serialización
  const serializations = (manga.serializations || []).map(s => s.name);

  // Relaciones
  const relations = (manga.relations || []).flatMap(rel =>
    rel.entry.map(entry => ({
      id: `jikan-${entry.mal_id}`,
      malId: entry.mal_id,
      title: entry.name,
      type: entry.type,
      relation: rel.relation,
      url: entry.url
    }))
  );

  // Links externos
  const externalLinks = (manga.external || []).map(link => ({
    site: link.name,
    url: link.url
  }));

  return {
    ...basic,
    author,
    authors,
    artist: authors[1] || author,
    serializations,
    relations,
    externalLinks,
    background: manga.background,
    // Jikan no tiene capítulos para leer
    chapters: [],
    totalChapters: manga.chapters || 0,
    note: 'MyAnimeList solo provee información. Para leer, busca en otras fuentes.'
  };
}

/**
 * Mapea el estado de Jikan al formato de la app
 */
function mapStatus(status) {
  if (!status) return 'ongoing';

  const statusLower = status.toLowerCase();
  if (statusLower.includes('finished') || statusLower.includes('completed')) {
    return 'completed';
  } else if (statusLower.includes('publishing') || statusLower.includes('ongoing')) {
    return 'ongoing';
  } else if (statusLower.includes('hiatus')) {
    return 'hiatus';
  } else if (statusLower.includes('discontinued')) {
    return 'cancelled';
  }
  return 'ongoing';
}

/**
 * Formatea un resultado para el search unificado
 */
export function formatJikanResult(manga) {
  return {
    id: manga.id,
    title: manga.title,
    description: manga.description || '',
    coverUrl: manga.coverUrl,
    author: manga.author || 'Desconocido',
    artist: manga.artist || 'Desconocido',
    status: manga.status,
    year: manga.year,
    type: manga.type,
    tags: (manga.genres || []).slice(0, 5),
    score: manga.score,
    source: 'jikan',
    sourceUrl: manga.sourceUrl
  };
}
