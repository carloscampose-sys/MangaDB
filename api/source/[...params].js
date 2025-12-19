/**
 * API Unificada para todas las fuentes
 * Rutas:
 *   /api/source/mangaplus/[id]
 *   /api/source/mangaplus/chapter/[chapterId]
 *   /api/source/webtoons/[id]
 *   /api/source/webtoons/chapter/[chapterId]
 *   /api/source/tumanga/[id]
 *   /api/source/tumanga/chapter/[chapterId]
 *   /api/source/anilist/[id]
 *   /api/source/jikan/[id]
 *   /api/source/visormanga/[id]
 *   /api/source/visormanga/chapter/[chapterId]
 *   /api/source/mangalector/[id]
 *   /api/source/mangalector/chapter/[chapterId]
 */

// Importar todos los clientes
import { searchMangaPlus, getMangaPlusDetails, getMangaPlusChapterPages } from '../../lib/mangaplus-client.js';
import { getWebtoonDetails, getWebtoonChapterPages } from '../../lib/webtoons-client.js';
import { getTuMangaDetails, getTuMangaChapters, getTuMangaPages, formatTuMangaResult } from '../../lib/tumanga-client.js';
import { getAniListDetails } from '../../lib/anilist-client.js';
import { getJikanDetails } from '../../lib/jikan-client.js';
import { getVisorMangaDetails, getVisorMangaChapters, getVisorMangaPages, formatVisorMangaResult } from '../../lib/visormanga-client.js';
import { getMangaLectorDetails, getMangaLectorChapters, getMangaLectorPages, formatMangaLectorResult } from '../../lib/mangalector-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { params } = req.query;

    if (!params || params.length < 2) {
      return res.status(400).json({ error: 'Invalid route. Use /api/source/[source]/[id]' });
    }

    const source = params[0];
    const isChapter = params[1] === 'chapter';
    const id = isChapter ? params[2] : params[1];

    if (!id) {
      return res.status(400).json({ error: 'ID required' });
    }

    console.log(`API Source: ${source}, isChapter: ${isChapter}, id: ${id}`);

    // Router por fuente
    switch (source) {
      case 'mangaplus':
        return await handleMangaPlus(req, res, id, isChapter);

      case 'webtoons':
        return await handleWebtoons(req, res, id, isChapter);

      case 'tumanga':
        return await handleTuManga(req, res, id, isChapter);

      case 'anilist':
        return await handleAniList(req, res, id);

      case 'jikan':
        return await handleJikan(req, res, id);

      case 'visormanga':
        return await handleVisorManga(req, res, id, isChapter);

      case 'mangalector':
        return await handleMangaLector(req, res, id, isChapter);

      default:
        return res.status(404).json({ error: `Source "${source}" not found` });
    }

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// ============ MANGA PLUS ============
async function handleMangaPlus(req, res, id, isChapter) {
  const numericId = id.replace('mangaplus_', '');

  if (isChapter) {
    const pages = await getMangaPlusChapterPages(numericId);
    return res.json({ success: true, pages, source: 'mangaplus' });
  }

  const details = await getMangaPlusDetails(numericId);
  if (!details) {
    return res.status(404).json({ error: 'Manga not found' });
  }

  return res.json({
    success: true,
    manga: details.manga,
    chapters: details.chapters || []
  });
}

// ============ WEBTOONS ============
async function handleWebtoons(req, res, id, isChapter) {
  const webtoonId = id.replace('webtoons-', '');

  if (isChapter) {
    const { episode } = req.query;
    const pages = await getWebtoonChapterPages(webtoonId, episode);
    return res.json({ success: true, pages, source: 'webtoons' });
  }

  const details = await getWebtoonDetails(webtoonId);
  if (!details) {
    return res.status(404).json({ error: 'Webtoon not found' });
  }

  return res.json({
    success: true,
    manga: details.manga,
    chapters: details.chapters || []
  });
}

// ============ TUMANGA ============
async function handleTuManga(req, res, id, isChapter) {
  const slug = id.replace('tumanga-', '');

  if (isChapter) {
    const { chapter } = req.query;
    const pages = await getTuMangaPages(slug, chapter);
    return res.json({ success: true, ...pages, source: 'tumanga' });
  }

  const [details, chaptersData] = await Promise.all([
    getTuMangaDetails(slug).catch(() => null),
    getTuMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
  ]);

  if (!details) {
    return res.status(404).json({ error: 'Manga not found' });
  }

  return res.json({
    success: true,
    manga: formatTuMangaResult(details),
    chapters: chaptersData.chapters,
    totalChapters: chaptersData.total
  });
}

// ============ ANILIST ============
async function handleAniList(req, res, id) {
  const anilistId = id.replace('anilist-', '');
  const details = await getAniListDetails(anilistId);

  if (!details) {
    return res.status(404).json({ error: 'Manga not found' });
  }

  return res.json({
    success: true,
    manga: {
      id: details.id,
      title: details.title,
      description: details.description,
      coverUrl: details.coverUrl,
      bannerUrl: details.bannerUrl,
      author: details.author,
      artist: details.artist,
      status: details.status,
      year: details.year,
      type: details.type,
      genres: details.genres,
      tags: details.tags,
      score: details.score,
      source: 'anilist',
      sourceUrl: details.sourceUrl
    },
    chapters: [],
    relations: details.relations || [],
    recommendations: details.recommendations || [],
    externalLinks: details.externalLinks || [],
    note: 'AniList solo provee información. Los capítulos deben buscarse en otras fuentes.'
  });
}

// ============ JIKAN ============
async function handleJikan(req, res, id) {
  const malId = id.replace('jikan-', '');
  const details = await getJikanDetails(malId);

  if (!details) {
    return res.status(404).json({ error: 'Manga not found' });
  }

  return res.json({
    success: true,
    manga: {
      id: details.id,
      malId: details.malId,
      title: details.title,
      titleEnglish: details.titleEnglish,
      description: details.description,
      coverUrl: details.coverUrl,
      author: details.author,
      status: details.status,
      year: details.year,
      type: details.type,
      genres: details.genres,
      score: details.score,
      source: 'jikan',
      sourceUrl: details.sourceUrl
    },
    chapters: [],
    relations: details.relations || [],
    externalLinks: details.externalLinks || [],
    note: 'MyAnimeList solo provee información. Los capítulos deben buscarse en otras fuentes.'
  });
}

// ============ VISORMANGA ============
async function handleVisorManga(req, res, id, isChapter) {
  const slug = id.replace('visormanga-', '');

  if (isChapter) {
    const { chapter } = req.query;
    const pages = await getVisorMangaPages(slug, chapter);
    return res.json({ success: true, ...pages, source: 'visormanga' });
  }

  const [details, chaptersData] = await Promise.all([
    getVisorMangaDetails(slug).catch(() => null),
    getVisorMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
  ]);

  if (!details) {
    return res.status(404).json({ error: 'Manga not found' });
  }

  return res.json({
    success: true,
    manga: formatVisorMangaResult(details),
    chapters: chaptersData.chapters,
    totalChapters: chaptersData.total
  });
}

// ============ MANGALECTOR ============
async function handleMangaLector(req, res, id, isChapter) {
  const slug = id.replace('mangalector-', '');

  if (isChapter) {
    const { chapter } = req.query;
    const pages = await getMangaLectorPages(slug, chapter);
    return res.json({ success: true, ...pages, source: 'mangalector' });
  }

  const [details, chaptersData] = await Promise.all([
    getMangaLectorDetails(slug).catch(() => null),
    getMangaLectorChapters(slug).catch(() => ({ chapters: [], total: 0 }))
  ]);

  if (!details) {
    return res.status(404).json({ error: 'Manga not found' });
  }

  return res.json({
    success: true,
    manga: formatMangaLectorResult(details),
    chapters: chaptersData.chapters,
    totalChapters: chaptersData.total
  });
}
