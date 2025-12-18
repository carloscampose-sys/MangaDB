/**
 * Endpoint para obtener páginas de un capítulo de Manga Plus
 * URL: /api/mangaplus/chapter/[chapterId]
 */

import { getChapterViewer } from '../../../lib/mangaplus-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { chapterId } = req.query;

        if (!chapterId) {
            return res.status(400).json({ error: 'ID del capítulo es requerido' });
        }

        // Extraer ID numérico si viene con prefijo
        const numericId = chapterId.replace('mangaplus_', '');

        console.log(`Obteniendo páginas de Manga Plus capítulo: ${numericId}`);

        const pagesData = await getChapterViewer(numericId);

        // Manga Plus tiene imágenes encriptadas, necesitamos manejar esto
        if (pagesData.encrypted) {
            res.status(200).json({
                success: true,
                chapterId: chapterId,
                totalPages: pagesData.pages.length,
                pages: pagesData.pages,
                encrypted: true,
                message: 'Las páginas de Manga Plus requieren desencriptación',
                // Alternativa: redirigir al sitio oficial
                externalUrl: `https://mangaplus.shueisha.co.jp/viewer/${numericId}`
            });
        } else {
            res.status(200).json({
                success: true,
                chapterId: chapterId,
                totalPages: pagesData.pages.length,
                pages: pagesData.pages
            });
        }

    } catch (error) {
        console.error('Error obteniendo páginas de Manga Plus:', error);
        res.status(500).json({
            error: 'Error al obtener páginas',
            message: error.message
        });
    }
}
