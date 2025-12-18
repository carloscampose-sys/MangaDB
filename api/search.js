/**
 * Endpoint de búsqueda de mangas/manhwas/webtoons
 * URL: /api/search?q=naruto&type=manga&limit=20&source=all
 * Sources: mangadex, mangaplus, all
 */

import { searchManga } from '../lib/mangadex-client.js';
import { searchMangaPlus, formatMangaPlusTitle } from '../lib/mangaplus-client.js';

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

        let results = [];
        const limitNum = parseInt(limit);

        // Buscar en las fuentes seleccionadas
        if (source === 'all' || source === 'mangadex') {
            try {
                const mangadexResults = await searchManga(q, limitNum);
                results = results.concat(mangadexResults);
            } catch (err) {
                console.error('Error buscando en MangaDex:', err.message);
            }
        }

        if (source === 'all' || source === 'mangaplus') {
            try {
                const mangaplusResults = await searchMangaPlus(q, limitNum);
                const formatted = mangaplusResults.map(formatMangaPlusTitle);
                results = results.concat(formatted);
            } catch (err) {
                console.error('Error buscando en Manga Plus:', err.message);
            }
        }

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
            results: filteredResults.slice(0, limitNum)
        });

    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({
            error: 'Error al buscar mangas',
            message: error.message
        });
    }
}
