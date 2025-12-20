import { getMangaDetails } from '../../_lib/mangadex-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID del manga es requerido' });
        }

        const mangaDetails = await getMangaDetails(id);

        return res.json({ success: true, manga: mangaDetails });
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('404')) {
            return res.status(404).json({ error: 'Manga no encontrado' });
        }
        res.status(500).json({ error: 'Error al obtener detalles', message: error.message });
    }
}
