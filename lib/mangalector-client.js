/**
 * Cliente para MangaLector (mangalector.com)
 * Scraping de mangas/manhwas en español
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://mangalector.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Busca mangas/manhwas por término
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas encontrados
 */
export async function searchMangaLector(query, limit = 20) {
  try {
    const url = `${BASE_URL}/search?s=${encodeURIComponent(query)}`;
    console.log('MangaLector search:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`MangaLector error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();

    // Buscar items en la lista de resultados
    $('a[href*="/manga/"]').each((i, el) => {
      if (results.length >= limit) return false;

      const href = $(el).attr('href');

      if (href && href.includes('/manga/') && !href.includes('/capitulo') && !href.includes('/chapter')) {
        const slug = href.split('/manga/')[1]?.replace(/\/$/, '');

        if (slug && !seen.has(slug)) {
          seen.add(slug);

          // Buscar título
          const title = $(el).attr('title') ||
                       $(el).find('.post-title, .item-title, h3, h4').first().text().trim() ||
                       $(el).text().trim();

          // Buscar imagen cercana
          const container = $(el).closest('.page-item-detail, .c-tabs-item, .row, .manga-item, div');
          const img = container.find('img').first();
          let coverUrl = img.attr('data-src') || img.attr('data-lazy-src') || img.attr('src') || '';

          if (title && title.length > 1) {
            results.push({
              id: `mangalector-${slug}`,
              slug,
              title: cleanTitle(title),
              coverUrl: coverUrl.startsWith('http') ? coverUrl : `${BASE_URL}${coverUrl}`,
              url: href,
              type: 'manhwa',
              source: 'mangalector'
            });
          }
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching MangaLector:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un manga
 * @param {string} slug - Slug del manga
 * @returns {Promise<Object>} Detalles del manga
 */
export async function getMangaLectorDetails(slug) {
  try {
    const url = `${BASE_URL}/manga/${slug}`;
    console.log('Fetching MangaLector details:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`MangaLector error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer información
    const title = $('.post-title h1, .manga-title, h1').first().text().trim();
    const description = $('.summary__content p, .description-summary p, .manga-desc, .sinopsis').first().text().trim();

    // Cover
    const coverImg = $('.summary_image img, .manga-cover img, .tab-summary img').first();
    let coverUrl = coverImg.attr('data-src') || coverImg.attr('data-lazy-src') || coverImg.attr('src') || '';

    // Tipo
    const typeText = $('.summary-content:contains("Tipo"), .post-content_item:contains("Tipo")').text().toLowerCase();
    let type = 'manga';
    if (typeText.includes('manhwa') || typeText.includes('webtoon')) {
      type = 'manhwa';
    } else if (typeText.includes('manhua')) {
      type = 'manhua';
    }

    // Estado
    const statusText = $('.summary-content:contains("Estado"), .post-content_item:contains("Estado"), .post-status').text().toLowerCase();
    let status = 'ongoing';
    if (statusText.includes('finalizado') || statusText.includes('completado') || statusText.includes('finished')) {
      status = 'completed';
    } else if (statusText.includes('pausado') || statusText.includes('hiatus')) {
      status = 'hiatus';
    }

    // Autor
    const author = $('.author-content a, .summary-content:contains("Autor") a').first().text().trim() || 'Desconocido';

    // Artista
    const artist = $('.artist-content a, .summary-content:contains("Artista") a').first().text().trim() || author;

    // Géneros
    const genres = [];
    $('.genres-content a, .wp-manga-tags-list a, .summary-content:contains("Género") a').each((i, el) => {
      genres.push($(el).text().trim());
    });

    // Año
    const yearMatch = html.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    return {
      id: `mangalector-${slug}`,
      slug,
      title: title || 'Sin título',
      description: description || 'Sin descripción disponible',
      coverUrl: coverUrl.startsWith('http') ? coverUrl : `${BASE_URL}${coverUrl}`,
      type,
      status,
      author,
      artist,
      genres,
      year,
      url: `${BASE_URL}/manga/${slug}`,
      source: 'mangalector'
    };
  } catch (error) {
    console.error('Error getting MangaLector details:', error);
    throw error;
  }
}

/**
 * Obtiene lista de capítulos de un manga
 * @param {string} slug - Slug del manga
 * @returns {Promise<Object>} Lista de capítulos
 */
export async function getMangaLectorChapters(slug) {
  try {
    const url = `${BASE_URL}/manga/${slug}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`MangaLector error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const chapters = [];
    const seen = new Set();

    // Buscar capítulos
    $('a[href*="/capitulo"], a[href*="/chapter"], .wp-manga-chapter a, .chapter-item a, li.wp-manga-chapter a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();

      if (href && !seen.has(href)) {
        seen.add(href);

        // Extraer número de capítulo
        const chapterMatch = href.match(/capitulo[/-]?(\d+(?:[.-]\d+)?)|chapter[/-]?(\d+(?:[.-]\d+)?)/i) ||
                            text.match(/cap[ií]tulo\s*(\d+(?:[.-]\d+)?)/i) ||
                            text.match(/chapter\s*(\d+(?:[.-]\d+)?)/i) ||
                            text.match(/(\d+(?:[.-]\d+)?)/);

        const chapterNum = chapterMatch ? (chapterMatch[1] || chapterMatch[2] || '0').replace('-', '.') : String(i + 1);

        chapters.push({
          id: `mangalector-${slug}-ch${chapterNum}`,
          slug,
          chapter: chapterNum,
          title: text || `Capítulo ${chapterNum}`,
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          source: 'mangalector'
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
    console.error('Error getting MangaLector chapters:', error);
    return { chapters: [], total: 0 };
  }
}

/**
 * Obtiene las páginas/imágenes de un capítulo
 * @param {string} slug - Slug del manga
 * @param {string} chapter - Número del capítulo
 * @returns {Promise<Object>} URLs de las imágenes
 */
export async function getMangaLectorPages(slug, chapter) {
  try {
    // Primero obtener la URL del capítulo
    const chaptersData = await getMangaLectorChapters(slug);
    const chapterData = chaptersData.chapters.find(ch =>
      ch.chapter === chapter || ch.chapter === String(chapter)
    );

    if (!chapterData || !chapterData.url) {
      throw new Error(`Chapter ${chapter} not found`);
    }

    console.log('Fetching MangaLector pages:', chapterData.url);

    const response = await fetch(chapterData.url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': `${BASE_URL}/manga/${slug}`
      }
    });

    if (!response.ok) {
      throw new Error(`MangaLector error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pages = [];

    // Buscar imágenes del capítulo - múltiples selectores
    const selectors = [
      '.reading-content img',
      '.page-break img',
      '#images-chapter img',
      '.chapter-content img',
      '.wp-manga-chapter-img',
      'img.wp-manga-chapter-img'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, el) => {
        const src = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('src');
        if (src && !src.includes('logo') && !src.includes('banner') && !src.includes('ads')) {
          const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
          if (!pages.includes(fullUrl)) {
            pages.push(fullUrl);
          }
        }
      });
    });

    // Si no encontramos con selectores, buscar en scripts
    if (pages.length === 0) {
      const scriptMatch = html.match(/chapter_preloaded_images\s*=\s*\[([\s\S]*?)\]/);
      if (scriptMatch) {
        const urls = scriptMatch[1].match(/"([^"]+)"/g) || [];
        urls.forEach(url => {
          const cleanUrl = url.replace(/"/g, '').replace(/\\/g, '');
          if (cleanUrl.startsWith('http')) {
            pages.push(cleanUrl);
          }
        });
      }
    }

    return {
      pages,
      total: pages.length,
      source: 'mangalector'
    };
  } catch (error) {
    console.error('Error getting MangaLector pages:', error);
    throw error;
  }
}

/**
 * Limpia el título de caracteres innecesarios
 */
function cleanTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/^\s*-\s*/, '')
    .trim();
}

/**
 * Formatea un resultado de MangaLector al formato unificado de la app
 */
export function formatMangaLectorResult(manga) {
  return {
    id: manga.id,
    title: manga.title,
    description: manga.description || '',
    coverUrl: manga.coverUrl,
    author: manga.author || 'Desconocido',
    artist: manga.artist || 'Desconocido',
    status: manga.status || 'ongoing',
    year: manga.year || null,
    type: manga.type || 'manhwa',
    tags: manga.genres || [],
    source: 'mangalector',
    sourceUrl: manga.url
  };
}
