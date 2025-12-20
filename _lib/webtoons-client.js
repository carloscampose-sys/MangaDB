/**
 * Cliente para Webtoons (scraping)
 * Fuente oficial de webtoons en español
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.webtoons.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Busca webtoons por término
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de webtoons encontrados
 */
export async function searchWebtoons(query, limit = 20) {
  try {
    const url = `${BASE_URL}/es/search?keyword=${encodeURIComponent(query)}`;
    console.log('Webtoons search:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Webtoons error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $('li').each((i, el) => {
      if (results.length >= limit) return false;

      const link = $(el).find('a[href*="title_no"]').first();
      const href = link.attr('href');

      if (href) {
        const title = $(el).find('.subj, .title, h3, h4, strong').first().text().trim();
        const author = $(el).find('.author, .info').first().text().trim();
        const img = $(el).find('img').attr('src');
        const genre = $(el).find('.genre, .type').first().text().trim();

        // Extraer ID del título de la URL
        const titleNoMatch = href.match(/title_no=(\d+)/);
        const titleNo = titleNoMatch ? titleNoMatch[1] : null;

        // Extraer categoría de la URL
        const categoryMatch = href.match(/\/es\/([^/]+)\/([^/]+)\//);
        const category = categoryMatch ? categoryMatch[1] : 'unknown';
        const slug = categoryMatch ? categoryMatch[2] : '';

        if (title && titleNo) {
          // Usar proxy para las imágenes de Webtoons (bloquean peticiones sin Referer)
          const coverUrl = img ? `/api/proxy-image?url=${encodeURIComponent(img)}` : '/images/no-cover.jpg';

          results.push({
            id: `webtoons-${titleNo}`,
            titleNo,
            title,
            author: cleanAuthorName(author),
            coverUrl,
            genre: genre || category,
            category,
            slug,
            url: href,
            type: 'manhwa', // Webtoons son principalmente manhwa/webtoon
            source: 'webtoons'
          });
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching Webtoons:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un webtoon
 * @param {string} titleNo - ID del título
 * @returns {Promise<Object>} Detalles del webtoon
 */
export async function getWebtoonDetails(titleNo) {
  try {
    // Primero buscar el webtoon para obtener su URL completa
    const searchUrl = `${BASE_URL}/es/search?keyword=${titleNo}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`Webtoons error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Buscar el webtoon específico
    let webtoonUrl = null;
    $('a[href*="title_no"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes(`title_no=${titleNo}`) && href.includes('/list')) {
        webtoonUrl = href;
        return false;
      }
    });

    if (!webtoonUrl) {
      throw new Error('Webtoon not found');
    }

    // Obtener página de detalles (lista de episodios)
    const detailResponse = await fetch(webtoonUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    const detailHtml = await detailResponse.text();
    const $detail = cheerio.load(detailHtml);

    const title = $detail('.info .subj, h1.subj, .subj').first().text().trim();
    const authorArea = $detail('.info .author_area, .author_area').first().text().trim();
    const author = authorArea.split('\n')[0].trim(); // Solo primera línea
    const description = $detail('.summary').first().text().trim();
    const rawCoverUrl = $detail('.detail_body img, .thmb img').first().attr('src');
    const genre = $detail('.genre').first().text().trim();
    const rating = $detail('.grade_num').first().text().trim();
    const views = $detail('.view_count, ._view').first().text().trim();

    // Usar proxy para las imágenes de Webtoons
    const coverUrl = rawCoverUrl ? `/api/proxy-image?url=${encodeURIComponent(rawCoverUrl)}` : '/images/no-cover.jpg';

    return {
      id: `webtoons-${titleNo}`,
      titleNo,
      title: title || 'Sin título',
      author: cleanAuthorName(author),
      description: description || 'Sin descripción disponible',
      coverUrl,
      genre,
      rating,
      views,
      type: 'manhwa',
      status: 'ongoing',
      url: webtoonUrl,
      source: 'webtoons'
    };
  } catch (error) {
    console.error('Error getting webtoon details:', error);
    throw error;
  }
}

/**
 * Obtiene lista de capítulos de un webtoon
 * @param {string} titleNo - ID del título
 * @param {number} page - Página de resultados
 * @returns {Promise<Object>} Lista de capítulos
 */
export async function getWebtoonChapters(titleNo, page = 1) {
  try {
    // Obtener la URL del webtoon primero
    return await getChaptersFromListPage(titleNo, page);
  } catch (error) {
    console.error('Error getting webtoon chapters:', error);
    return { chapters: [], total: 0 };
  }
}

/**
 * Obtiene capítulos desde la página de lista
 */
async function getChaptersFromListPage(titleNo, page = 1) {
  try {
    // Buscar el webtoon para obtener su URL
    const searchUrl = `${BASE_URL}/es/search?keyword=${titleNo}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    const searchHtml = await searchResponse.text();
    const $search = cheerio.load(searchHtml);

    let listUrl = null;
    $search('a[href*="title_no"]').each((i, el) => {
      const href = $search(el).attr('href');
      if (href && href.includes(`title_no=${titleNo}`) && href.includes('/list')) {
        listUrl = href;
        return false;
      }
    });

    if (!listUrl) {
      return { chapters: [], total: 0 };
    }

    // Agregar página si es necesario
    const paginatedUrl = page > 1 ? `${listUrl}&page=${page}` : listUrl;

    const response = await fetch(paginatedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    const html = await response.text();
    return parseChaptersHtml(html, titleNo, listUrl);
  } catch (error) {
    console.error('Error fetching chapters from list page:', error);
    return { chapters: [], total: 0 };
  }
}

/**
 * Parsea HTML para extraer capítulos
 */
function parseChaptersHtml(html, titleNo, baseUrl = '') {
  const $ = cheerio.load(html);
  const chapters = [];

  // Buscar episodios en la lista - usar #_listUl li que es el selector correcto
  $('#_listUl li').each((i, el) => {
    const link = $(el).find('a').first();
    let href = link.attr('href');

    if (href) {
      // Asegurar URL absoluta
      if (href.startsWith('/')) {
        href = BASE_URL + href;
      }

      // Extraer episode_no de la URL del viewer
      const episodeMatch = href.match(/episode_no=(\d+)/);
      const episodeNo = episodeMatch ? episodeMatch[1] : String(i + 1);

      const title = $(el).find('.subj span').first().text().trim();
      const date = $(el).find('.date').first().text().trim();
      const thumbnail = $(el).find('img').attr('src');

      chapters.push({
        id: `webtoons-${titleNo}-ep${episodeNo}`,
        episodeNo,
        chapter: episodeNo,
        title: title || `Episodio ${episodeNo}`,
        publishAt: date,
        date,
        thumbnail,
        url: href,
        source: 'webtoons'
      });
    }
  });

  // Los capítulos ya vienen ordenados (más reciente primero)
  return {
    chapters,
    total: chapters.length
  };
}

/**
 * Obtiene las páginas/imágenes de un episodio
 * @param {string} titleNo - ID del título
 * @param {string} episodeNo - Número del episodio
 * @returns {Promise<Object>} URLs de las imágenes
 */
export async function getEpisodePages(titleNo, episodeNo) {
  try {
    // Obtener lista de capítulos para encontrar la URL del episodio
    const chaptersData = await getWebtoonChapters(titleNo);
    const chapter = chaptersData.chapters.find(ch =>
      ch.episodeNo === episodeNo || ch.episodeNo === String(episodeNo)
    );

    if (!chapter || !chapter.url) {
      throw new Error(`Episode ${episodeNo} not found for title ${titleNo}`);
    }

    console.log('Fetching episode pages from:', chapter.url);

    const response = await fetch(chapter.url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': BASE_URL + '/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch episode: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pages = [];

    // Buscar imágenes del visor - #_imageList img es el selector correcto
    $('#_imageList img').each((i, el) => {
      const src = $(el).attr('data-url') || $(el).attr('src');
      if (src && (src.includes('webtoon-phinf') || src.includes('pstatic.net'))) {
        pages.push(src);
      }
    });

    return {
      pages,
      total: pages.length,
      source: 'webtoons',
      chapterTitle: chapter.title
    };
  } catch (error) {
    console.error('Error getting episode pages:', error);
    throw error;
  }
}

/**
 * Limpia el nombre del autor
 */
function cleanAuthorName(author) {
  if (!author) return 'Desconocido';
  // Remover texto extra como "Vista", números, etc.
  return author
    .replace(/\d+[MK]?\s*Vista[s]?/gi, '')
    .replace(/\d+[MK]?\s*Vistas/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Desconocido';
}

/**
 * Formatea un webtoon al formato unificado de la app
 */
export function formatWebtoonResult(webtoon) {
  return {
    id: webtoon.id,
    title: webtoon.title,
    description: webtoon.description || '',
    coverUrl: webtoon.coverUrl,
    author: webtoon.author,
    artist: webtoon.author, // En Webtoons suele ser el mismo
    status: webtoon.status || 'ongoing',
    year: null,
    type: 'manhwa',
    tags: webtoon.genre ? [webtoon.genre] : [],
    source: 'webtoons',
    sourceUrl: webtoon.url
  };
}
