/**
 * Cliente para MangaDex API
 * Documentación: https://api.mangadex.org/docs/
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://api.mangadex.org';

/**
 * Busca mangas por título en español
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados (default: 20)
 * @returns {Promise<Array>} Lista de mangas encontrados
 */
export async function searchManga(query, limit = 20) {
  try {
    // Usar URL simple sin filtros de idioma que pueden causar problemas
    const url = `${BASE_URL}/manga?title=${encodeURIComponent(query)}&limit=${limit}&includes[]=cover_art&order[relevance]=desc`;
    console.log('Fetching:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response:', errorText);
      throw new Error(`MangaDex API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return formatMangaList(data.data);
  } catch (error) {
    console.error('Error searching manga:', error);
    throw error;
  }
}

/**
 * Obtiene información detallada de un manga
 * @param {string} mangaId - ID del manga
 * @returns {Promise<Object>} Información del manga
 */
export async function getMangaDetails(mangaId) {
  try {
    const url = `${BASE_URL}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
    console.log('Fetching manga details:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MangaDex API error: ${response.status}`);
    }

    const data = await response.json();
    return formatMangaDetails(data.data);
  } catch (error) {
    console.error('Error getting manga details:', error);
    throw error;
  }
}

/**
 * Obtiene TODOS los capítulos de un manga (con paginación automática)
 * @param {string} mangaId - ID del manga
 * @param {string} language - Idioma de los capítulos ('es', 'en', 'all')
 * @returns {Promise<Object>} Lista completa de capítulos
 */
export async function getMangaChapters(mangaId, offset = 0, limit = 500, language = 'es') {
  try {
    const allChapters = [];
    let currentOffset = 0;
    let total = 0;
    const batchSize = 100; // MangaDex límite máximo por request

    const langParam = language === 'all' ? '' : `&translatedLanguage[]=${language}`;

    // Primera petición para saber el total
    const firstUrl = `${BASE_URL}/chapter?manga=${mangaId}${langParam}&order[chapter]=asc&offset=0&limit=${batchSize}`;
    console.log('Fetching chapters (batch 1):', firstUrl);

    const firstResponse = await fetch(firstUrl);
    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      console.error('Chapters API Response:', errorText);
      throw new Error(`MangaDex API error: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    total = firstData.total;
    allChapters.push(...firstData.data);
    currentOffset = batchSize;

    console.log(`MangaDex: Total chapters available: ${total}`);

    // Continuar obteniendo el resto de capítulos
    while (currentOffset < total && currentOffset < limit) {
      const url = `${BASE_URL}/chapter?manga=${mangaId}${langParam}&order[chapter]=asc&offset=${currentOffset}&limit=${batchSize}`;
      console.log(`Fetching chapters (offset ${currentOffset}):`, url);

      const response = await fetch(url);
      if (!response.ok) break;

      const data = await response.json();
      if (data.data.length === 0) break;

      allChapters.push(...data.data);
      currentOffset += batchSize;

      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`MangaDex: Loaded ${allChapters.length} chapters`);

    return {
      chapters: formatChapterList(allChapters),
      total: total,
      offset: 0,
      limit: allChapters.length
    };
  } catch (error) {
    console.error('Error getting chapters:', error);
    throw error;
  }
}

/**
 * Obtiene las URLs de las páginas de un capítulo
 * @param {string} chapterId - ID del capítulo
 * @returns {Promise<Object>} URLs de las páginas
 */
export async function getChapterPages(chapterId) {
  try {
    const url = `${BASE_URL}/at-home/server/${chapterId}`;
    console.log('Fetching pages:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pages API Response:', errorText);
      throw new Error(`MangaDex API error: ${response.status}`);
    }

    const data = await response.json();

    // Verificar que el capítulo tiene páginas
    if (!data.chapter || !data.chapter.data || data.chapter.data.length === 0) {
      console.log('Chapter has no pages (external link)');
      return { baseUrl: null, pages: [], isExternal: true };
    }

    const baseUrl = data.baseUrl;
    const chapterHash = data.chapter.hash;
    const pages = data.chapter.data;

    return {
      baseUrl,
      pages: pages.map(page => `${baseUrl}/data/${chapterHash}/${page}`),
      isExternal: false
    };
  } catch (error) {
    console.error('Error getting chapter pages:', error);
    throw error;
  }
}

/**
 * Formatea la lista de mangas a un formato unificado
 */
function formatMangaList(mangas) {
  return mangas.map(manga => {
    const title = manga.attributes.title.es ||
      manga.attributes.title.en ||
      manga.attributes.title['ja-ro'] ||
      Object.values(manga.attributes.title)[0];

    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    const coverId = coverArt?.attributes?.fileName;
    const coverUrl = coverId
      ? `https://uploads.mangadex.org/covers/${manga.id}/${coverId}.512.jpg`
      : '/images/no-cover.jpg';

    return {
      id: manga.id,
      title,
      description: manga.attributes.description?.es || manga.attributes.description?.en || '',
      coverUrl,
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags.map(tag => tag.attributes.name.es || tag.attributes.name.en),
      contentRating: manga.attributes.contentRating,
      originalLanguage: manga.attributes.originalLanguage,
      type: getTypeFromLanguage(manga.attributes.originalLanguage),
      source: 'mangadex'
    };
  });
}

/**
 * Formatea los detalles de un manga
 */
function formatMangaDetails(manga) {
  const title = manga.attributes.title.es ||
    manga.attributes.title.en ||
    manga.attributes.title['ja-ro'] ||
    Object.values(manga.attributes.title)[0];

  const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
  const coverId = coverArt?.attributes?.fileName;
  const coverUrl = coverId
    ? `https://uploads.mangadex.org/covers/${manga.id}/${coverId}.512.jpg`
    : '/images/no-cover.jpg';

  const author = manga.relationships.find(rel => rel.type === 'author');
  const artist = manga.relationships.find(rel => rel.type === 'artist');

  return {
    id: manga.id,
    title,
    alternativeTitles: Object.values(manga.attributes.altTitles).flat(),
    description: manga.attributes.description?.es || manga.attributes.description?.en || '',
    coverUrl,
    status: manga.attributes.status,
    year: manga.attributes.year,
    tags: manga.attributes.tags.map(tag => tag.attributes.name.es || tag.attributes.name.en),
    contentRating: manga.attributes.contentRating,
    originalLanguage: manga.attributes.originalLanguage,
    type: getTypeFromLanguage(manga.attributes.originalLanguage),
    author: author?.attributes?.name || 'Desconocido',
    artist: artist?.attributes?.name || 'Desconocido',
    source: 'mangadex'
  };
}

/**
 * Formatea la lista de capítulos
 */
function formatChapterList(chapters) {
  return chapters.map(chapter => ({
    id: chapter.id,
    chapter: chapter.attributes.chapter || '0',
    title: chapter.attributes.title || `Capítulo ${chapter.attributes.chapter}`,
    volume: chapter.attributes.volume,
    pages: chapter.attributes.pages,
    translatedLanguage: chapter.attributes.translatedLanguage,
    publishAt: chapter.attributes.publishAt,
    readableAt: chapter.attributes.readableAt,
    externalUrl: chapter.attributes.externalUrl || null,
    isExternal: !!chapter.attributes.externalUrl,
    source: 'mangadex'
  }));
}

/**
 * Determina el tipo de contenido basado en el idioma original
 */
function getTypeFromLanguage(lang) {
  switch (lang) {
    case 'ja': return 'manga';
    case 'ko': return 'manhwa';
    case 'zh': return 'manhua';
    default: return 'manga';
  }
}
