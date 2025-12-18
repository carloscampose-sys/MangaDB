/**
 * Endpoint para obtener páginas de un episodio de Webtoons
 * URL: /api/webtoons/chapter/[chapterId]
 * Formato de chapterId: "titleNo-episodeNo" (ej: "12345-1")
 */

import { getEpisodePages } from '../../../lib/webtoons-client.js';

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
    // Formato esperado: "webtoons-titleNo-epEpisodeNo" o "titleNo-episodeNo"
    const cleanId = chapterId.replace('webtoons-', '').replace('-ep', '-');
    const parts = cleanId.split('-');

    if (parts.length < 2) {
      return res.status(400).json({
        error: 'Formato de ID inválido. Use: titleNo-episodeNo'
      });
    }

    const titleNo = parts[0];
    const episodeNo = parts[1];

    console.log(`Obteniendo páginas: titleNo=${titleNo}, episodeNo=${episodeNo}`);

    const pagesData = await getEpisodePages(titleNo, episodeNo);

    if (!pagesData.pages || pagesData.pages.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron páginas para este episodio',
        note: 'Webtoons puede requerir autenticación para algunos contenidos'
      });
    }

    res.status(200).json({
      success: true,
      pages: pagesData.pages,
      total: pagesData.total,
      source: 'webtoons',
      // Headers necesarios para las imágenes de Webtoons
      imageHeaders: {
        'Referer': 'https://www.webtoons.com/'
      }
    });

  } catch (error) {
    console.error('Error en /api/webtoons/chapter/[chapterId]:', error);
    res.status(500).json({
      error: 'Error al obtener páginas del episodio',
      message: error.message
    });
  }
}
