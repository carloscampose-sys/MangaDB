/**
 * API Unificada - Catch-all handler
 * Consolida todas las APIs en una sola función serverless
 *
 * Rutas:
 *   /api/search?q=...
 *   /api/manga/[id]
 *   /api/chapters/[id]
 *   /api/pages/[chapterId]
 *   /api/source/[source]/[id]
 *   /api/source/[source]/chapter/[chapterId]
 */

// Importar clientes MangaDex
import { searchManga, getMangaDetails, getMangaChapters, getChapterPages } from './_lib/mangadex-client.js';

// Importar clientes de otras fuentes
import { searchMangaPlus, formatMangaPlusTitle, getTitleDetail as getMangaPlusDetails } from './_lib/mangaplus-client.js';
import { searchWebtoons, formatWebtoonResult, getWebtoonDetails, getWebtoonChapters, getEpisodePages } from './_lib/webtoons-client.js';
import { searchTuManga, formatTuMangaResult, getTuMangaDetails, getTuMangaChapters, getTuMangaPages } from './_lib/tumanga-client.js';
import { searchAniList, formatAniListResult, getAniListDetails } from './_lib/anilist-client.js';
import { searchJikan, formatJikanResult, getJikanDetails } from './_lib/jikan-client.js';
import { searchVisorManga, formatVisorMangaResult, getVisorMangaDetails, getVisorMangaChapters, getVisorMangaPages } from './_lib/visormanga-client.js';
import { searchMangaLector, formatMangaLectorResult, getMangaLectorDetails, getMangaLectorChapters, getMangaLectorPages } from './_lib/mangalector-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { path } = req.query;

        if (!path || path.length === 0) {
            return res.status(400).json({ error: 'Invalid API route' });
        }

        const route = path[0];
        console.log('API Route:', route, 'Path:', path);

        // Router principal
        switch (route) {
            case 'search':
                return await handleSearch(req, res);

            case 'manga':
                return await handleManga(req, res, path[1]);

            case 'chapters':
                return await handleChapters(req, res, path[1]);

            case 'pages':
                return await handlePages(req, res, path[1]);

            case 'source':
                return await handleSource(req, res, path.slice(1));

            default:
                return res.status(404).json({ error: `Route "${route}" not found` });
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

// ============ SEARCH ============
async function handleSearch(req, res) {
    const { q, type, limit = 20, source = 'all' } = req.query;

    if (!q || q.trim() === '') {
        return res.status(400).json({ error: 'El parámetro "q" es requerido' });
    }

    console.log(`Buscando: "${q}", tipo: ${type || 'todos'}, fuente: ${source}, límite: ${limit}`);

    const limitNum = parseInt(limit);

    const sources = {
        mangadex: {
            search: () => searchManga(q, limitNum),
            format: (results) => results
        },
        mangaplus: {
            search: () => searchMangaPlus(q, limitNum),
            format: (results) => results.map(formatMangaPlusTitle)
        },
        webtoons: {
            search: () => searchWebtoons(q, limitNum),
            format: (results) => results.map(formatWebtoonResult)
        },
        tumanga: {
            search: () => searchTuManga(q, limitNum),
            format: (results) => results.map(formatTuMangaResult)
        },
        anilist: {
            search: () => searchAniList(q, limitNum),
            format: (results) => results.map(formatAniListResult)
        },
        jikan: {
            search: () => searchJikan(q, limitNum),
            format: (results) => results.map(formatJikanResult)
        },
        visormanga: {
            search: () => searchVisorManga(q, limitNum),
            format: (results) => results.map(formatVisorMangaResult)
        },
        mangalector: {
            search: () => searchMangaLector(q, limitNum),
            format: (results) => results.map(formatMangaLectorResult)
        }
    };

    const sourcesToSearch = source === 'all'
        ? Object.keys(sources)
        : [source].filter(s => sources[s]);

    const searchPromises = sourcesToSearch.map(async (sourceName) => {
        const sourceConfig = sources[sourceName];
        try {
            const results = await sourceConfig.search();
            return {
                source: sourceName,
                results: sourceConfig.format(results),
                success: true
            };
        } catch (err) {
            console.error(`Error buscando en ${sourceName}:`, err.message);
            return {
                source: sourceName,
                results: [],
                success: false,
                error: err.message
            };
        }
    });

    const searchResults = await Promise.allSettled(searchPromises);

    let results = [];
    const sourceStatus = {};

    searchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
            const { source: srcName, results: srcResults, success, error } = result.value;
            sourceStatus[srcName] = { success, count: srcResults.length, error };
            results = results.concat(srcResults);
        }
    });

    // Filtrar por tipo
    let filteredResults = results;
    if (type && type !== 'all') {
        filteredResults = results.filter(manga => manga.type === type);
    }

    // Eliminar duplicados
    const seen = new Set();
    filteredResults = filteredResults.filter(manga => {
        const key = manga.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return res.json({
        success: true,
        count: filteredResults.length,
        results: filteredResults.slice(0, limitNum),
        sourceStatus
    });
}

// ============ MANGA DETAILS ============
async function handleManga(req, res, id) {
    if (!id) {
        return res.status(400).json({ error: 'ID del manga es requerido' });
    }

    console.log(`Obteniendo detalles del manga: ${id}`);
    const mangaDetails = await getMangaDetails(id);

    return res.json({
        success: true,
        manga: mangaDetails
    });
}

// ============ CHAPTERS ============
async function handleChapters(req, res, id) {
    const { offset = 0, limit = 100 } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID del manga es requerido' });
    }

    console.log(`Obteniendo capítulos del manga: ${id}`);
    const chaptersData = await getMangaChapters(id, parseInt(offset), parseInt(limit));

    return res.json({
        success: true,
        mangaId: id,
        ...chaptersData
    });
}

// ============ PAGES ============
async function handlePages(req, res, chapterId) {
    if (!chapterId) {
        return res.status(400).json({ error: 'ID del capítulo es requerido' });
    }

    console.log(`Obteniendo páginas del capítulo: ${chapterId}`);
    const pagesData = await getChapterPages(chapterId);

    return res.json({
        success: true,
        chapterId,
        totalPages: pagesData.pages.length,
        pages: pagesData.pages
    });
}

// ============ SOURCE HANDLER ============
async function handleSource(req, res, pathParts) {
    if (!pathParts || pathParts.length < 2) {
        return res.status(400).json({ error: 'Invalid source route' });
    }

    const source = pathParts[0];
    const isChapter = pathParts[1] === 'chapter';
    const id = isChapter ? pathParts[2] : pathParts[1];

    if (!id) {
        return res.status(400).json({ error: 'ID required' });
    }

    console.log(`API Source: ${source}, isChapter: ${isChapter}, id: ${id}`);

    if (isChapter) {
        return await handleSourceChapter(req, res, source, id);
    }

    // Handle manga details by source
    switch (source) {
        case 'tumanga': {
            const slug = id.replace('tumanga-', '');
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

        case 'visormanga': {
            const slug = id.replace('visormanga-', '');
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

        case 'mangalector': {
            const slug = id.replace('mangalector-', '');
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

        case 'anilist': {
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

        case 'jikan': {
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

        case 'mangaplus': {
            const numericId = id.replace('mangaplus_', '');
            const details = await getMangaPlusDetails(numericId);
            if (!details) {
                return res.status(404).json({ error: 'Manga not found' });
            }
            return res.json({
                success: true,
                manga: {
                    id: `mangaplus_${numericId}`,
                    title: details.title,
                    author: details.author || 'Shueisha',
                    description: details.description || '',
                    coverUrl: details.coverUrl,
                    status: 'ongoing',
                    type: 'manga',
                    source: 'mangaplus'
                },
                chapters: details.chapters || []
            });
        }

        case 'webtoons': {
            const webtoonId = id.replace('webtoons-', '');
            const [details, chaptersData] = await Promise.all([
                getWebtoonDetails(webtoonId).catch(() => null),
                getWebtoonChapters(webtoonId).catch(() => ({ chapters: [], total: 0 }))
            ]);
            if (!details) {
                return res.status(404).json({ error: 'Webtoon not found' });
            }
            return res.json({
                success: true,
                manga: formatWebtoonResult(details),
                chapters: chaptersData.chapters || []
            });
        }

        default:
            return res.status(404).json({ error: `Source "${source}" not found` });
    }
}

// ============ SOURCE CHAPTER HANDLER ============
async function handleSourceChapter(req, res, source, chapterId) {
    const { chapter, slug } = req.query;
    console.log(`API Source Chapter: ${source}, chapterId: ${chapterId}, chapter: ${chapter}`);

    switch (source) {
        case 'tumanga': {
            const mangaSlug = slug || chapterId.replace('tumanga-', '').replace(/-ch[\d.]+$/, '');
            const pages = await getTuMangaPages(mangaSlug, chapter);
            return res.json({ success: true, ...pages, source: 'tumanga' });
        }

        case 'visormanga': {
            const mangaSlug = slug || chapterId.replace('visormanga-', '').replace(/-ch[\d.]+$/, '');
            const pages = await getVisorMangaPages(mangaSlug, chapter);
            return res.json({ success: true, ...pages, source: 'visormanga' });
        }

        case 'mangalector': {
            const mangaSlug = slug || chapterId.replace('mangalector-', '').replace(/-ch[\d.]+$/, '');
            const pages = await getMangaLectorPages(mangaSlug, chapter);
            return res.json({ success: true, ...pages, source: 'mangalector' });
        }

        case 'mangaplus': {
            return res.json({
                success: true,
                pages: [],
                source: 'mangaplus',
                note: 'Las páginas de MangaPlus están encriptadas. Usa el visor oficial.',
                viewerUrl: `https://mangaplus.shueisha.co.jp/viewer/${chapterId.replace('mangaplus_', '')}`
            });
        }

        case 'webtoons': {
            const webtoonId = chapterId.replace('webtoons-', '').replace(/-ep\d+$/, '');
            const { episode } = req.query;
            const pages = await getEpisodePages(webtoonId, episode);
            return res.json({ success: true, ...pages, source: 'webtoons' });
        }

        default:
            return res.status(404).json({ error: `Source "${source}" not found` });
    }
}
