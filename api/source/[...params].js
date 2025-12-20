import { getTuMangaDetails, getTuMangaChapters, getTuMangaPages, formatTuMangaResult } from '../../_lib/tumanga-client.js';
import { getVisorMangaDetails, getVisorMangaChapters, getVisorMangaPages, formatVisorMangaResult } from '../../_lib/visormanga-client.js';
import { getMangaLectorDetails, getMangaLectorChapters, getMangaLectorPages, formatMangaLectorResult } from '../../_lib/mangalector-client.js';
import { getAniListDetails } from '../../_lib/anilist-client.js';
import { getJikanDetails } from '../../_lib/jikan-client.js';
import { getTitleDetail as getMangaPlusDetails } from '../../_lib/mangaplus-client.js';
import { getWebtoonDetails, getWebtoonChapters, getEpisodePages, formatWebtoonResult } from '../../_lib/webtoons-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { params } = req.query;

        if (!params || params.length < 2) {
            return res.status(400).json({ error: 'Invalid route' });
        }

        const source = params[0];
        const isChapter = params[1] === 'chapter';
        const id = isChapter ? params[2] : params[1];

        if (!id) {
            return res.status(400).json({ error: 'ID required' });
        }

        if (isChapter) {
            return await handleChapter(req, res, source, id);
        }

        return await handleDetails(req, res, source, id);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

async function handleDetails(req, res, source, id) {
    switch (source) {
        case 'tumanga': {
            const slug = id.replace('tumanga-', '');
            const [details, chaptersData] = await Promise.all([
                getTuMangaDetails(slug).catch(() => null),
                getTuMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
            ]);
            if (!details) return res.status(404).json({ error: 'Manga not found' });
            return res.json({ success: true, manga: formatTuMangaResult(details), chapters: chaptersData.chapters, totalChapters: chaptersData.total });
        }

        case 'visormanga': {
            const slug = id.replace('visormanga-', '');
            const [details, chaptersData] = await Promise.all([
                getVisorMangaDetails(slug).catch(() => null),
                getVisorMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
            ]);
            if (!details) return res.status(404).json({ error: 'Manga not found' });
            return res.json({ success: true, manga: formatVisorMangaResult(details), chapters: chaptersData.chapters, totalChapters: chaptersData.total });
        }

        case 'mangalector': {
            const slug = id.replace('mangalector-', '');
            const [details, chaptersData] = await Promise.all([
                getMangaLectorDetails(slug).catch(() => null),
                getMangaLectorChapters(slug).catch(() => ({ chapters: [], total: 0 }))
            ]);
            if (!details) return res.status(404).json({ error: 'Manga not found' });
            return res.json({ success: true, manga: formatMangaLectorResult(details), chapters: chaptersData.chapters, totalChapters: chaptersData.total });
        }

        case 'anilist': {
            const anilistId = id.replace('anilist-', '');
            const details = await getAniListDetails(anilistId);
            if (!details) return res.status(404).json({ error: 'Manga not found' });
            return res.json({
                success: true,
                manga: { id: details.id, title: details.title, description: details.description, coverUrl: details.coverUrl, bannerUrl: details.bannerUrl, author: details.author, artist: details.artist, status: details.status, year: details.year, type: details.type, genres: details.genres, tags: details.tags, score: details.score, source: 'anilist', sourceUrl: details.sourceUrl },
                chapters: [], relations: details.relations || [], recommendations: details.recommendations || [], externalLinks: details.externalLinks || [],
                note: 'AniList solo provee información. Los capítulos deben buscarse en otras fuentes.'
            });
        }

        case 'jikan': {
            const malId = id.replace('jikan-', '');
            const details = await getJikanDetails(malId);
            if (!details) return res.status(404).json({ error: 'Manga not found' });
            return res.json({
                success: true,
                manga: { id: details.id, malId: details.malId, title: details.title, titleEnglish: details.titleEnglish, description: details.description, coverUrl: details.coverUrl, author: details.author, status: details.status, year: details.year, type: details.type, genres: details.genres, score: details.score, source: 'jikan', sourceUrl: details.sourceUrl },
                chapters: [], relations: details.relations || [], externalLinks: details.externalLinks || [],
                note: 'MyAnimeList solo provee información. Los capítulos deben buscarse en otras fuentes.'
            });
        }

        case 'mangaplus': {
            const numericId = id.replace('mangaplus_', '');
            const details = await getMangaPlusDetails(numericId);
            if (!details) return res.status(404).json({ error: 'Manga not found' });
            return res.json({
                success: true,
                manga: { id: `mangaplus_${numericId}`, title: details.title, author: details.author || 'Shueisha', description: details.description || '', coverUrl: details.coverUrl, status: 'ongoing', type: 'manga', source: 'mangaplus' },
                chapters: details.chapters || []
            });
        }

        case 'webtoons': {
            const webtoonId = id.replace('webtoons-', '');
            const [details, chaptersData] = await Promise.all([
                getWebtoonDetails(webtoonId).catch(() => null),
                getWebtoonChapters(webtoonId).catch(() => ({ chapters: [], total: 0 }))
            ]);
            if (!details) return res.status(404).json({ error: 'Webtoon not found' });
            return res.json({ success: true, manga: formatWebtoonResult(details), chapters: chaptersData.chapters || [] });
        }

        default:
            return res.status(404).json({ error: `Source "${source}" not found` });
    }
}

async function handleChapter(req, res, source, chapterId) {
    const { chapter, slug } = req.query;

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
                success: true, pages: [], source: 'mangaplus',
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
