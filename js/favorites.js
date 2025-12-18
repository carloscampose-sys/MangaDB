/**
 * Sistema de Favoritos - Frontend
 * Maneja la UI de favoritos en el navegador
 */

const STORAGE_KEY = 'mangalib_favorites';
const COLLECTIONS_KEY = 'mangalib_collections';

const Favorites = {
    // Obtener todos los favoritos
    getAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    // Guardar favoritos
    save(favorites) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    },

    // Agregar a favoritos
    add(manga) {
        const favorites = this.getAll();

        if (this.isFavorite(manga.id, manga.source)) {
            return false;
        }

        favorites.unshift({
            id: manga.id,
            source: manga.source || 'mangadex',
            title: manga.title,
            coverUrl: manga.coverUrl,
            type: manga.type,
            status: manga.status,
            addedAt: Date.now(),
            collections: []
        });

        this.save(favorites);
        this.notifyUpdate('add', manga);
        return true;
    },

    // Eliminar de favoritos
    remove(mangaId, source = 'mangadex') {
        const favorites = this.getAll();
        const index = favorites.findIndex(f => f.id === mangaId && f.source === source);

        if (index === -1) return false;

        const removed = favorites.splice(index, 1)[0];
        this.save(favorites);
        this.notifyUpdate('remove', removed);
        return true;
    },

    // Verificar si es favorito
    isFavorite(mangaId, source = 'mangadex') {
        return this.getAll().some(f => f.id === mangaId && f.source === source);
    },

    // Toggle favorito
    toggle(manga) {
        if (this.isFavorite(manga.id, manga.source)) {
            this.remove(manga.id, manga.source);
            return false;
        } else {
            this.add(manga);
            return true;
        }
    },

    // Obtener con filtros
    getFiltered(options = {}) {
        let favorites = this.getAll();

        if (options.source && options.source !== 'all') {
            favorites = favorites.filter(f => f.source === options.source);
        }

        if (options.type && options.type !== 'all') {
            favorites = favorites.filter(f => f.type === options.type);
        }

        if (options.collection && options.collection !== 'all') {
            favorites = favorites.filter(f => f.collections?.includes(options.collection));
        }

        // Ordenar
        switch (options.sortBy) {
            case 'title':
                favorites.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'recent':
                favorites.sort((a, b) => b.addedAt - a.addedAt);
                break;
        }

        return favorites;
    },

    // Estadísticas
    getStats() {
        const favorites = this.getAll();
        const bySource = {};
        const byType = {};

        favorites.forEach(f => {
            bySource[f.source] = (bySource[f.source] || 0) + 1;
            byType[f.type] = (byType[f.type] || 0) + 1;
        });

        return { total: favorites.length, bySource, byType };
    },

    // Colecciones
    getCollections() {
        try {
            const data = localStorage.getItem(COLLECTIONS_KEY);
            return data ? JSON.parse(data) : [
                { id: 'reading', name: 'Leyendo', icon: '📖' },
                { id: 'plan-to-read', name: 'Por leer', icon: '📋' },
                { id: 'completed', name: 'Completados', icon: '✅' },
                { id: 'on-hold', name: 'En pausa', icon: '⏸️' },
                { id: 'dropped', name: 'Abandonados', icon: '❌' }
            ];
        } catch (e) {
            return [];
        }
    },

    // Agregar a colección
    addToCollection(mangaId, source, collectionId) {
        const favorites = this.getAll();
        const fav = favorites.find(f => f.id === mangaId && f.source === source);

        if (!fav) return false;

        if (!fav.collections) fav.collections = [];
        if (!fav.collections.includes(collectionId)) {
            fav.collections.push(collectionId);
            this.save(favorites);
        }
        return true;
    },

    // Exportar
    export() {
        return JSON.stringify({
            favorites: this.getAll(),
            collections: this.getCollections(),
            exportedAt: new Date().toISOString()
        }, null, 2);
    },

    // Importar
    import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.favorites) this.save(data.favorites);
            if (data.collections) {
                localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(data.collections));
            }
            this.notifyUpdate('import');
            return true;
        } catch (e) {
            return false;
        }
    },

    // Notificar cambios
    notifyUpdate(action, manga = null) {
        window.dispatchEvent(new CustomEvent('favorites-updated', {
            detail: { action, manga }
        }));
    },

    // Limpiar
    clear() {
        localStorage.removeItem(STORAGE_KEY);
        this.notifyUpdate('clear');
    }
};

// Hacer global
window.Favorites = Favorites;
