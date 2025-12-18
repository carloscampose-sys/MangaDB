/**
 * Endpoint de búsqueda de mangas/manhwas/webtoons
 * URL: /api/search?q=naruto&type=manga&limit=20
 */

import { searchManga } from '../lib/mangadex-client.js';

export default async function handler(req, res) {
    // Solo permitir método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { q, type, limit = 20 } = req.query;

        // Validar parámetros
        if (!q || q.trim() === '') {
            return res.status(400).json({
                error: 'El parámetro "q" es requerido'
            });
        }

        console.log(`Buscando: "${q}", tipo: ${type || 'todos'}, límite: ${limit}`);

        // Buscar en MangaDex
        const results = await searchManga(q, parseInt(limit));

        // Filtrar por tipo si se especifica
        let filteredResults = results;
        if (type && type !== 'all') {
            filteredResults = results.filter(manga => manga.type === type);
        }

        // Responder con los resultados
        res.status(200).json({
            success: true,
            count: filteredResults.length,
            results: filteredResults
        });

    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({
            error: 'Error al buscar mangas',
            message: error.message
        });
    }
}
