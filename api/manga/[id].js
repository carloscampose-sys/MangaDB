/**
 * Endpoint para obtener detalles de un manga específico
 * URL: /api/manga/[id]
 * Ejemplo: /api/manga/a1c7c817-4e59-43b7-9365-09675a149a6f
 */

import { getMangaDetails } from '../../lib/mangadex-client.js';

export default async function handler(req, res) {
    // Solo permitir método GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { id } = req.query;

        // Validar ID
        if (!id) {
            return res.status(400).json({
                error: 'ID del manga es requerido'
            });
        }

        console.log(`Obteniendo detalles del manga: ${id}`);

        // Obtener detalles del manga
        const mangaDetails = await getMangaDetails(id);

        // Responder con los detalles
        res.status(200).json({
            success: true,
            manga: mangaDetails
        });

    } catch (error) {
        console.error('Error obteniendo detalles:', error);

        // Si es un 404, el manga no existe
        if (error.message.includes('404')) {
            return res.status(404).json({
                error: 'Manga no encontrado',
                message: 'El manga con ese ID no existe'
            });
        }

        res.status(500).json({
            error: 'Error al obtener detalles del manga',
            message: error.message
        });
    }
}
