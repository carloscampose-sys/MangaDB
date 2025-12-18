/**
 * Endpoint para obtener capítulos de un manga
 * URL: /api/chapters/[id]?offset=0&limit=100
 * Ejemplo: /api/chapters/a1c7c817-4e59-43b7-9365-09675a149a6f
 */

import { getMangaChapters } from '../../lib/mangadex-client.js';

export default async function handler(req, res) {
    // Solo permitir método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { id, offset = 0, limit = 100 } = req.query;

        // Validar ID
        if (!id) {
            return res.status(400).json({
                error: 'ID del manga es requerido'
            });
        }

        console.log(`Obteniendo capítulos del manga: ${id}`);

        // Obtener capítulos
        const chaptersData = await getMangaChapters(
            id,
            parseInt(offset),
            parseInt(limit)
        );

        // Responder con los capítulos
        res.status(200).json({
            success: true,
            mangaId: id,
            ...chaptersData
        });

    } catch (error) {
        console.error('Error obteniendo capítulos:', error);

        res.status(500).json({
            error: 'Error al obtener capítulos',
            message: error.message
        });
    }
}
