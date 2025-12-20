import { getChapterPages } from '../../_lib/mangadex-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { chapterId } = req.query;

        if (!chapterId) {
            return res.status(400).json({ error: 'ID del capítulo es requerido' });
        }

        const pagesData = await getChapterPages(chapterId);

        return res.json({ success: true, chapterId, totalPages: pagesData.pages.length, pages: pagesData.pages });
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('404')) {
            return res.status(404).json({ error: 'Capítulo no encontrado' });
        }
        res.status(500).json({ error: 'Error al obtener páginas', message: error.message });
    }
}
