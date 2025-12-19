/**
 * Endpoint para obtener páginas de un capítulo de MangaLector
 * URL: /api/mangalector/chapter/[chapterId]
 */

import { getMangaLectorPages } from '../../../lib/mangalector-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { chapterId } = req.query;
    const { slug, chapter } = req.query;

    if (!chapterId && (!slug || !chapter)) {
      return res.status(400).json({ error: 'Se requiere chapterId o slug+chapter' });
    }

    let mangaSlug = slug;
    let chapterNum = chapter;

    // Si viene chapterId en formato "mangalector-slug-ch1"
    if (chapterId) {
      const match = chapterId.match(/mangalector-(.+)-ch(.+)/);
      if (match) {
        mangaSlug = match[1];
        chapterNum = match[2];
      }
    }

    console.log(`Obteniendo páginas de MangaLector: ${mangaSlug} cap ${chapterNum}`);

    const pagesData = await getMangaLectorPages(mangaSlug, chapterNum);

    res.status(200).json({
      success: true,
      pages: pagesData.pages,
      total: pagesData.total,
      source: 'mangalector'
    });

  } catch (error) {
    console.error('Error en /api/mangalector/chapter/[chapterId]:', error);
    res.status(500).json({
      error: 'Error al obtener páginas',
      message: error.message
    });
  }
}
