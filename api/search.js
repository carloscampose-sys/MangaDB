import { searchManga } from '../_lib/mangadex-client.js';
import { searchMangaPlus, formatMangaPlusTitle } from '../_lib/mangaplus-client.js';
import { searchWebtoons, formatWebtoonResult } from '../_lib/webtoons-client.js';
import { searchTuManga, formatTuMangaResult } from '../_lib/tumanga-client.js';
import { searchAniList, formatAniListResult } from '../_lib/anilist-client.js';
import { searchVisorManga, formatVisorMangaResult } from '../_lib/visormanga-client.js';
import { searchMangaLector, formatMangaLectorResult } from '../_lib/mangalector-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { q, type, limit = 20, source = 'all' } = req.query;

        if (!q || q.trim() === '') {
            return res.status(400).json({ error: 'El parámetro "q" es requerido' });
        }

        const limitNum = parseInt(limit);

        const sources = {
            mangadex: { search: () => searchManga(q, limitNum), format: (r) => r },
            mangaplus: { search: () => searchMangaPlus(q, limitNum), format: (r) => r.map(formatMangaPlusTitle) },
            webtoons: { search: () => searchWebtoons(q, limitNum), format: (r) => r.map(formatWebtoonResult) },
            tumanga: { search: () => searchTuManga(q, limitNum), format: (r) => r.map(formatTuMangaResult) },
            anilist: { search: () => searchAniList(q, limitNum), format: (r) => r.map(formatAniListResult) },
            visormanga: { search: () => searchVisorManga(q, limitNum), format: (r) => r.map(formatVisorMangaResult) },
            mangalector: { search: () => searchMangaLector(q, limitNum), format: (r) => r.map(formatMangaLectorResult) }
        };

        const sourcesToSearch = source === 'all' ? Object.keys(sources) : [source].filter(s => sources[s]);

        const searchPromises = sourcesToSearch.map(async (srcName) => {
            try {
                const results = await sources[srcName].search();
                return { source: srcName, results: sources[srcName].format(results), success: true };
            } catch (err) {
                return { source: srcName, results: [], success: false, error: err.message };
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

        let filteredResults = results;
        if (type && type !== 'all') {
            filteredResults = results.filter(manga => manga.type === type);
        }

        const seen = new Set();
        filteredResults = filteredResults.filter(manga => {
            const key = manga.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return res.json({ success: true, count: filteredResults.length, results: filteredResults.slice(0, limitNum), sourceStatus });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Error al buscar', message: error.message });
    }
}
