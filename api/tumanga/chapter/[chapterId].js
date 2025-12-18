/**
 * Endpoint para obtener páginas de un capítulo de TuManga
 * URL: /api/tumanga/chapter/[chapterId]
 * Formato de chapterId: "slug-chapter" (ej: "torre-de-dios-1.00")
 */

import { getTuMangaPages } from '../../../lib/tumanga-client.js';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { chapterId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ error: 'ID de capítulo requerido' });
    }

    // Parsear el ID del capítulo
    // Formato esperado: "tumanga-slug-chChapter" o "slug-chapter"
    let cleanId = chapterId.replace('tumanga-', '').replace('-ch', '-');

    // Encontrar el último guión seguido de número para separar slug de chapter
    const lastDashMatch = cleanId.match(/^(.+)-(\d+(?:\.\d+)?)$/);

    if (!lastDashMatch) {
      return res.status(400).json({
        error: 'Formato de ID inválido. Use: slug-chapter (ej: torre-de-dios-1.00)'
      });
    }

    const slug = lastDashMatch[1];
    const chapter = lastDashMatch[2];

    console.log(`Obteniendo páginas de TuManga: slug=${slug}, chapter=${chapter}`);

    const pagesData = await getTuMangaPages(slug, chapter);

    if (!pagesData.pages || pagesData.pages.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron páginas para este capítulo'
      });
    }

    res.status(200).json({
      success: true,
      pages: pagesData.pages,
      total: pagesData.total,
      source: 'tumanga',
      // Headers necesarios para las imágenes de TuManga
      imageHeaders: {
        'Referer': 'https://tumanga.org/'
      }
    });

  } catch (error) {
    console.error('Error en /api/tumanga/chapter/[chapterId]:', error);
    res.status(500).json({
      error: 'Error al obtener páginas del capítulo',
      message: error.message
    });
  }
}
