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
 * Obtiene los capítulos de un manga en español
 * @param {string} mangaId - ID del manga
 * @param {number} offset - Offset para paginación
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>} Lista de capítulos
 */
export async function getMangaChapters(mangaId, offset = 0, limit = 100) {
  try {
    const url = `${BASE_URL}/chapter?manga=${mangaId}&translatedLanguage[]=es&order[chapter]=asc&offset=${offset}&limit=${limit}`;
    console.log('Fetching chapters:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chapters API Response:', errorText);
      throw new Error(`MangaDex API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      chapters: formatChapterList(data.data),
      total: data.total,
      offset: offset,
      limit: limit
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
    const response = await fetch(`${BASE_URL}/at-home/server/${chapterId}`);

    if (!response.ok) {
      throw new Error(`MangaDex API error: ${response.status}`);
    }

    const data = await response.json();
    const baseUrl = data.baseUrl;
    const chapterHash = data.chapter.hash;
    const pages = data.chapter.data;

    return {
      baseUrl,
      pages: pages.map(page => `${baseUrl}/data/${chapterHash}/${page}`)
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
