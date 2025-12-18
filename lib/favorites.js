/**
 * Sistema de Favoritos/Biblioteca Personal
 * Gestiona la colección de mangas favoritos del usuario
 */

const STORAGE_KEY = 'mangalib_favorites';
const COLLECTIONS_KEY = 'mangalib_collections';

/**
 * Obtiene todos los favoritos
 */
export function getFavorites() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading favorites:', e);
        return [];
    }
}

/**
 * Guarda los favoritos
 */
function saveFavorites(favorites) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        return true;
    } catch (e) {
        console.error('Error saving favorites:', e);
        return false;
    }
}

/**
 * Agrega un manga a favoritos
 */
export function addFavorite(manga) {
    const favorites = getFavorites();

    // Verificar si ya existe
    const exists = favorites.some(f => f.id === manga.id && f.source === manga.source);
    if (exists) return false;

    const favorite = {
        id: manga.id,
        source: manga.source || 'mangadex',
        title: manga.title,
        coverUrl: manga.coverUrl,
        type: manga.type,
        status: manga.status,
        addedAt: Date.now(),
        lastChapterRead: null,
        totalChapters: manga.totalChapters || null,
        collections: [] // Para organizar en colecciones
    };

    favorites.unshift(favorite); // Agregar al inicio
    saveFavorites(favorites);

    // Disparar evento para actualizar UI
    window.dispatchEvent(new CustomEvent('favorites-updated', { detail: { action: 'add', manga: favorite } }));

    return true;
}

/**
 * Elimina un manga de favoritos
 */
export function removeFavorite(mangaId, source = 'mangadex') {
    const favorites = getFavorites();
    const index = favorites.findIndex(f => f.id === mangaId && f.source === source);

    if (index === -1) return false;

    const removed = favorites.splice(index, 1)[0];
    saveFavorites(favorites);

    window.dispatchEvent(new CustomEvent('favorites-updated', { detail: { action: 'remove', manga: removed } }));

    return true;
}

/**
 * Verifica si un manga está en favoritos
 */
export function isFavorite(mangaId, source = 'mangadex') {
    const favorites = getFavorites();
    return favorites.some(f => f.id === mangaId && f.source === source);
}

/**
 * Actualiza información de un favorito
 */
export function updateFavorite(mangaId, source, updates) {
    const favorites = getFavorites();
    const index = favorites.findIndex(f => f.id === mangaId && f.source === source);

    if (index === -1) return false;

    favorites[index] = { ...favorites[index], ...updates, updatedAt: Date.now() };
    saveFavorites(favorites);

    return true;
}

/**
 * Marca el último capítulo leído
 */
export function markChapterRead(mangaId, source, chapterNum) {
    return updateFavorite(mangaId, source, { lastChapterRead: chapterNum });
}

/**
 * Obtiene favoritos con filtros
 */
export function getFilteredFavorites(options = {}) {
    let favorites = getFavorites();

    // Filtrar por fuente
    if (options.source && options.source !== 'all') {
        favorites = favorites.filter(f => f.source === options.source);
    }

    // Filtrar por tipo
    if (options.type && options.type !== 'all') {
        favorites = favorites.filter(f => f.type === options.type);
    }

    // Filtrar por colección
    if (options.collection) {
        favorites = favorites.filter(f => f.collections?.includes(options.collection));
    }

    // Ordenar
    if (options.sortBy) {
        favorites.sort((a, b) => {
            switch (options.sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'addedAt':
                    return b.addedAt - a.addedAt;
                case 'recent':
                    return (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt);
                default:
                    return 0;
            }
        });
    }

    return favorites;
}

/**
 * Obtiene estadísticas de favoritos
 */
export function getFavoritesStats() {
    const favorites = getFavorites();

    const bySource = {};
    const byType = {};

    favorites.forEach(f => {
        bySource[f.source] = (bySource[f.source] || 0) + 1;
        byType[f.type] = (byType[f.type] || 0) + 1;
    });

    return {
        total: favorites.length,
        bySource,
        byType
    };
}

// ============ COLECCIONES ============

/**
 * Obtiene todas las colecciones
 */
export function getCollections() {
    try {
        const data = localStorage.getItem(COLLECTIONS_KEY);
        return data ? JSON.parse(data) : [
            { id: 'reading', name: 'Leyendo', icon: '📖', color: '#10b981' },
            { id: 'plan-to-read', name: 'Por leer', icon: '📋', color: '#6366f1' },
            { id: 'completed', name: 'Completados', icon: '✅', color: '#22c55e' },
            { id: 'on-hold', name: 'En pausa', icon: '⏸️', color: '#f59e0b' },
            { id: 'dropped', name: 'Abandonados', icon: '❌', color: '#ef4444' }
        ];
    } catch (e) {
        return [];
    }
}

/**
 * Crea una nueva colección
 */
export function createCollection(name, icon = '📁', color = '#6366f1') {
    const collections = getCollections();
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    collections.push({ id, name, icon, color, createdAt: Date.now() });
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));

    return id;
}

/**
 * Agrega un manga a una colección
 */
export function addToCollection(mangaId, source, collectionId) {
    const favorites = getFavorites();
    const index = favorites.findIndex(f => f.id === mangaId && f.source === source);

    if (index === -1) return false;

    if (!favorites[index].collections) {
        favorites[index].collections = [];
    }

    if (!favorites[index].collections.includes(collectionId)) {
        favorites[index].collections.push(collectionId);
        saveFavorites(favorites);
    }

    return true;
}

/**
 * Elimina un manga de una colección
 */
export function removeFromCollection(mangaId, source, collectionId) {
    const favorites = getFavorites();
    const index = favorites.findIndex(f => f.id === mangaId && f.source === source);

    if (index === -1) return false;

    favorites[index].collections = favorites[index].collections?.filter(c => c !== collectionId) || [];
    saveFavorites(favorites);

    return true;
}

/**
 * Exporta favoritos a JSON
 */
export function exportFavorites() {
    return JSON.stringify({
        favorites: getFavorites(),
        collections: getCollections(),
        exportedAt: new Date().toISOString()
    }, null, 2);
}

/**
 * Importa favoritos desde JSON
 */
export function importFavorites(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        if (data.favorites) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.favorites));
        }
        if (data.collections) {
            localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(data.collections));
        }

        window.dispatchEvent(new CustomEvent('favorites-updated', { detail: { action: 'import' } }));
        return true;
    } catch (e) {
        console.error('Error importing favorites:', e);
        return false;
    }
}

/**
 * Limpia todos los favoritos
 */
export function clearFavorites() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('favorites-updated', { detail: { action: 'clear' } }));
}
