/**
 * Endpoint para obtener detalles y capítulos de un manga de VisorManga
 * URL: /api/visormanga/[id]
 */

import { getVisorMangaDetails, getVisorMangaChapters, formatVisorMangaResult } from '../../lib/visormanga-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de manga requerido' });
    }

    // El ID puede venir como "visormanga-slug" o solo "slug"
    const slug = id.replace('visormanga-', '');

    console.log(`Obteniendo manga de VisorManga: ${slug}`);

    // Obtener detalles y capítulos en paralelo
    const [details, chaptersData] = await Promise.all([
      getVisorMangaDetails(slug).catch(err => {
        console.error('Error getting details:', err);
        return null;
      }),
      getVisorMangaChapters(slug).catch(err => {
        console.error('Error getting chapters:', err);
        return { chapters: [], total: 0 };
      })
    ]);

    if (!details) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }

    res.status(200).json({
      success: true,
      manga: formatVisorMangaResult(details),
      chapters: chaptersData.chapters,
      totalChapters: chaptersData.total
    });

  } catch (error) {
    console.error('Error en /api/visormanga/[id]:', error);
    res.status(500).json({
      error: 'Error al obtener manga',
      message: error.message
    });
  }
}
