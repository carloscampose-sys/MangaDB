/**
 * Endpoint de búsqueda de mangas/manhwas/webtoons
 * URL: /api/search?q=naruto&type=manga&limit=20&source=all
 * Sources: mangadex, mangaplus, webtoons, tumanga, anilist, jikan, visormanga, mangalector, all
 */

import { searchManga } from '../lib/mangadex-client.js';
import { searchMangaPlus, formatMangaPlusTitle } from '../lib/mangaplus-client.js';
import { searchWebtoons, formatWebtoonResult } from '../lib/webtoons-client.js';
import { searchTuManga, formatTuMangaResult } from '../lib/tumanga-client.js';
import { searchAniList, formatAniListResult } from '../lib/anilist-client.js';
import { searchJikan, formatJikanResult } from '../lib/jikan-client.js';
import { searchVisorManga, formatVisorMangaResult } from '../lib/visormanga-client.js';
import { searchMangaLector, formatMangaLectorResult } from '../lib/mangalector-client.js';

export default async function handler(req, res) {
    // Solo permitir método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { q, type, limit = 20, source = 'all' } = req.query;

        // Validar parámetros
        if (!q || q.trim() === '') {
            return res.status(400).json({
                error: 'El parámetro "q" es requerido'
            });
        }

        console.log(`Buscando: "${q}", tipo: ${type || 'todos'}, fuente: ${source}, límite: ${limit}`);

        const limitNum = parseInt(limit);

        // Definir todas las fuentes disponibles con sus funciones
        const sources = {
            mangadex: {
                search: () => searchManga(q, limitNum),
                format: (results) => results // Ya viene formateado
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

        // Determinar qué fuentes buscar
        const sourcesToSearch = source === 'all'
            ? Object.keys(sources)
            : [source].filter(s => sources[s]);

        // Buscar en PARALELO usando Promise.allSettled
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

        // Combinar resultados
        let results = [];
        const sourceStatus = {};

        searchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { source: srcName, results: srcResults, success, error } = result.value;
                sourceStatus[srcName] = { success, count: srcResults.length, error };
                results = results.concat(srcResults);
            }
        });

        console.log('Estado de fuentes:', sourceStatus)

        // Filtrar por tipo si se especifica
        let filteredResults = results;
        if (type && type !== 'all') {
            filteredResults = results.filter(manga => manga.type === type);
        }

        // Eliminar duplicados por título similar
        const seen = new Set();
        filteredResults = filteredResults.filter(manga => {
            const key = manga.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Responder con los resultados
        res.status(200).json({
            success: true,
            count: filteredResults.length,
            results: filteredResults.slice(0, limitNum),
            sourceStatus // Info sobre cada fuente para UI
        });

    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({
            error: 'Error al buscar mangas',
            message: error.message
        });
    }
}
