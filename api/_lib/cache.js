/**
 * Sistema de caché para búsquedas y datos
 * Usa localStorage en el cliente con expiración configurable
 */

const CACHE_PREFIX = 'mangalib_cache_';
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutos por defecto

/**
 * Configuración de TTL por tipo de caché
 */
const CACHE_TTL = {
  search: 15 * 60 * 1000,      // 15 minutos para búsquedas
  manga_details: 60 * 60 * 1000, // 1 hora para detalles de manga
  chapters: 30 * 60 * 1000,     // 30 minutos para lista de capítulos
  pages: 24 * 60 * 60 * 1000,   // 24 horas para páginas de capítulos
  trending: 10 * 60 * 1000,     // 10 minutos para trending
  history: Infinity             // Sin expiración para historial
};

/**
 * Genera una clave de caché
 * @param {string} type - Tipo de caché
 * @param {string} key - Identificador único
 * @returns {string} Clave completa
 */
function getCacheKey(type, key) {
  return `${CACHE_PREFIX}${type}_${key}`;
}

/**
 * Guarda datos en caché
 * @param {string} type - Tipo de caché (search, manga_details, chapters, etc.)
 * @param {string} key - Clave única (ej: query de búsqueda, id de manga)
 * @param {any} data - Datos a guardar
 * @param {number} ttl - Tiempo de vida en ms (opcional)
 */
export function setCache(type, key, data, ttl = null) {
  try {
    const cacheKey = getCacheKey(type, key);
    const expiresAt = ttl === Infinity ? Infinity : Date.now() + (ttl || CACHE_TTL[type] || DEFAULT_TTL);

    const cacheData = {
      data,
      expiresAt,
      createdAt: Date.now()
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.warn('Error saving to cache:', error);
    // Si el storage está lleno, limpiar caché antiguo
    if (error.name === 'QuotaExceededError') {
      cleanExpiredCache();
    }
    return false;
  }
}

/**
 * Obtiene datos del caché
 * @param {string} type - Tipo de caché
 * @param {string} key - Clave única
 * @returns {any|null} Datos o null si no existe/expirado
 */
export function getCache(type, key) {
  try {
    const cacheKey = getCacheKey(type, key);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const cacheData = JSON.parse(cached);

    // Verificar expiración
    if (cacheData.expiresAt !== Infinity && Date.now() > cacheData.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.warn('Error reading from cache:', error);
    return null;
  }
}

/**
 * Verifica si existe caché válido
 * @param {string} type - Tipo de caché
 * @param {string} key - Clave única
 * @returns {boolean} True si existe y no ha expirado
 */
export function hasValidCache(type, key) {
  return getCache(type, key) !== null;
}

/**
 * Elimina un item del caché
 * @param {string} type - Tipo de caché
 * @param {string} key - Clave única
 */
export function removeCache(type, key) {
  try {
    const cacheKey = getCacheKey(type, key);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Error removing from cache:', error);
  }
}

/**
 * Limpia todo el caché de la aplicación
 */
export function clearAllCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cache cleared');
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
}

/**
 * Limpia caché expirado
 */
export function cleanExpiredCache() {
  try {
    const keys = Object.keys(localStorage);
    let cleaned = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheData = JSON.parse(cached);
            if (cacheData.expiresAt !== Infinity && Date.now() > cacheData.expiresAt) {
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (e) {
          // Si hay error parseando, eliminar el item corrupto
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired cache items`);
    }
  } catch (error) {
    console.warn('Error cleaning expired cache:', error);
  }
}

/**
 * Obtiene estadísticas del caché
 * @returns {Object} Estadísticas
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage);
    let totalSize = 0;
    let itemCount = 0;
    const byType = {};

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        totalSize += value.length;
        itemCount++;

        // Extraer tipo
        const typeMatch = key.match(new RegExp(`^${CACHE_PREFIX}([^_]+)_`));
        if (typeMatch) {
          const type = typeMatch[1];
          byType[type] = (byType[type] || 0) + 1;
        }
      }
    });

    return {
      totalItems: itemCount,
      totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
      byType
    };
  } catch (error) {
    console.warn('Error getting cache stats:', error);
    return { totalItems: 0, totalSizeKB: 0, byType: {} };
  }
}

/**
 * Genera una clave de búsqueda normalizada
 * @param {string} query - Término de búsqueda
 * @param {Object} filters - Filtros aplicados
 * @returns {string} Clave normalizada
 */
export function generateSearchKey(query, filters = {}) {
  const normalizedQuery = query.toLowerCase().trim();
  const filterStr = Object.entries(filters)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return filterStr ? `${normalizedQuery}|${filterStr}` : normalizedQuery;
}

/**
 * Wrapper para funciones de búsqueda con caché
 * @param {Function} searchFn - Función de búsqueda original
 * @param {string} cacheType - Tipo de caché
 * @returns {Function} Función con caché
 */
export function withCache(searchFn, cacheType = 'search') {
  return async function cachedSearch(query, ...args) {
    const cacheKey = generateSearchKey(query, args[0] || {});

    // Intentar obtener del caché
    const cached = getCache(cacheType, cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheType}: ${cacheKey}`);
      return cached;
    }

    // Si no hay caché, ejecutar búsqueda
    console.log(`Cache miss for ${cacheType}: ${cacheKey}`);
    const results = await searchFn(query, ...args);

    // Guardar en caché
    setCache(cacheType, cacheKey, results);

    return results;
  };
}

// Limpiar caché expirado al cargar
if (typeof window !== 'undefined') {
  // Limpiar al cargar
  cleanExpiredCache();

  // Limpiar periódicamente (cada 5 minutos)
  setInterval(cleanExpiredCache, 5 * 60 * 1000);
}

export default {
  setCache,
  getCache,
  hasValidCache,
  removeCache,
  clearAllCache,
  cleanExpiredCache,
  getCacheStats,
  generateSearchKey,
  withCache,
  CACHE_TTL
};
