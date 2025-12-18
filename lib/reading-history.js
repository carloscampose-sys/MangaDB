/**
 * Sistema de Historial de Lectura
 * Guarda y gestiona el progreso de lectura del usuario
 */

const HISTORY_KEY = 'mangalib_reading_history';
const MAX_HISTORY_ITEMS = 100;

/**
 * Estructura del historial:
 * {
 *   mangaId: {
 *     mangaId: string,
 *     title: string,
 *     coverUrl: string,
 *     source: string,
 *     lastChapterId: string,
 *     lastChapterNum: string,
 *     lastPage: number,
 *     totalPages: number,
 *     progress: number, // 0-100
 *     lastReadAt: timestamp,
 *     firstReadAt: timestamp,
 *     chaptersRead: number
 *   }
 * }
 */

/**
 * Obtiene todo el historial de lectura
 * @returns {Object} Historial completo
 */
export function getReadingHistory() {
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
 * @param {Object} history - Historial a guardar
 */
function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving reading history:', error);
    // Si hay error de cuota, limpiar historial antiguo
    if (error.name === 'QuotaExceededError') {
      cleanOldHistory();
    }
  }
}

/**
 * Actualiza el progreso de lectura de un manga
 * @param {Object} data - Datos del progreso
 */
export function updateReadingProgress(data) {
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

  const history = getReadingHistory();

  const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  if (history[mangaId]) {
    // Actualizar entrada existente
    history[mangaId] = {
      ...history[mangaId],
      lastChapterId: chapterId,
      lastChapterNum: chapterNum,
      lastPage: currentPage,
      totalPages: totalPages,
      progress: progress,
      lastReadAt: Date.now(),
      chaptersRead: history[mangaId].chaptersRead || 1
    };

    // Incrementar capítulos leídos si es un capítulo nuevo
    if (history[mangaId].lastChapterId !== chapterId && progress >= 90) {
      history[mangaId].chaptersRead++;
    }
  } else {
    // Crear nueva entrada
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

  saveHistory(history);
  return history[mangaId];
}

/**
 * Marca un capítulo como completado
 * @param {string} mangaId - ID del manga
 * @param {string} chapterId - ID del capítulo
 * @param {string} chapterNum - Número del capítulo
 */
export function markChapterComplete(mangaId, chapterId, chapterNum) {
  const history = getReadingHistory();

  if (history[mangaId]) {
    history[mangaId].lastChapterId = chapterId;
    history[mangaId].lastChapterNum = chapterNum;
    history[mangaId].progress = 100;
    history[mangaId].lastReadAt = Date.now();
    history[mangaId].chaptersRead = (history[mangaId].chaptersRead || 0) + 1;
    saveHistory(history);
  }
}

/**
 * Obtiene el progreso de un manga específico
 * @param {string} mangaId - ID del manga
 * @returns {Object|null} Progreso del manga
 */
export function getMangaProgress(mangaId) {
  const history = getReadingHistory();
  return history[mangaId] || null;
}

/**
 * Obtiene los mangas leídos recientemente
 * @param {number} limit - Número máximo de resultados
 * @returns {Array} Lista de mangas ordenados por última lectura
 */
export function getRecentlyRead(limit = 10) {
  const history = getReadingHistory();

  return Object.values(history)
    .sort((a, b) => b.lastReadAt - a.lastReadAt)
    .slice(0, limit);
}

/**
 * Obtiene mangas para "Continuar leyendo" (no completados)
 * @param {number} limit - Número máximo de resultados
 * @returns {Array} Lista de mangas en progreso
 */
export function getContinueReading(limit = 10) {
  const history = getReadingHistory();

  return Object.values(history)
    .filter(item => item.progress < 100)
    .sort((a, b) => b.lastReadAt - a.lastReadAt)
    .slice(0, limit);
}

/**
 * Elimina un manga del historial
 * @param {string} mangaId - ID del manga a eliminar
 */
export function removeFromHistory(mangaId) {
  const history = getReadingHistory();
  delete history[mangaId];
  saveHistory(history);
}

/**
 * Limpia todo el historial
 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Limpia entradas antiguas del historial
 * Mantiene solo las más recientes
 */
function cleanOldHistory() {
  const history = getReadingHistory();
  const entries = Object.entries(history);

  if (entries.length > MAX_HISTORY_ITEMS) {
    // Ordenar por fecha y mantener solo los más recientes
    entries.sort((a, b) => b[1].lastReadAt - a[1].lastReadAt);
    const newHistory = {};

    entries.slice(0, MAX_HISTORY_ITEMS).forEach(([key, value]) => {
      newHistory[key] = value;
    });

    saveHistory(newHistory);
  }
}

/**
 * Exporta el historial como JSON
 * @returns {string} JSON del historial
 */
export function exportHistory() {
  const history = getReadingHistory();
  return JSON.stringify(history, null, 2);
}

/**
 * Importa historial desde JSON
 * @param {string} jsonString - JSON del historial
 * @param {boolean} merge - Si true, combina con historial existente
 * @returns {boolean} True si se importó correctamente
 */
export function importHistory(jsonString, merge = true) {
  try {
    const importedHistory = JSON.parse(jsonString);

    if (merge) {
      const currentHistory = getReadingHistory();
      const mergedHistory = { ...currentHistory, ...importedHistory };
      saveHistory(mergedHistory);
    } else {
      saveHistory(importedHistory);
    }

    return true;
  } catch (error) {
    console.error('Error importing history:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas del historial
 * @returns {Object} Estadísticas
 */
export function getHistoryStats() {
  const history = getReadingHistory();
  const entries = Object.values(history);

  if (entries.length === 0) {
    return {
      totalMangas: 0,
      totalChapters: 0,
      completedMangas: 0,
      inProgress: 0,
      avgProgress: 0
    };
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

export default {
  getReadingHistory,
  updateReadingProgress,
  markChapterComplete,
  getMangaProgress,
  getRecentlyRead,
  getContinueReading,
  removeFromHistory,
  clearHistory,
  exportHistory,
  importHistory,
  getHistoryStats
};
