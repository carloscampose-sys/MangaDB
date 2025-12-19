/**
 * Sistema de Notificaciones - Frontend
 * Verifica y muestra notificaciones de nuevos capítulos
 */

const NOTIFICATIONS_KEY = 'mangalib_notifications';
const LAST_CHECK_KEY = 'mangalib_last_check';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

const Notifications = {
    // Obtener todas las notificaciones
    getAll() {
        try {
            const data = localStorage.getItem(NOTIFICATIONS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    // Guardar notificaciones
    save(notifications) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    },

    // Agregar notificación
    add(notification) {
        const notifications = this.getAll();

        // Verificar duplicado
        const exists = notifications.some(n =>
            n.mangaId === notification.mangaId &&
            n.chapterNum === notification.chapterNum
        );

        if (exists) return false;

        notifications.unshift({
            id: `${notification.mangaId}-ch${notification.chapterNum}-${Date.now()}`,
            mangaId: notification.mangaId,
            mangaTitle: notification.mangaTitle,
            source: notification.source,
            coverUrl: notification.coverUrl,
            chapterNum: notification.chapterNum,
            chapterTitle: notification.chapterTitle || `Capítulo ${notification.chapterNum}`,
            createdAt: Date.now(),
            read: false
        });

        this.save(notifications.slice(0, 50));
        this.updateBadge();

        return true;
    },

    // Marcar como leída
    markAsRead(id) {
        const notifications = this.getAll();
        const notification = notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.save(notifications);
            this.updateBadge();
        }
    },

    // Marcar todas como leídas
    markAllAsRead() {
        const notifications = this.getAll();
        notifications.forEach(n => n.read = true);
        this.save(notifications);
        this.updateBadge();
    },

    // Eliminar notificación
    remove(id) {
        const notifications = this.getAll().filter(n => n.id !== id);
        this.save(notifications);
        this.updateBadge();
    },

    // Limpiar todas
    clear() {
        localStorage.removeItem(NOTIFICATIONS_KEY);
        this.updateBadge();
    },

    // Conteo de no leídas
    getUnreadCount() {
        return this.getAll().filter(n => !n.read).length;
    },

    // Actualizar badge de notificaciones
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        const count = this.getUnreadCount();

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // Verificar si debe chequear actualizaciones
    shouldCheck() {
        const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY)) || 0;
        return Date.now() - lastCheck > CHECK_INTERVAL;
    },

    // Actualizar timestamp
    updateLastCheck() {
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    },

    // Chequear actualizaciones para favoritos
    async checkUpdates() {
        if (!this.shouldCheck()) return;

        const favorites = window.Favorites?.getAll() || [];
        if (favorites.length === 0) return;

        console.log('Checking for chapter updates...');

        // Solo verificar los primeros 10 para no sobrecargar
        const toCheck = favorites.slice(0, 10);

        for (const fav of toCheck) {
            try {
                // Construir URL de API según fuente
                let apiUrl;
                if (fav.source === 'tumanga') {
                    apiUrl = `/api/tumanga/${fav.id.replace('tumanga-', '')}`;
                } else if (fav.source === 'visormanga') {
                    apiUrl = `/api/visormanga/${fav.id.replace('visormanga-', '')}`;
                } else if (fav.source === 'mangalector') {
                    apiUrl = `/api/mangalector/${fav.id.replace('mangalector-', '')}`;
                } else if (fav.source === 'mangadex') {
                    apiUrl = `/api/manga/${fav.id}`;
                } else {
                    // AniList, Jikan no tienen capítulos
                    continue;
                }

                const response = await fetch(apiUrl);
                if (!response.ok) continue;

                const data = await response.json();
                if (!data.success || !data.chapters || data.chapters.length === 0) continue;

                // Obtener el último capítulo
                const latestChapter = data.chapters[0];
                const latestNum = parseFloat(latestChapter.chapter || 0);

                // Comparar con el último capítulo leído
                const lastRead = parseFloat(fav.lastChapterRead || 0);

                if (latestNum > lastRead && lastRead > 0) {
                    // Hay nuevo capítulo
                    this.add({
                        mangaId: fav.id,
                        mangaTitle: fav.title,
                        source: fav.source,
                        coverUrl: fav.coverUrl,
                        chapterNum: latestChapter.chapter,
                        chapterTitle: latestChapter.title
                    });
                }

                // Pequeña pausa entre peticiones
                await new Promise(r => setTimeout(r, 500));

            } catch (err) {
                console.error(`Error checking ${fav.title}:`, err);
            }
        }

        this.updateLastCheck();
        this.updateBadge();
    },

    // Formatear tiempo
    formatTime(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Ahora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

        return new Date(timestamp).toLocaleDateString('es-ES');
    },

    // Renderizar panel de notificaciones
    renderPanel() {
        const notifications = this.getAll();

        if (notifications.length === 0) {
            return `
                <div style="padding: var(--space-8); text-align: center; color: var(--text-secondary);">
                    <p>No hay notificaciones</p>
                </div>
            `;
        }

        return notifications.slice(0, 10).map(n => `
            <div class="notification-item ${n.read ? 'read' : ''}" data-id="${n.id}" onclick="Notifications.goToManga('${n.mangaId}', '${n.source}', '${n.id}')">
                <img src="${n.coverUrl}" alt="${n.mangaTitle}" style="width: 40px; height: 60px; object-fit: cover; border-radius: var(--radius-sm);">
                <div style="flex: 1; min-width: 0;">
                    <p style="font-weight: 600; font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.mangaTitle}</p>
                    <p style="font-size: var(--text-xs); color: var(--text-secondary);">Nuevo: ${n.chapterTitle}</p>
                    <p style="font-size: 10px; color: var(--text-tertiary);">${this.formatTime(n.createdAt)}</p>
                </div>
                <button onclick="event.stopPropagation(); Notifications.remove('${n.id}')" style="background: none; border: none; cursor: pointer; opacity: 0.5;">✕</button>
            </div>
        `).join('');
    },

    // Ir al manga
    goToManga(mangaId, source, notificationId) {
        this.markAsRead(notificationId);
        window.location.href = `/manga-detail.html?id=${mangaId}&source=${source}`;
    }
};

// Hacer global
window.Notifications = Notifications;

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    Notifications.updateBadge();

    // Chequear actualizaciones en background
    setTimeout(() => {
        Notifications.checkUpdates();
    }, 5000);
});
