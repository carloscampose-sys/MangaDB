/**
 * Endpoint para obtener detalles de un manga de AniList
 * URL: /api/anilist/[id]
 */

import { getAniListDetails } from '../../lib/anilist-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID de manga requerido' });
    }

    // El ID puede venir como "anilist-123" o solo "123"
    const anilistId = id.replace('anilist-', '');

    console.log(`Obteniendo manga de AniList: ${anilistId}`);

    const details = await getAniListDetails(anilistId);

    if (!details) {
      return res.status(404).json({ error: 'Manga no encontrado' });
    }

    res.status(200).json({
      success: true,
      manga: {
        id: details.id,
        title: details.title,
        description: details.description,
        coverUrl: details.coverUrl,
        bannerUrl: details.bannerUrl,
        author: details.author,
        artist: details.artist,
        status: details.status,
        year: details.year,
        type: details.type,
        genres: details.genres,
        tags: details.tags,
        score: details.score,
        popularity: details.popularity,
        totalChapters: details.totalChapters,
        volumes: details.volumes,
        source: 'anilist',
        sourceUrl: details.sourceUrl
      },
      chapters: [], // AniList no tiene capítulos para leer
      relations: details.relations || [],
      recommendations: details.recommendations || [],
      externalLinks: details.externalLinks || [],
      note: 'AniList solo provee información. Los capítulos deben buscarse en otras fuentes.'
    });

  } catch (error) {
    console.error('Error en /api/anilist/[id]:', error);
    res.status(500).json({
      error: 'Error al obtener manga',
      message: error.message
    });
  }
}
