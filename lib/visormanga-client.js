/**
 * Cliente para VisorManga (visormanga.com)
 * Scraping de mangas/manhwas en español
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://visormanga.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Busca mangas/manhwas por término
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas encontrados
 */
export async function searchVisorManga(query, limit = 20) {
  try {
    const url = `${BASE_URL}/biblioteca?search=${encodeURIComponent(query)}`;
    console.log('VisorManga search:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`VisorManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    // Buscar items en la lista de resultados
    $('a[href*="/manga/"]').each((i, el) => {
      if (results.length >= limit) return false;

      const href = $(el).attr('href');
      const title = $(el).attr('title') || $(el).text().trim();

      if (href && href.includes('/manga/') && title && !href.includes('/capitulo/')) {
        const slug = href.split('/manga/')[1]?.replace(/\/$/, '');

        if (slug && !results.find(r => r.slug === slug)) {
          // Buscar imagen cercana
          const parent = $(el).closest('.last-manga, .manga-item, .card, div');
          const img = parent.find('img').first();
          const coverUrl = img.attr('data-src') || img.attr('src') || '';

          results.push({
            id: `visormanga-${slug}`,
            slug,
            title,
            coverUrl: coverUrl.startsWith('http') ? coverUrl : `${BASE_URL}${coverUrl}`,
            url: href,
            type: 'manhwa',
            source: 'visormanga'
          });
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching VisorManga:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un manga
 * @param {string} slug - Slug del manga
 * @returns {Promise<Object>} Detalles del manga
 */
export async function getVisorMangaDetails(slug) {
  try {
    const url = `${BASE_URL}/manga/${slug}`;
    console.log('Fetching VisorManga details:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`VisorManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer información
    const title = $('h1, .manga-title, .title').first().text().trim();
    const description = $('.sinopsis, .description, .synopsis, p.manga-desc').first().text().trim();
    const coverImg = $('.manga-cover img, .cover img, .poster img').first();
    const coverUrl = coverImg.attr('data-src') || coverImg.attr('src') || '';

    // Tipo
    const typeText = $('.tipo, .type, .manga-type').text().toLowerCase();
    let type = 'manga';
    if (typeText.includes('manhwa') || typeText.includes('webtoon')) {
      type = 'manhwa';
    } else if (typeText.includes('manhua')) {
      type = 'manhua';
    }

    // Estado
    const statusText = $('.estado, .status, .manga-status').text().toLowerCase();
    let status = 'ongoing';
    if (statusText.includes('finalizado') || statusText.includes('completado')) {
      status = 'completed';
    } else if (statusText.includes('pausado') || statusText.includes('hiatus')) {
      status = 'hiatus';
    }

    // Géneros
    const genres = [];
    $('.generos a, .genres a, .genre a, .tags a').each((i, el) => {
      genres.push($(el).text().trim());
    });

    // Autor
    const author = $('.autor, .author').text().trim() || 'Desconocido';

    return {
      id: `visormanga-${slug}`,
      slug,
      title: title || 'Sin título',
      description: description || 'Sin descripción disponible',
      coverUrl: coverUrl.startsWith('http') ? coverUrl : `${BASE_URL}${coverUrl}`,
      type,
      status,
      author,
      genres,
      url: `${BASE_URL}/manga/${slug}`,
      source: 'visormanga'
    };
  } catch (error) {
    console.error('Error getting VisorManga details:', error);
    throw error;
  }
}

/**
 * Obtiene lista de capítulos de un manga
 * @param {string} slug - Slug del manga
 * @returns {Promise<Object>} Lista de capítulos
 */
export async function getVisorMangaChapters(slug) {
  try {
    const url = `${BASE_URL}/manga/${slug}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`VisorManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const chapters = [];

    // Buscar capítulos
    $('a[href*="/capitulo/"], a[href*="/leer/"], .chapter-item a, .capitulo a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();

      if (href) {
        // Extraer número de capítulo
        const chapterMatch = href.match(/capitulo[/-]?(\d+(?:\.\d+)?)|cap[/-]?(\d+(?:\.\d+)?)/i) ||
                            text.match(/cap[ií]tulo\s*(\d+(?:\.\d+)?)/i) ||
                            text.match(/(\d+(?:\.\d+)?)/);

        const chapterNum = chapterMatch ? (chapterMatch[1] || chapterMatch[2]) : String(i + 1);

        chapters.push({
          id: `visormanga-${slug}-ch${chapterNum}`,
          slug,
          chapter: chapterNum,
          title: text || `Capítulo ${chapterNum}`,
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          source: 'visormanga'
        });
      }
    });

    // Ordenar por número de capítulo (descendente)
    chapters.sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter));

    return {
      chapters,
      total: chapters.length
    };
  } catch (error) {
    console.error('Error getting VisorManga chapters:', error);
    return { chapters: [], total: 0 };
  }
}

/**
 * Obtiene las páginas/imágenes de un capítulo
 * @param {string} slug - Slug del manga
 * @param {string} chapter - Número del capítulo
 * @returns {Promise<Object>} URLs de las imágenes
 */
export async function getVisorMangaPages(slug, chapter) {
  try {
    // Primero obtener la URL del capítulo
    const chaptersData = await getVisorMangaChapters(slug);
    const chapterData = chaptersData.chapters.find(ch =>
      ch.chapter === chapter || ch.chapter === String(chapter)
    );

    if (!chapterData || !chapterData.url) {
      throw new Error(`Chapter ${chapter} not found`);
    }

    console.log('Fetching VisorManga pages:', chapterData.url);

    const response = await fetch(chapterData.url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': `${BASE_URL}/manga/${slug}`
      }
    });

    if (!response.ok) {
      throw new Error(`VisorManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pages = [];

    // Buscar imágenes del capítulo
    $('.reader-images img, .chapter-images img, #images img, .page-image img, img[data-src*="uploads"]').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && (src.includes('uploads') || src.includes('chapter') || src.includes('page'))) {
        const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
        if (!pages.includes(fullUrl)) {
          pages.push(fullUrl);
        }
      }
    });

    // Si no encontramos con selectores específicos, buscar patrón en scripts
    if (pages.length === 0) {
      const scriptMatch = html.match(/images\s*[=:]\s*\[([\s\S]*?)\]/);
      if (scriptMatch) {
        const urls = scriptMatch[1].match(/"([^"]+)"/g) || [];
        urls.forEach(url => {
          const cleanUrl = url.replace(/"/g, '');
          if (cleanUrl.startsWith('http')) {
            pages.push(cleanUrl);
          }
        });
      }
    }

    return {
      pages,
      total: pages.length,
      source: 'visormanga'
    };
  } catch (error) {
    console.error('Error getting VisorManga pages:', error);
    throw error;
  }
}

/**
 * Formatea un resultado de VisorManga al formato unificado de la app
 */
export function formatVisorMangaResult(manga) {
  return {
    id: manga.id,
    title: manga.title,
    description: manga.description || '',
    coverUrl: manga.coverUrl,
    author: manga.author || 'Desconocido',
    artist: manga.author || 'Desconocido',
    status: manga.status || 'ongoing',
    year: null,
    type: manga.type || 'manhwa',
    tags: manga.genres || [],
    source: 'visormanga',
    sourceUrl: manga.url
  };
}
