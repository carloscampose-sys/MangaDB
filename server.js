// Servidor de desarrollo simple para testing local
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchManga, getMangaDetails, getMangaChapters, getChapterPages } from './lib/mangadex-client.js';

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
