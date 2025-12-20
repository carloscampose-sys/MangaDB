/**
 * API unificada para obtener páginas de capítulos de cualquier fuente
 * URL: /api/reader?id=xxx&source=mangadex|tumanga|etc&chapter=1&slug=manga-slug
 */

import { getChapterPages } from '../_lib/mangadex-client.js';
import { getTuMangaPages } from '../_lib/tumanga-client.js';
import { getVisorMangaPages } from '../_lib/visormanga-client.js';
import { getMangaLectorPages } from '../_lib/mangalector-client.js';
import { getEpisodePages } from '../_lib/webtoons-client.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id, source, chapter, slug, episode } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID es requerido' });
        }

        // Detectar fuente automáticamente si no se especifica
        const detectedSource = source || detectSource(id);
        console.log(`Reader API: id=${id}, source=${detectedSource}, chapter=${chapter}, slug=${slug}`);

        switch (detectedSource) {
            case 'mangadex':
                return await handleMangaDex(res, id);

            case 'tumanga': {
                const mangaSlug = slug || id.replace('tumanga-', '').replace(/-ch[\d.]+$/, '');
                const pages = await getTuMangaPages(mangaSlug, chapter);
                return res.json({ success: true, pages: pages.pages || [], total: pages.total || 0, source: 'tumanga' });
            }

            case 'visormanga': {
                const mangaSlug = slug || id.replace('visormanga-', '').replace(/-ch[\d.]+$/, '');
                const pages = await getVisorMangaPages(mangaSlug, chapter);
                return res.json({ success: true, pages: pages.pages || [], total: pages.total || 0, source: 'visormanga' });
            }

            case 'mangalector': {
                const mangaSlug = slug || id.replace('mangalector-', '').replace(/-ch[\d.]+$/, '');
                const pages = await getMangaLectorPages(mangaSlug, chapter);
                return res.json({ success: true, pages: pages.pages || [], total: pages.total || 0, source: 'mangalector' });
            }

            case 'webtoons': {
                const webtoonId = id.replace('webtoons-', '').replace(/-ep\d+$/, '');
                const pages = await getEpisodePages(webtoonId, episode || chapter);
                return res.json({ success: true, pages: pages.pages || [], total: pages.total || 0, source: 'webtoons' });
            }

            case 'mangaplus':
                // MangaPlus tiene páginas encriptadas, redirigir al visor oficial
                return res.json({
                    success: true,
                    pages: [],
                    source: 'mangaplus',
                    redirect: true,
                    viewerUrl: `https://mangaplus.shueisha.co.jp/viewer/${id.replace('mangaplus_', '')}`,
                    note: 'Las páginas de MangaPlus están encriptadas. Usa el visor oficial.'
                });

            default:
                // Intentar como MangaDex por defecto
                return await handleMangaDex(res, id);
        }
    } catch (error) {
        console.error('Reader API Error:', error);
        res.status(500).json({ error: 'Error al cargar páginas', message: error.message });
    }
}

function detectSource(id) {
    if (id.startsWith('tumanga-')) return 'tumanga';
    if (id.startsWith('visormanga-')) return 'visormanga';
    if (id.startsWith('mangalector-')) return 'mangalector';
    if (id.startsWith('mangaplus_')) return 'mangaplus';
    if (id.startsWith('webtoons-')) return 'webtoons';
    return 'mangadex';
}

async function handleMangaDex(res, chapterId) {
    const pagesData = await getChapterPages(chapterId);

    // Si es un capítulo externo (MangaPlus, etc.)
    if (pagesData.isExternal || (pagesData.pages && pagesData.pages.length === 0)) {
        return res.json({
            success: true,
            chapterId,
            pages: [],
            total: 0,
            source: 'mangadex',
            isExternal: true,
            message: 'Este capítulo está alojado en un sitio externo. Por favor, lee el capítulo desde la lista de capítulos.'
        });
    }

    return res.json({
        success: true,
        chapterId,
        pages: pagesData.pages || [],
        total: pagesData.pages?.length || 0,
        source: 'mangadex'
    });
}
