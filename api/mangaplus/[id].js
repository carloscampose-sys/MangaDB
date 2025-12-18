/**
 * Endpoint para obtener detalles y capítulos de un título de Manga Plus
 * URL: /api/mangaplus/[id]
 */

import { getTitleDetail } from '../../lib/mangaplus-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID del título es requerido' });
        }

        // Extraer ID numérico si viene con prefijo
        const titleId = id.replace('mangaplus_', '');

        console.log(`Obteniendo detalles de Manga Plus: ${titleId}`);

        const detail = await getTitleDetail(titleId);

        res.status(200).json({
            success: true,
            manga: {
                id: `mangaplus_${titleId}`,
                title: detail.title,
                author: detail.author,
                description: detail.description,
                coverUrl: detail.coverUrl,
                bannerUrl: detail.bannerUrl,
                status: 'ongoing',
                type: 'manga',
                source: 'mangaplus',
                sourceId: titleId
            },
            chapters: detail.chapters.map(ch => ({
                ...ch,
                id: `mangaplus_${ch.id}`,
                source: 'mangaplus'
            }))
        });

    } catch (error) {
        console.error('Error obteniendo detalles de Manga Plus:', error);
        res.status(500).json({
            error: 'Error al obtener detalles',
            message: error.message
        });
    }
}
