/**
 * Cliente para TuManga (tumanga.org)
 * Scraping de mangas/manhwas en español
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://tumanga.org';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Busca mangas/manhwas por término
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas encontrados
 */
export async function searchTuManga(query, limit = 20) {
  try {
    const url = `${BASE_URL}/biblioteca?title=${encodeURIComponent(query)}`;
    console.log('TuManga search:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`TuManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    // Buscar items en la lista de resultados
    $('.gm_h .item, ul.gm_h li.item').each((i, el) => {
      if (results.length >= limit) return false;

      const link = $(el).find('a').first();
      const href = link.attr('href');

      if (href && href.startsWith('/online/')) {
        const slug = href.replace('/online/', '');
        const title = $(el).find('h2').text().trim();
        const coverUrl = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

        if (title && slug) {
          results.push({
            id: `tumanga-${slug}`,
            slug,
            title,
            coverUrl: coverUrl || `${BASE_URL}/content/images/cover/${slug}.jpg`,
            url: `${BASE_URL}${href}`,
            type: 'manhwa', // Por defecto, pueden ser manhwas o mangas
            source: 'tumanga'
          });
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching TuManga:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un manga
 * @param {string} slug - Slug del manga
 * @returns {Promise<Object>} Detalles del manga
 */
export async function getTuMangaDetails(slug) {
  try {
    const url = `${BASE_URL}/online/${slug}`;
    console.log('Fetching TuManga details:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`TuManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim();
    const description = $('.description').first().text().trim();
    const coverUrl = $('.left img').attr('data-src') || $('.left img').attr('src');
    const typeText = $('.infomanga_type').text().trim().toLowerCase();

    // Determinar tipo
    let type = 'manga';
    if (typeText.includes('manhwa') || typeText.includes('webtoon')) {
      type = 'manhwa';
    } else if (typeText.includes('manhua')) {
      type = 'manhua';
    }

    // Obtener géneros/categorías
    const tags = [];
    $('.categories .btn-cat').each((i, el) => {
      tags.push($(el).text().trim());
    });

    return {
      id: `tumanga-${slug}`,
      slug,
      title: title || 'Sin título',
      description: description || 'Sin descripción disponible',
      coverUrl: coverUrl || `${BASE_URL}/content/images/cover/${slug}.jpg`,
      type,
      tags,
      status: 'ongoing',
      url: `${BASE_URL}/online/${slug}`,
      source: 'tumanga'
    };
  } catch (error) {
    console.error('Error getting TuManga details:', error);
    throw error;
  }
}

/**
 * Obtiene lista de capítulos de un manga
 * @param {string} slug - Slug del manga
 * @returns {Promise<Object>} Lista de capítulos
 */
export async function getTuMangaChapters(slug) {
  try {
    const url = `${BASE_URL}/online/${slug}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`TuManga error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const chapters = [];

    // Buscar capítulos en la lista
    $('.main_chapters .indi_chap').each((i, el) => {
      const link = $(el).find('a.chap_go');
      const href = link.attr('href');

      if (href) {
        // Extraer número de capítulo del href: /leer/slug-123.00
        const chapterMatch = href.match(/-([\d.]+)$/);
        const chapterNum = chapterMatch ? chapterMatch[1] : String(i + 1);

        const title = link.attr('title') || `Capítulo ${chapterNum}`;

        chapters.push({
          id: `tumanga-${slug}-ch${chapterNum}`,
          slug,
          chapter: chapterNum,
          title,
          url: href.startsWith('/') ? `${BASE_URL}${href}` : href,
          source: 'tumanga'
        });
      }
    });

    return {
      chapters,
      total: chapters.length
    };
  } catch (error) {
    console.error('Error getting TuManga chapters:', error);
    return { chapters: [], total: 0 };
  }
}

/**
 * Decodifica las URLs de imágenes desde el array codificado
 * El sitio usa XOR con una clave del meta tag ad:check
 * @param {string} encoded - String codificado en base64
 * @param {string} key - Clave de decodificación (del meta ad:check)
 * @returns {string} URL de imagen decodificada
 */
function decodeImageUrl(encoded, key) {
  try {
    // Decodificar base64
    const decoded = Buffer.from(encoded, 'base64').toString('binary');

    // XOR con la clave
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }

    return result;
  } catch (error) {
    console.error('Error decoding image URL:', error);
    return null;
  }
}

/**
 * Obtiene las páginas/imágenes de un capítulo
 * @param {string} slug - Slug del manga
 * @param {string} chapter - Número del capítulo
 * @returns {Promise<Object>} URLs de las imágenes
 */
export async function getTuMangaPages(slug, chapter) {
  try {
    const url = `${BASE_URL}/leer/${slug}-${chapter}`;
    console.log('Fetching TuManga pages:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': `${BASE_URL}/online/${slug}`
      }
    });

    if (!response.ok) {
      throw new Error(`TuManga error: ${response.status}`);
    }

    const html = await response.text();

    // Extraer la clave del meta tag ad:check
    const keyMatch = html.match(/meta\s+property="ad:check"\s+content="([^"]+)"/);
    const key = keyMatch ? keyMatch[1] : 'y4Ic07YqD0'; // Clave por defecto

    // Buscar el array PIC_ARRAY en el script
    const picArrayMatch = html.match(/var\s+PIC_ARRAY\s*=\s*\[([\s\S]*?)\];/);

    if (!picArrayMatch) {
      console.error('PIC_ARRAY not found in page');
      return { pages: [], total: 0, source: 'tumanga' };
    }

    // Extraer las URLs codificadas
    const encodedUrls = picArrayMatch[1].match(/"([^"]+)"/g) || [];
    const pages = [];

    for (const encoded of encodedUrls) {
      const cleanEncoded = encoded.replace(/"/g, '');
      const decodedPath = decodeImageUrl(cleanEncoded, key);
      if (decodedPath && decodedPath.startsWith('/pic_source')) {
        // Construir URL completa
        pages.push(`${BASE_URL}${decodedPath}`);
      }
    }

    return {
      pages,
      total: pages.length,
      source: 'tumanga'
    };
  } catch (error) {
    console.error('Error getting TuManga pages:', error);
    throw error;
  }
}

/**
 * Formatea un resultado de TuManga al formato unificado de la app
 */
export function formatTuMangaResult(manga) {
  return {
    id: manga.id,
    title: manga.title,
    description: manga.description || '',
    coverUrl: manga.coverUrl,
    author: manga.author || 'Desconocido',
    artist: manga.artist || manga.author || 'Desconocido',
    status: manga.status || 'ongoing',
    year: null,
    type: manga.type || 'manhwa',
    tags: manga.tags || [],
    source: 'tumanga',
    sourceUrl: manga.url
  };
}
