/**
 * Proxy para imágenes de Webtoons
 * Necesario porque Webtoons bloquea peticiones sin Referer
 */

import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL es requerida' });
        }

        // Solo permitir URLs de webtoons
        if (!url.includes('webtoon-phinf.pstatic.net') && !url.includes('webtoons.com')) {
            return res.status(403).json({ error: 'URL no permitida' });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.webtoons.com/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al obtener imagen' });
        }

        const contentType = response.headers.get('content-type');
        const buffer = await response.buffer();

        res.setHeader('Content-Type', contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 día
        res.send(buffer);
    } catch (error) {
        console.error('Proxy image error:', error);
        res.status(500).json({ error: 'Error interno' });
    }
}
