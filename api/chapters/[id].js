import { getMangaChapters } from '../../_lib/mangadex-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id, offset = 0, limit = 100 } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID del manga es requerido' });
        }

        const chaptersData = await getMangaChapters(id, parseInt(offset), parseInt(limit));

        return res.json({ success: true, mangaId: id, ...chaptersData });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener capítulos', message: error.message });
    }
}
