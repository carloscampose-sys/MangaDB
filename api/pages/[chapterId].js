/**
 * Endpoint para obtener las páginas de un capítulo
 * URL: /api/pages/[chapterId]
 * Ejemplo: /api/pages/e199c7d8-d1d5-45c2-b5cd-5e72e6e5e9d1
 */

import { getChapterPages } from '../../lib/mangadex-client.js';

export default async function handler(req, res) {
    // Solo permitir método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { chapterId } = req.query;

        // Validar chapterId
        if (!chapterId) {
            return res.status(400).json({
                error: 'ID del capítulo es requerido'
            });
        }

        console.log(`Obteniendo páginas del capítulo: ${chapterId}`);

        // Obtener páginas
        const pagesData = await getChapterPages(chapterId);

        // Responder con las URLs de las páginas
        res.status(200).json({
            success: true,
            chapterId,
            totalPages: pagesData.pages.length,
            pages: pagesData.pages
        });

    } catch (error) {
        console.error('Error obteniendo páginas:', error);

        if (error.message.includes('404')) {
            return res.status(404).json({
                error: 'Capítulo no encontrado',
                message: 'El capítulo con ese ID no existe o no está disponible'
            });
        }

        res.status(500).json({
            error: 'Error al obtener páginas del capítulo',
            message: error.message
        });
    }
}
