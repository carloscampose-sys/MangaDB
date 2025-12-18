/**
 * Endpoint para obtener detalles y capítulos de un webtoon
 * URL: /api/webtoons/[id]
 */

import { getWebtoonDetails, getWebtoonChapters, formatWebtoonResult } from '../../lib/webtoons-client.js';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de webtoon requerido' });
    }

    // El ID puede venir como "webtoons-12345" o solo "12345"
    const titleNo = id.replace('webtoons-', '');

    console.log(`Obteniendo webtoon: ${titleNo}`);

    // Obtener detalles y capítulos en paralelo
    const [details, chaptersData] = await Promise.all([
      getWebtoonDetails(titleNo).catch(err => {
        console.error('Error getting details:', err);
        return null;
      }),
      getWebtoonChapters(titleNo).catch(err => {
        console.error('Error getting chapters:', err);
        return { chapters: [], total: 0 };
      })
    ]);

    if (!details) {
      return res.status(404).json({ error: 'Webtoon no encontrado' });
    }

    // Formatear respuesta
    const response = {
      success: true,
      manga: formatWebtoonResult(details),
      chapters: chaptersData.chapters,
      totalChapters: chaptersData.total
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error en /api/webtoons/[id]:', error);
    res.status(500).json({
      error: 'Error al obtener webtoon',
      message: error.message
    });
  }
}
