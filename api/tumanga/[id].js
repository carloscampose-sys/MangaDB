/**
 * Endpoint para obtener detalles y capítulos de un manga de TuManga
 * URL: /api/tumanga/[id]
 */

import { getTuMangaDetails, getTuMangaChapters, formatTuMangaResult } from '../../lib/tumanga-client.js';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de manga requerido' });
    }

    // El ID puede venir como "tumanga-slug" o solo "slug"
    const slug = id.replace('tumanga-', '');

    console.log(`Obteniendo manga de TuManga: ${slug}`);

    // Obtener detalles y capítulos en paralelo
    const [details, chaptersData] = await Promise.all([
      getTuMangaDetails(slug).catch(err => {
        console.error('Error getting details:', err);
        return null;
      }),
      getTuMangaChapters(slug).catch(err => {
        console.error('Error getting chapters:', err);
        return { chapters: [], total: 0 };
      })
    ]);

    if (!details) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }

    // Formatear respuesta
    const response = {
      success: true,
      manga: formatTuMangaResult(details),
      chapters: chaptersData.chapters,
      totalChapters: chaptersData.total
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error en /api/tumanga/[id]:', error);
    res.status(500).json({
      error: 'Error al obtener manga',
      message: error.message
    });
  }
}
