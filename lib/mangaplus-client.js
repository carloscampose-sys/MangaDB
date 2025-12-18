/**
 * Cliente para Manga Plus API
 * Manga Plus es el servicio oficial de Shueisha para manga gratuito
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://jumpg-webapi.tokyo-cdn.com/api';

/**
 * Parsea el protobuf de Manga Plus para extraer títulos en español
 */
function parseTitlesFromProtobuf(buffer) {
  const titles = [];
  const data = buffer.toString('latin1'); // Usar latin1 para preservar bytes

  // Buscar URLs de imágenes con IDs 200xxx (español)
  const urlPattern = /https:\/\/jumpg-assets\.tokyo-cdn\.com\/secure\/title\/(200\d{3})\/title_thumbnail_portrait_list\/\d+\.jpg/g;

  const seen = new Set();
  let urlMatch;

  while ((urlMatch = urlPattern.exec(data)) !== null) {
    const titleId = urlMatch[1];
    if (seen.has(titleId)) continue;

    // Buscar el título en español antes de esta URL
    // El formato es: \x12<len><title>\x1a<len><author>\x22<len><url>
    const urlPos = urlMatch.index;
    const searchStart = Math.max(0, urlPos - 300);
    const chunk = data.substring(searchStart, urlPos);

    // Buscar título (texto después de \x12 y antes de \x1a)
    const titleMatch = chunk.match(/\x12([\x10-\xff])([^\x00\x12\x1a\x22]{2,80})\x1a/);
    if (titleMatch) {
      const titleText = titleMatch[2];
      // Buscar autor (texto después de \x1a y antes de \x22)
      const authorMatch = chunk.match(/\x1a([\x05-\xff])([^\x00\x12\x1a\x22]{2,50})\x22/);
      const authorText = authorMatch ? authorMatch[2] : '';

      seen.add(titleId);
      titles.push({
        id: titleId,
        name: cleanString(titleText),
        author: cleanString(authorText),
        coverUrl: urlMatch[0],
        source: 'mangaplus'
      });
    }
  }

  return titles;
}

/**
 * Obtiene todos los títulos disponibles en español
 */
export async function getAllTitles() {
  try {
    const url = `${BASE_URL}/title_list/allV2?lang=esp`;
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
    const titles = parseTitlesFromProtobuf(buffer);

    console.log(`Manga Plus: Found ${titles.length} Spanish titles`);
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
    const allTitles = await getAllTitles();
    const queryLower = query.toLowerCase();

    const filtered = allTitles
      .filter(title =>
        title.name.toLowerCase().includes(queryLower) ||
        (title.author && title.author.toLowerCase().includes(queryLower))
      )
      .slice(0, limit);

    console.log(`Manga Plus search "${query}": Found ${filtered.length} results`);
    return filtered;
  } catch (error) {
    console.error('Error searching Manga Plus:', error);
    return []; // Retornar array vacío en caso de error
  }
}

/**
 * Obtiene detalles de un título específico
 */
export async function getTitleDetail(titleId) {
  try {
    const url = `${BASE_URL}/title_detailV3?title_id=${titleId}&lang=esp`;
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
    return parseTitleDetailFromProtobuf(buffer, titleId);
  } catch (error) {
    console.error('Error getting title detail:', error);
    throw error;
  }
}

/**
 * Parsea los detalles de un título desde protobuf
 */
function parseTitleDetailFromProtobuf(buffer, titleId) {
  const data = buffer.toString('binary');
  const textData = buffer.toString('utf-8');

  // Extraer título
  const titleMatch = textData.match(/[\x12][\x10-\x60]([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\-\!\?\.\,\'\"\:\;\(\)]{2,60})/);
  const title = titleMatch ? cleanString(titleMatch[1]) : `Title ${titleId}`;

  // Extraer autor
  const authorMatch = textData.match(/\x1a[\x05-\x30]([A-Z][a-zA-Z\s\-\.\/]+)/);
  const author = authorMatch ? cleanString(authorMatch[1]) : '';

  // Extraer descripción
  const descMatch = textData.match(/[A-Z][a-zA-Z\s\,\.]{50,500}/);
  const description = descMatch ? cleanString(descMatch[0]) : '';

  // Extraer cover URL
  const coverMatch = data.match(/https:\/\/jumpg-assets\.tokyo-cdn\.com\/secure\/title\/\d+\/title_thumbnail_portrait[^\s\x00]+\.jpg/);
  const coverUrl = coverMatch ? coverMatch[0].split('?')[0] : '';

  // Extraer IDs de capítulos
  const chapters = parseChaptersFromProtobuf(buffer);

  return {
    title,
    author,
    description,
    coverUrl,
    chapters,
    source: 'mangaplus'
  };
}

/**
 * Extrae capítulos del protobuf
 */
function parseChaptersFromProtobuf(buffer) {
  const chapters = [];
  const data = buffer.toString('latin1');
  const seen = new Set();

  // Buscar bloques de capítulos
  // Formato: chapter_thumbnail seguido de ID de capítulo
  // El patrón es: \x10<varint chapterId>\x1a<len>#<num>\x22<len>Cap...
  const chapterBlockPattern = /chapter\/(\d{6,8})\/chapter_thumbnail/g;
  let blockMatch;

  while ((blockMatch = chapterBlockPattern.exec(data)) !== null) {
    const chapterId = blockMatch[1];
    if (seen.has(chapterId)) continue;

    // Buscar el número y título del capítulo cerca de este bloque
    const blockPos = blockMatch.index;
    const searchArea = data.substring(blockPos - 100, blockPos + 300);

    // Buscar #001, #002, etc o Capítulo X
    const numMatch = searchArea.match(/#(\d{2,4})/);
    const titleMatch = searchArea.match(/Cap[íi]tulo\s*(\d+)[:\s]*([^\x00\x10\x12\x1a\x22]{0,50})/i);

    const chapterNum = numMatch ? numMatch[1] : (chapters.length + 1).toString().padStart(3, '0');
    const chapterTitle = titleMatch ? `Capítulo ${titleMatch[1]}${titleMatch[2] ? ': ' + cleanString(titleMatch[2]) : ''}` : `Capítulo ${parseInt(chapterNum)}`;

    seen.add(chapterId);
    chapters.push({
      id: chapterId,
      chapter: parseInt(chapterNum).toString(),
      title: chapterTitle,
      source: 'mangaplus'
    });
  }

  // Ordenar por número de capítulo
  return chapters.sort((a, b) => parseInt(a.chapter) - parseInt(b.chapter));
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
    tags: [],
    source: 'mangaplus',
    sourceId: title.id
  };
}
