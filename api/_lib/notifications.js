/**
 * Sistema de Notificaciones de Nuevos Capítulos
 * Verifica actualizaciones en mangas favoritos
 */

const NOTIFICATIONS_KEY = 'mangalib_notifications';
const LAST_CHECK_KEY = 'mangalib_last_check';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

/**
 * Obtiene todas las notificaciones
 */
export function getNotifications() {
    try {
        const data = localStorage.getItem(NOTIFICATIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Guarda notificaciones
 */
function saveNotifications(notifications) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

/**
 * Agrega una notificación
 */
export function addNotification(notification) {
    const notifications = getNotifications();

    // Verificar si ya existe
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
        chapterTitle: notification.chapterTitle,
        createdAt: Date.now(),
        read: false
    });

    // Mantener solo las últimas 50 notificaciones
    const trimmed = notifications.slice(0, 50);
    saveNotifications(trimmed);

    // Disparar evento
    window.dispatchEvent(new CustomEvent('notification-added', {
        detail: notification
    }));

    return true;
}

/**
 * Marca una notificación como leída
 */
export function markAsRead(notificationId) {
    const notifications = getNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (notification) {
        notification.read = true;
        saveNotifications(notifications);
    }
}

/**
 * Marca todas como leídas
 */
export function markAllAsRead() {
    const notifications = getNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);

    window.dispatchEvent(new CustomEvent('notifications-updated'));
}

/**
 * Obtiene el conteo de no leídas
 */
export function getUnreadCount() {
    return getNotifications().filter(n => !n.read).length;
}

/**
 * Elimina una notificación
 */
export function removeNotification(notificationId) {
    const notifications = getNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    saveNotifications(filtered);
}

/**
 * Limpia todas las notificaciones
 */
export function clearNotifications() {
    localStorage.removeItem(NOTIFICATIONS_KEY);
    window.dispatchEvent(new CustomEvent('notifications-updated'));
}

/**
 * Obtiene timestamp del último chequeo
 */
export function getLastCheckTime() {
    return parseInt(localStorage.getItem(LAST_CHECK_KEY)) || 0;
}

/**
 * Actualiza timestamp del último chequeo
 */
export function updateLastCheckTime() {
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
}

/**
 * Verifica si es hora de chequear actualizaciones
 */
export function shouldCheckForUpdates() {
    const lastCheck = getLastCheckTime();
    return Date.now() - lastCheck > CHECK_INTERVAL;
}

/**
 * Formatea tiempo relativo
 */
export function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;

    return new Date(timestamp).toLocaleDateString('es-ES');
}
