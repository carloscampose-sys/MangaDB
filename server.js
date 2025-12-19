// Servidor de desarrollo simple para testing local
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchManga, getMangaDetails, getMangaChapters, getChapterPages } from './_lib/mangadex-client.js';

// Importar clientes de otras fuentes
import { getTuMangaDetails, getTuMangaChapters, getTuMangaPages, formatTuMangaResult } from './_lib/tumanga-client.js';
import { getVisorMangaDetails, getVisorMangaChapters, getVisorMangaPages, formatVisorMangaResult } from './_lib/visormanga-client.js';
import { getMangaLectorDetails, getMangaLectorChapters, getMangaLectorPages, formatMangaLectorResult } from './_lib/mangalector-client.js';
import { getAniListDetails } from './_lib/anilist-client.js';
import { getJikanDetails } from './_lib/jikan-client.js';
import { getTitleDetail as getMangaPlusDetails, formatMangaPlusTitle } from './_lib/mangaplus-client.js';
import { getWebtoonDetails, getWebtoonChapters, getEpisodePages, formatWebtoonResult } from './_lib/webtoons-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Servir archivos estáticos desde la raíz
app.use(express.static('.'));

// API Routes
app.get('/api/search', async (req, res) => {
    try {
        const { q, type, limit = 20 } = req.query;

        if (!q || q.trim() === '') {
            return res.status(400).json({ error: 'El parámetro "q" es requerido' });
        }

        console.log(`Buscando: "${q}", tipo: ${type || 'todos'}, límite: ${limit}`);

        const results = await searchManga(q, parseInt(limit));

        let filteredResults = results;
        if (type && type !== 'all') {
            filteredResults = results.filter(manga => manga.type === type);
        }

        res.json({
            success: true,
            count: filteredResults.length,
            results: filteredResults
        });
    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({
            error: 'Error al buscar mangas',
            message: error.message
        });
    }
});

app.get('/api/manga/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'ID del manga es requerido' });
        }

        console.log(`Obteniendo detalles del manga: ${id}`);

        const mangaDetails = await getMangaDetails(id);

        res.json({
            success: true,
            manga: mangaDetails
        });
    } catch (error) {
        console.error('Error obteniendo detalles:', error);

        if (error.message.includes('404')) {
            return res.status(404).json({
                error: 'Manga no encontrado',
                message: 'El manga con ese ID no existe'
            });
        }

        res.status(500).json({
            error: 'Error al obtener detalles del manga',
            message: error.message
        });
    }
});

app.get('/api/chapters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { offset = 0, limit = 100 } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'ID del manga es requerido' });
        }

        console.log(`Obteniendo capítulos del manga: ${id}`);

        const chaptersData = await getMangaChapters(id, parseInt(offset), parseInt(limit));

        res.json({
            success: true,
            mangaId: id,
            ...chaptersData
        });
    } catch (error) {
        console.error('Error obteniendo capítulos:', error);
        res.status(500).json({
            error: 'Error al obtener capítulos',
            message: error.message
        });
    }
});

app.get('/api/pages/:chapterId', async (req, res) => {
    try {
        const { chapterId } = req.params;

        if (!chapterId) {
            return res.status(400).json({ error: 'ID del capítulo es requerido' });
        }

        console.log(`Obteniendo páginas del capítulo: ${chapterId}`);

        const pagesData = await getChapterPages(chapterId);

        res.json({
            success: true,
            chapterId,
            totalPages: pagesData.pages.length,
            pages: pagesData.pages
        });
    } catch (error) {
        console.error('Error obteniendo páginas:', error);

        if (error.message.includes('404')) {
            return res.status(404).json({
                error: 'Capítulo no encontrado',
                message: 'El capítulo con ese ID no existe o no está disponible'
            });
        }

        res.status(500).json({
            error: 'Error al obtener páginas del capítulo',
            message: error.message
        });
    }
});

// ============ API UNIFICADA DE FUENTES ============
// Ruta para obtener detalles de manga de cualquier fuente
app.get('/api/source/:source/:id', async (req, res) => {
    try {
        const { source, id } = req.params;
        console.log(`API Source: ${source}, id: ${id}`);

        switch (source) {
            case 'tumanga': {
                const slug = id.replace('tumanga-', '');
                const [details, chaptersData] = await Promise.all([
                    getTuMangaDetails(slug).catch(() => null),
                    getTuMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
                ]);
                if (!details) {
                    return res.status(404).json({ error: 'Manga not found' });
                }
                return res.json({
                    success: true,
                    manga: formatTuMangaResult(details),
                    chapters: chaptersData.chapters,
                    totalChapters: chaptersData.total
                });
            }

            case 'visormanga': {
                const slug = id.replace('visormanga-', '');
                const [details, chaptersData] = await Promise.all([
                    getVisorMangaDetails(slug).catch(() => null),
                    getVisorMangaChapters(slug).catch(() => ({ chapters: [], total: 0 }))
                ]);
                if (!details) {
                    return res.status(404).json({ error: 'Manga not found' });
                }
                return res.json({
                    success: true,
                    manga: formatVisorMangaResult(details),
                    chapters: chaptersData.chapters,
                    totalChapters: chaptersData.total
                });
            }

            case 'mangalector': {
                const slug = id.replace('mangalector-', '');
                const [details, chaptersData] = await Promise.all([
                    getMangaLectorDetails(slug).catch(() => null),
                    getMangaLectorChapters(slug).catch(() => ({ chapters: [], total: 0 }))
                ]);
                if (!details) {
                    return res.status(404).json({ error: 'Manga not found' });
                }
                return res.json({
                    success: true,
                    manga: formatMangaLectorResult(details),
                    chapters: chaptersData.chapters,
                    totalChapters: chaptersData.total
                });
            }

            case 'anilist': {
                const anilistId = id.replace('anilist-', '');
                const details = await getAniListDetails(anilistId);
                if (!details) {
                    return res.status(404).json({ error: 'Manga not found' });
                }
                return res.json({
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
                        source: 'anilist',
                        sourceUrl: details.sourceUrl
                    },
                    chapters: [],
                    relations: details.relations || [],
                    recommendations: details.recommendations || [],
                    externalLinks: details.externalLinks || [],
                    note: 'AniList solo provee información. Los capítulos deben buscarse en otras fuentes.'
                });
            }

            case 'jikan': {
                const malId = id.replace('jikan-', '');
                const details = await getJikanDetails(malId);
                if (!details) {
                    return res.status(404).json({ error: 'Manga not found' });
                }
                return res.json({
                    success: true,
                    manga: {
                        id: details.id,
                        malId: details.malId,
                        title: details.title,
                        titleEnglish: details.titleEnglish,
                        description: details.description,
                        coverUrl: details.coverUrl,
                        author: details.author,
                        status: details.status,
                        year: details.year,
                        type: details.type,
                        genres: details.genres,
                        score: details.score,
                        source: 'jikan',
                        sourceUrl: details.sourceUrl
                    },
                    chapters: [],
                    relations: details.relations || [],
                    externalLinks: details.externalLinks || [],
                    note: 'MyAnimeList solo provee información. Los capítulos deben buscarse en otras fuentes.'
                });
            }

            case 'mangaplus': {
                const numericId = id.replace('mangaplus_', '');
                const details = await getMangaPlusDetails(numericId);
                if (!details) {
                    return res.status(404).json({ error: 'Manga not found' });
                }
                return res.json({
                    success: true,
                    manga: {
                        id: `mangaplus_${numericId}`,
                        title: details.title,
                        author: details.author || 'Shueisha',
                        description: details.description || '',
                        coverUrl: details.coverUrl,
                        status: 'ongoing',
                        type: 'manga',
                        source: 'mangaplus'
                    },
                    chapters: details.chapters || []
                });
            }

            case 'webtoons': {
                const webtoonId = id.replace('webtoons-', '');
                const [details, chaptersData] = await Promise.all([
                    getWebtoonDetails(webtoonId).catch(() => null),
                    getWebtoonChapters(webtoonId).catch(() => ({ chapters: [], total: 0 }))
                ]);
                if (!details) {
                    return res.status(404).json({ error: 'Webtoon not found' });
                }
                return res.json({
                    success: true,
                    manga: formatWebtoonResult(details),
                    chapters: chaptersData.chapters || []
                });
            }

            default:
                return res.status(404).json({ error: `Source "${source}" not found` });
        }
    } catch (error) {
        console.error('API Source Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Ruta para obtener páginas de capítulo de cualquier fuente
app.get('/api/source/:source/chapter/:chapterId', async (req, res) => {
    try {
        const { source, chapterId } = req.params;
        const { chapter, slug } = req.query;
        console.log(`API Source Chapter: ${source}, chapterId: ${chapterId}, chapter: ${chapter}, slug: ${slug}`);

        switch (source) {
            case 'tumanga': {
                const mangaSlug = slug || chapterId.replace('tumanga-', '').replace(/-ch[\d.]+$/, '');
                const pages = await getTuMangaPages(mangaSlug, chapter);
                return res.json({ success: true, ...pages, source: 'tumanga' });
            }

            case 'visormanga': {
                const mangaSlug = slug || chapterId.replace('visormanga-', '').replace(/-ch[\d.]+$/, '');
                const pages = await getVisorMangaPages(mangaSlug, chapter);
                return res.json({ success: true, ...pages, source: 'visormanga' });
            }

            case 'mangalector': {
                const mangaSlug = slug || chapterId.replace('mangalector-', '').replace(/-ch[\d.]+$/, '');
                const pages = await getMangaLectorPages(mangaSlug, chapter);
                return res.json({ success: true, ...pages, source: 'mangalector' });
            }

            case 'mangaplus': {
                // MangaPlus no permite acceso directo a las páginas (encriptadas)
                // Los capítulos se abren en el sitio oficial
                return res.json({
                    success: true,
                    pages: [],
                    source: 'mangaplus',
                    note: 'Las páginas de MangaPlus están encriptadas. Usa el visor oficial.',
                    viewerUrl: `https://mangaplus.shueisha.co.jp/viewer/${chapterId.replace('mangaplus_', '')}`
                });
            }

            case 'webtoons': {
                const webtoonId = chapterId.replace('webtoons-', '').replace(/-ep\d+$/, '');
                const { episode } = req.query;
                const pages = await getEpisodePages(webtoonId, episode);
                return res.json({ success: true, ...pages, source: 'webtoons' });
            }

            default:
                return res.status(404).json({ error: `Source "${source}" not found` });
        }
    } catch (error) {
        console.error('API Source Chapter Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Servir index.html para todas las rutas no-API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 Servidor de desarrollo iniciado!

📚 MangaLib está corriendo en:
   http://localhost:${PORT}

🔍 Endpoints API disponibles:
   GET /api/search?q=naruto
   GET /api/manga/:id
   GET /api/chapters/:id
   GET /api/pages/:chapterId

Press Ctrl+C to stop
  `);
});
