/**
 * Cliente para Manga Plus API
 * Manga Plus es el servicio oficial de Shueisha para manga gratuito
 * https://mangaplus.shueisha.co.jp
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://jumpg-webapi.tokyo-cdn.com/api';

// IDs de títulos populares en español (lang=esp usa title_ids 200xxx)
const LANG_ESP = 'esp';
const LANG_ENG = 'eng';

/**
 * Decodifica respuesta protobuf simple de Manga Plus
 * Extrae strings UTF-8 del buffer binario
 */
function parseProtobuf(buffer) {
  const text = buffer.toString('utf-8');
  // Extraer strings visibles del protobuf
  const strings = text.match(/[\x20-\x7E\xC0-\xFF]{3,}/g) || [];
  return strings;
}

/**
 * Obtiene todos los títulos disponibles en español
 */
export async function getAllTitles() {
  try {
    const url = `${BASE_URL}/title_list/allV2?lang=${LANG_ESP}`;
    console.log('Fetching Manga Plus titles:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Manga Plus API error: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const titles = parseTitleList(buffer);

    return titles;
  } catch (error) {
    console.error('Error getting Manga Plus titles:', error);
    throw error;
  }
}

/**
 * Busca títulos por nombre
 */
export async function searchMangaPlus(query, limit = 20) {
  try {
    // Manga Plus no tiene endpoint de búsqueda, obtenemos todos y filtramos
    const allTitles = await getAllTitles();

    const queryLower = query.toLowerCase();
    const filtered = allTitles
      .filter(title =>
        title.name.toLowerCase().includes(queryLower) ||
        (title.author && title.author.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error('Error searching Manga Plus:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un título específico
 */
export async function getTitleDetail(titleId) {
  try {
    const url = `${BASE_URL}/title_detailV3?title_id=${titleId}&lang=${LANG_ESP}`;
    console.log('Fetching Manga Plus title detail:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Manga Plus API error: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const detail = parseTitleDetail(buffer);

    return detail;
  } catch (error) {
    console.error('Error getting title detail:', error);
    throw error;
  }
}

/**
 * Obtiene las páginas de un capítulo
 */
export async function getChapterViewer(chapterId) {
  try {
    const url = `${BASE_URL}/manga_viewer?chapter_id=${chapterId}&split=yes&img_quality=high`;
    console.log('Fetching Manga Plus chapter:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Manga Plus API error: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const pages = parseChapterPages(buffer);

    return pages;
  } catch (error) {
    console.error('Error getting chapter pages:', error);
    throw error;
  }
}

/**
 * Parsea la lista de títulos desde protobuf
 */
function parseTitleList(buffer) {
  const titles = [];
  const data = buffer.toString('binary');

  // Buscar patrones de títulos en el buffer
  // Los títulos tienen: id, nombre, autor, imagen
  const urlPattern = /https:\/\/jumpg-assets[^\x00]+\.jpg[^\x00]*/g;
  const urls = data.match(urlPattern) || [];

  // Extraer texto legible
  const textContent = buffer.toString('utf-8');

  // Buscar bloques de títulos (simplificado)
  // El formato protobuf tiene campos con tags específicos
  let offset = 0;
  const titleMatches = [];

  // Buscar IDs de título (generalmente 6 dígitos empezando con 1 o 2)
  const idPattern = /[12]\d{5}/g;
  let match;
  const seenIds = new Set();

  // Extraer URLs de imágenes y asociarlas con títulos
  const imageUrls = [...data.matchAll(/https:\/\/jumpg-assets\.tokyo-cdn\.com\/secure\/title\/(\d+)\/[^\x00\s]+/g)];

  for (const urlMatch of imageUrls) {
    const titleId = urlMatch[1];
    if (!seenIds.has(titleId) && titleId.length === 6) {
      seenIds.add(titleId);

      // Buscar el nombre cerca de esta URL en el buffer
      const urlIndex = urlMatch.index;
      const nearbyText = textContent.substring(Math.max(0, urlIndex - 200), urlIndex);

      // Extraer nombre (texto legible antes de la URL)
      const nameMatch = nearbyText.match(/([A-Za-zÀ-ÿ\s\-\!\?\.\,\'\"]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : `Title ${titleId}`;

      if (name.length > 2) {
        titles.push({
          id: titleId,
          name: cleanString(name),
          author: '',
          coverUrl: urlMatch[0].split('?')[0],
          source: 'mangaplus'
        });
      }
    }
  }

  return titles.slice(0, 100); // Limitar resultados
}

/**
 * Parsea los detalles de un título desde protobuf
 */
function parseTitleDetail(buffer) {
  const data = buffer.toString('utf-8');
  const binaryData = buffer.toString('binary');

  // Extraer información básica
  const titleMatch = data.match(/([A-Za-zÀ-ÿ][\w\s\-\!\?\.\,\'\"]{2,50})/);
  const authorMatch = data.match(/([A-Z][a-z]+\s[A-Z][a-z]+)/);
  const descMatch = data.match(/([A-Z][^]*?\.{3}|[A-Z][^]{50,500}\.)/);

  // Extraer URLs de imágenes
  const coverMatch = binaryData.match(/https:\/\/jumpg-assets[^\x00]+portrait[^\x00]+\.jpg/);
  const bannerMatch = binaryData.match(/https:\/\/jumpg-assets[^\x00]+main[^\x00]+\.jpg/);

  // Extraer capítulos
  const chapters = parseChaptersFromDetail(buffer);

  return {
    title: titleMatch ? cleanString(titleMatch[1]) : 'Unknown',
    author: authorMatch ? authorMatch[1] : 'Unknown',
    description: descMatch ? cleanString(descMatch[1]) : '',
    coverUrl: coverMatch ? coverMatch[0].split('?')[0] : '',
    bannerUrl: bannerMatch ? bannerMatch[0].split('?')[0] : '',
    chapters: chapters,
    source: 'mangaplus'
  };
}

/**
 * Extrae capítulos del detalle de título
 */
function parseChaptersFromDetail(buffer) {
  const chapters = [];
  const binaryData = buffer.toString('binary');

  // Buscar IDs de capítulos (números de 7 dígitos generalmente)
  const chapterPattern = /\x08([\x80-\xFF][\x00-\xFF]{0,3})\x10/g;

  // Buscar nombres de capítulos
  const chapterNames = binaryData.match(/(Chapter|Cap[ií]tulo|#)\s*\d+[^\x00]*/gi) || [];

  // Extraer IDs de capítulos de las URLs de manga_viewer
  const viewerPattern = /chapter_id=(\d+)/g;
  let match;

  // Simplificado: buscar patrones numéricos que parecen IDs de capítulo
  const numericIds = binaryData.match(/[1-9]\d{6,7}/g) || [];
  const uniqueIds = [...new Set(numericIds)].slice(0, 50);

  uniqueIds.forEach((id, index) => {
    if (id.length >= 7 && id.length <= 8) {
      chapters.push({
        id: id,
        chapter: (index + 1).toString(),
        title: `Capítulo ${index + 1}`,
        source: 'mangaplus'
      });
    }
  });

  return chapters;
}

/**
 * Parsea las páginas de un capítulo desde protobuf
 */
function parseChapterPages(buffer) {
  const pages = [];
  const binaryData = buffer.toString('binary');

  // Buscar URLs de imágenes de páginas
  const pagePattern = /https:\/\/mangaplus\.shueisha\.co\.jp\/drm\/title\/[^\x00\s]+/g;
  const altPattern = /https:\/\/jumpg-assets[^\x00\s]+page[^\x00\s]*/g;

  let matches = binaryData.match(pagePattern) || [];

  if (matches.length === 0) {
    // Intentar patrón alternativo
    matches = binaryData.match(altPattern) || [];
  }

  // También buscar URLs encriptadas
  const encryptedPattern = /https:\/\/[^\x00\s]*\.jpg[^\x00\s]*/g;
  const allUrls = binaryData.match(encryptedPattern) || [];

  // Filtrar URLs que parecen ser páginas
  const pageUrls = allUrls.filter(url =>
    url.includes('mangaplus') ||
    url.includes('page') ||
    url.includes('drm')
  );

  return {
    pages: pageUrls.map(url => url.split('?')[0]),
    encrypted: true, // Las imágenes de Manga Plus están encriptadas
    source: 'mangaplus'
  };
}

/**
 * Limpia strings extraídos del protobuf
 */
function cleanString(str) {
  if (!str) return '';
  return str
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formatea título para el frontend
 */
export function formatMangaPlusTitle(title) {
  return {
    id: `mangaplus_${title.id}`,
    title: title.name,
    author: title.author || 'Shueisha',
    description: '',
    coverUrl: title.coverUrl,
    status: 'ongoing',
    type: 'manga',
    source: 'mangaplus',
    sourceId: title.id
  };
}
