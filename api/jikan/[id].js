/**
 * Endpoint para obtener detalles de un manga de Jikan/MyAnimeList
 * URL: /api/jikan/[id]
 */

import { getJikanDetails } from '../../lib/jikan-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de manga requerido' });
    }

    // El ID puede venir como "jikan-123" o solo "123"
    const malId = id.replace('jikan-', '');

    console.log(`Obteniendo manga de Jikan/MAL: ${malId}`);

    const details = await getJikanDetails(malId);

    if (!details) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }

    res.status(200).json({
      success: true,
      manga: {
        id: details.id,
        malId: details.malId,
        title: details.title,
        titleEnglish: details.titleEnglish,
        titleJapanese: details.titleJapanese,
        description: details.description,
        coverUrl: details.coverUrl,
        author: details.author,
        authors: details.authors,
        artist: details.artist,
        status: details.status,
        year: details.year,
        type: details.type,
        genres: details.genres,
        score: details.score,
        rank: details.rank,
        popularity: details.popularity,
        totalChapters: details.totalChapters,
        volumes: details.volumes,
        serializations: details.serializations,
        source: 'jikan',
        sourceUrl: details.sourceUrl
      },
      chapters: [], // Jikan no tiene capítulos para leer
      relations: details.relations || [],
      externalLinks: details.externalLinks || [],
      note: 'MyAnimeList solo provee información. Los capítulos deben buscarse en otras fuentes.'
    });

  } catch (error) {
    console.error('Error en /api/jikan/[id]:', error);
    res.status(500).json({
      error: 'Error al obtener manga',
      message: error.message
    });
  }
}
