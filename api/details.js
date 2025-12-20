/**
 * API unificada para obtener detalles de manga de cualquier fuente
 * URL: /api/details?id=xxx&source=mangadex|anilist|tumanga|etc
 */

import { getMangaDetails, getMangaChapters } from '../_lib/mangadex-client.js';
import { getTuMangaDetails, getTuMangaChapters, formatTuMangaResult } from '../_lib/tumanga-client.js';
import { getVisorMangaDetails, getVisorMangaChapters, formatVisorMangaResult } from '../_lib/visormanga-client.js';
import { getMangaLectorDetails, getMangaLectorChapters, formatMangaLectorResult } from '../_lib/mangalector-client.js';
import { getAniListDetails } from '../_lib/anilist-client.js';
import { getJikanDetails } from '../_lib/jikan-client.js';
import { getTitleDetail as getMangaPlusDetails } from '../_lib/mangaplus-client.js';
import { getWebtoonDetails, getWebtoonChapters, formatWebtoonResult } from '../_lib/webtoons-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id, source } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID es requerido' });
        }

        // Detectar fuente automáticamente si no se especifica
        const detectedSource = source || detectSource(id);
        console.log(`Details API: id=${id}, source=${detectedSource}`);

        switch (detectedSource) {
            case 'mangadex':
                return await handleMangaDex(res, id);
            case 'tumanga':
                return await handleTuManga(res, id);
            case 'visormanga':
                return await handleVisorManga(res, id);
            case 'mangalector':
                return await handleMangaLector(res, id);
            case 'anilist':
                return await handleAniList(res, id);
            case 'jikan':
                return await handleJikan(res, id);
            case 'mangaplus':
                return await handleMangaPlus(res, id);
            case 'webtoons':
                return await handleWebtoons(res, id);
            default:
                return res.status(400).json({ error: `Fuente "${detectedSource}" no soportada` });
        }
    } catch (error) {
        console.error('Details API Error:', error);
        res.status(500).json({ error: 'Error interno', message: error.message });
    }
}

function detectSource(id) {
    if (id.startsWith('tumanga-')) return 'tumanga';
    if (id.startsWith('visormanga-')) return 'visormanga';
    if (id.startsWith('mangalector-')) return 'mangalector';
    if (id.startsWith('anilist-')) return 'anilist';
    if (id.startsWith('jikan-')) return 'jikan';
    if (id.startsWith('mangaplus_')) return 'mangaplus';
    if (id.startsWith('webtoons-')) return 'webtoons';
    return 'mangadex';
}

async function handleMangaDex(res, id) {
    const [details, chaptersData] = await Promise.all([
        getMangaDetails(id),
        getMangaChapters(id, 0, 100).catch(() => ({ chapters: [], total: 0 }))
    ]);
    return res.json({ success: true, manga: details, chapters: chaptersData.chapters, totalChapters: chaptersData.total });
}

async function handleTuManga(res, id) {
    const slug = id.replace('tumanga-', '');
    const [details, chaptersData] = await Promise.all([
        getTuMangaDetails(slug).catch(() => null),
        getTuMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
    ]);
    if (!details) return res.status(404).json({ error: 'Manga no encontrado' });
    return res.json({ success: true, manga: formatTuMangaResult(details), chapters: chaptersData.chapters, totalChapters: chaptersData.total });
}

async function handleVisorManga(res, id) {
    const slug = id.replace('visormanga-', '');
    const [details, chaptersData] = await Promise.all([
        getVisorMangaDetails(slug).catch(() => null),
        getVisorMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
    ]);
    if (!details) return res.status(404).json({ error: 'Manga no encontrado' });
    return res.json({ success: true, manga: formatVisorMangaResult(details), chapters: chaptersData.chapters, totalChapters: chaptersData.total });
}

async function handleMangaLector(res, id) {
    const slug = id.replace('mangalector-', '');
    const [details, chaptersData] = await Promise.all([
        getMangaLectorDetails(slug).catch(() => null),
        getMangaLectorChapters(slug).catch(() => ({ chapters: [], total: 0 }))
    ]);
    if (!details) return res.status(404).json({ error: 'Manga no encontrado' });
    return res.json({ success: true, manga: formatMangaLectorResult(details), chapters: chaptersData.chapters, totalChapters: chaptersData.total });
}

async function handleAniList(res, id) {
    const anilistId = id.replace('anilist-', '');
    const details = await getAniListDetails(anilistId);
    if (!details) return res.status(404).json({ error: 'Manga no encontrado' });
    return res.json({
        success: true,
        manga: {
            id: details.id, title: details.title, description: details.description,
            coverUrl: details.coverUrl, bannerUrl: details.bannerUrl,
            author: details.author, artist: details.artist, status: details.status,
            year: details.year, type: details.type, genres: details.genres,
            tags: details.tags, score: details.score, source: 'anilist', sourceUrl: details.sourceUrl
        },
        chapters: [],
        relations: details.relations || [],
        recommendations: details.recommendations || [],
        externalLinks: details.externalLinks || [],
        note: 'AniList solo provee información. Los capítulos deben buscarse en otras fuentes.'
    });
}

async function handleJikan(res, id) {
    const malId = id.replace('jikan-', '');
    const details = await getJikanDetails(malId);
    if (!details) return res.status(404).json({ error: 'Manga no encontrado' });
    return res.json({
        success: true,
        manga: {
            id: details.id, malId: details.malId, title: details.title,
            titleEnglish: details.titleEnglish, description: details.description,
            coverUrl: details.coverUrl, author: details.author, status: details.status,
            year: details.year, type: details.type, genres: details.genres,
            score: details.score, source: 'jikan', sourceUrl: details.sourceUrl
        },
        chapters: [],
        relations: details.relations || [],
        externalLinks: details.externalLinks || [],
        note: 'MyAnimeList solo provee información. Los capítulos deben buscarse en otras fuentes.'
    });
}

async function handleMangaPlus(res, id) {
    const numericId = id.replace('mangaplus_', '');
    const details = await getMangaPlusDetails(numericId);
    if (!details) return res.status(404).json({ error: 'Manga no encontrado' });
    return res.json({
        success: true,
        manga: {
            id: `mangaplus_${numericId}`, title: details.title,
            author: details.author || 'Shueisha', description: details.description || '',
            coverUrl: details.coverUrl, status: 'ongoing', type: 'manga', source: 'mangaplus'
        },
        chapters: details.chapters || []
    });
}

async function handleWebtoons(res, id) {
    const webtoonId = id.replace('webtoons-', '');
    const [details, chaptersData] = await Promise.all([
        getWebtoonDetails(webtoonId).catch(() => null),
        getWebtoonChapters(webtoonId).catch(() => ({ chapters: [], total: 0 }))
    ]);
    if (!details) return res.status(404).json({ error: 'Webtoon no encontrado' });
    return res.json({ success: true, manga: formatWebtoonResult(details), chapters: chaptersData.chapters || [] });
}
