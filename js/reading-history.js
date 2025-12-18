/**
 * Sistema de Historial de Lectura (Frontend)
 * Guarda y gestiona el progreso de lectura del usuario
 */

const ReadingHistory = (function() {
  const HISTORY_KEY = 'mangalib_reading_history';
  const MAX_HISTORY_ITEMS = 100;

  /**
   * Obtiene todo el historial de lectura
   */
  function getAll() {
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : {};
    } catch (error) {
      console.error('Error loading reading history:', error);
      return {};
    }
  }

  /**
   * Guarda el historial
   */
  function save(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving reading history:', error);
      if (error.name === 'QuotaExceededError') {
        cleanOld();
      }
    }
  }

  /**
   * Actualiza el progreso de lectura
   */
  function updateProgress(data) {
    const {
      mangaId,
      title,
      coverUrl,
      source,
      chapterId,
      chapterNum,
      currentPage,
      totalPages
    } = data;

    const history = getAll();
    const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

    if (history[mangaId]) {
      const isNewChapter = history[mangaId].lastChapterId !== chapterId;

      history[mangaId] = {
        ...history[mangaId],
        title: title || history[mangaId].title,
        coverUrl: coverUrl || history[mangaId].coverUrl,
        lastChapterId: chapterId,
        lastChapterNum: chapterNum,
        lastPage: currentPage,
        totalPages: totalPages,
        progress: progress,
        lastReadAt: Date.now()
      };

      if (isNewChapter && progress >= 90) {
        history[mangaId].chaptersRead = (history[mangaId].chaptersRead || 1) + 1;
      }
    } else {
      history[mangaId] = {
        mangaId,
        title,
        coverUrl,
        source,
        lastChapterId: chapterId,
        lastChapterNum: chapterNum,
        lastPage: currentPage,
        totalPages: totalPages,
        progress: progress,
        lastReadAt: Date.now(),
        firstReadAt: Date.now(),
        chaptersRead: 1
      };
    }

    save(history);
    return history[mangaId];
  }

  /**
   * Marca un capítulo como completado
   */
  function markComplete(mangaId, chapterId, chapterNum) {
    const history = getAll();

    if (history[mangaId]) {
      history[mangaId].lastChapterId = chapterId;
      history[mangaId].lastChapterNum = chapterNum;
      history[mangaId].progress = 100;
      history[mangaId].lastReadAt = Date.now();
      history[mangaId].chaptersRead = (history[mangaId].chaptersRead || 0) + 1;
      save(history);
    }
  }

  /**
   * Obtiene el progreso de un manga
   */
  function getProgress(mangaId) {
    const history = getAll();
    return history[mangaId] || null;
  }

  /**
   * Obtiene mangas leídos recientemente
   */
  function getRecent(limit = 10) {
    const history = getAll();

    return Object.values(history)
      .sort((a, b) => b.lastReadAt - a.lastReadAt)
      .slice(0, limit);
  }

  /**
   * Obtiene mangas para "Continuar leyendo"
   */
  function getContinue(limit = 10) {
    const history = getAll();

    return Object.values(history)
      .filter(item => item.progress < 100)
      .sort((a, b) => b.lastReadAt - a.lastReadAt)
      .slice(0, limit);
  }

  /**
   * Elimina un manga del historial
   */
  function remove(mangaId) {
    const history = getAll();
    delete history[mangaId];
    save(history);
  }

  /**
   * Limpia todo el historial
   */
  function clear() {
    localStorage.removeItem(HISTORY_KEY);
  }

  /**
   * Limpia entradas antiguas
   */
  function cleanOld() {
    const history = getAll();
    const entries = Object.entries(history);

    if (entries.length > MAX_HISTORY_ITEMS) {
      entries.sort((a, b) => b[1].lastReadAt - a[1].lastReadAt);
      const newHistory = {};

      entries.slice(0, MAX_HISTORY_ITEMS).forEach(([key, value]) => {
        newHistory[key] = value;
      });

      save(newHistory);
    }
  }

  /**
   * Obtiene estadísticas
   */
  function getStats() {
    const history = getAll();
    const entries = Object.values(history);

    if (entries.length === 0) {
      return { totalMangas: 0, totalChapters: 0, completedMangas: 0, inProgress: 0, avgProgress: 0 };
    }

    const totalChapters = entries.reduce((sum, item) => sum + (item.chaptersRead || 0), 0);
    const completedMangas = entries.filter(item => item.progress === 100).length;
    const avgProgress = Math.round(entries.reduce((sum, item) => sum + item.progress, 0) / entries.length);

    return {
      totalMangas: entries.length,
      totalChapters,
      completedMangas,
      inProgress: entries.length - completedMangas,
      avgProgress
    };
  }

  /**
   * Formatea tiempo relativo
   */
  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;

    return new Date(timestamp).toLocaleDateString('es-ES');
  }

  // API pública
  return {
    getAll,
    updateProgress,
    markComplete,
    getProgress,
    getRecent,
    getContinue,
    remove,
    clear,
    getStats,
    formatTimeAgo
  };
})();

// Hacer disponible globalmente
window.ReadingHistory = ReadingHistory;
