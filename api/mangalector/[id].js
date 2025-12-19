/**
 * Endpoint para obtener detalles y capítulos de un manga de MangaLector
 * URL: /api/mangalector/[id]
 */

import { getMangaLectorDetails, getMangaLectorChapters, formatMangaLectorResult } from '../../lib/mangalector-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de manga requerido' });
    }

    // El ID puede venir como "mangalector-slug" o solo "slug"
    const slug = id.replace('mangalector-', '');

    console.log(`Obteniendo manga de MangaLector: ${slug}`);

    // Obtener detalles y capítulos en paralelo
    const [details, chaptersData] = await Promise.all([
      getMangaLectorDetails(slug).catch(err => {
        console.error('Error getting details:', err);
        return null;
      }),
      getMangaLectorChapters(slug).catch(err => {
        console.error('Error getting chapters:', err);
        return { chapters: [], total: 0 };
      })
    ]);

    if (!details) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }

    res.status(200).json({
      success: true,
      manga: formatMangaLectorResult(details),
      chapters: chaptersData.chapters,
      totalChapters: chaptersData.total
    });

  } catch (error) {
    console.error('Error en /api/mangalector/[id]:', error);
    res.status(500).json({
      error: 'Error al obtener manga',
      message: error.message
    });
  }
}
