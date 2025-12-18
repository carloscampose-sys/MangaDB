// Lógica de la biblioteca (búsqueda y visualización de mangas)

// ============ SISTEMA DE CACHÉ ============
const CACHE_PREFIX = 'mangalib_cache_';
const CACHE_TTL = {
  search: 15 * 60 * 1000,      // 15 minutos para búsquedas
  manga_details: 60 * 60 * 1000 // 1 hora para detalles
};

function getCacheKey(type, key) {
  return `${CACHE_PREFIX}${type}_${key}`;
}

function setCache(type, key, data) {
  try {
    const cacheKey = getCacheKey(type, key);
    const cacheData = {
      data,
      expiresAt: Date.now() + (CACHE_TTL[type] || 15 * 60 * 1000),
      createdAt: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Cache storage error:', e);
  }
}

function getCache(type, key) {
  try {
    const cacheKey = getCacheKey(type, key);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    if (Date.now() > cacheData.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return cacheData.data;
  } catch (e) {
    return null;
  }
}

function generateSearchKey(query, type, source, genre) {
  return `${query.toLowerCase().trim()}|${type}|${source}|${genre}`;
}

// Limpiar caché expirado al cargar
(function cleanExpiredCache() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.expiresAt && Date.now() > data.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (e) {}
})();

// ============ ESTADO DE LA APP ============
let currentType = 'all';
let currentSource = 'all';
let currentGenre = 'all';
let searchTimeout = null;

// ============ PAGINACIÓN / SCROLL INFINITO ============
let currentPage = 1;
let isLoadingMore = false;
let hasMoreResults = true;
let allResults = [];
const RESULTS_PER_PAGE = 20;

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const loadingContainer = document.getElementById('loadingContainer');
const noResults = document.getElementById('noResults');
const typeButtons = document.querySelectorAll('.type-btn');
const sourceButtons = document.querySelectorAll('.source-btn');
const genreFilter = document.getElementById('genreFilter');

// Event Listeners - Búsqueda
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Debounce para evitar muchas peticiones
    clearTimeout(searchTimeout);

    if (query.length >= 2) {
        searchTimeout = setTimeout(() => {
            searchMangas(query);
        }, 500);
    } else {
        hideResults();
    }
});

// Event Listeners - Filtro de Tipo
typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;

        const query = searchInput.value.trim();
        if (query.length >= 2) {
            searchMangas(query);
        }
    });
});

// Event Listeners - Filtro de Fuente
sourceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sourceButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSource = btn.dataset.source;

        const query = searchInput.value.trim();
        if (query.length >= 2) {
            searchMangas(query);
        }
    });
});

// Event Listeners - Filtro de Género
genreFilter.addEventListener('change', (e) => {
    currentGenre = e.target.value;

    const query = searchInput.value.trim();
    if (query.length >= 2) {
        searchMangas(query);
    }
});

// Buscar mangas
async function searchMangas(query) {
    showLoading();

    try {
        // Verificar caché primero
        const cacheKey = generateSearchKey(query, currentType, currentSource, currentGenre);
        const cachedResults = getCache('search', cacheKey);

        if (cachedResults) {
            console.log('Cache hit:', cacheKey);
            processResults(cachedResults, query);
            return;
        }

        console.log('Cache miss:', cacheKey);

        // Construir URL con todos los filtros
        let url = `/api/search?q=${encodeURIComponent(query)}&limit=30`;
        url += `&type=${currentType}`;
        url += `&source=${currentSource}`;
        if (currentGenre !== 'all') {
            url += `&genre=${encodeURIComponent(currentGenre)}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }

        const data = await response.json();

        if (data.success && data.results.length > 0) {
            // Guardar en caché
            setCache('search', cacheKey, data.results);
            processResults(data.results, query);
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Error buscando mangas:', error);
        lastSearchQuery = query;
        showError(error);
    }
}

// Procesar resultados (desde caché o API)
function processResults(results, query) {
    // Filtrar por género en el frontend si la API no lo soporta
    let filteredResults = results;
    if (currentGenre !== 'all') {
        filteredResults = results.filter(manga =>
            manga.tags && manga.tags.some(tag =>
                tag.toLowerCase().includes(currentGenre.toLowerCase())
            )
        );
    }

    if (filteredResults.length > 0) {
        // Guardar todos los resultados para paginación
        allResults = filteredResults;
        currentPage = 1;
        hasMoreResults = filteredResults.length > RESULTS_PER_PAGE;

        // Mostrar primera página
        displayResults(filteredResults.slice(0, RESULTS_PER_PAGE), query, false);
    } else {
        showNoResults();
    }
}

// Mostrar resultados
function displayResults(mangas, query, append = false) {
    resultsTitle.textContent = `Resultados para "${query}"`;

    // Mostrar info de filtros activos
    let filterInfo = [];
    if (currentSource !== 'all') {
        const sourceNames = {
            'mangadex': 'MangaDex',
            'mangaplus': 'Manga Plus',
            'webtoons': 'Webtoons'
        };
        filterInfo.push(sourceNames[currentSource] || currentSource);
    }
    if (currentType !== 'all') filterInfo.push(currentType);
    if (currentGenre !== 'all') filterInfo.push(currentGenre);

    const filterText = filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : '';
    resultsCount.textContent = `${allResults.length} resultado${allResults.length !== 1 ? 's' : ''}${filterText}`;

    const newCards = mangas.map(manga => createMangaCard(manga)).join('');

    if (append) {
        resultsGrid.innerHTML += newCards;
    } else {
        resultsGrid.innerHTML = newCards;
    }

    // Agregar event listeners a las tarjetas nuevas
    const cards = append
        ? resultsGrid.querySelectorAll('.manga-card:not([data-bound])')
        : resultsGrid.querySelectorAll('.manga-card');

    cards.forEach(card => {
        card.dataset.bound = 'true';
        card.addEventListener('click', () => {
            const mangaId = card.dataset.id;
            const source = card.dataset.source || 'mangadex';
            window.location.href = `/manga-detail.html?id=${mangaId}&source=${source}`;
        });
    });

    hideLoading();
    resultsSection.style.display = 'block';
    noResults.style.display = 'none';

    // Mostrar/ocultar indicador de "cargar más"
    updateLoadMoreIndicator();

    // Iniciar observador para scroll infinito
    setTimeout(() => startScrollObserver(), 100);
}

// Cargar más resultados
function loadMoreResults() {
    if (isLoadingMore || !hasMoreResults) return;

    isLoadingMore = true;
    currentPage++;

    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    const nextBatch = allResults.slice(start, end);

    if (nextBatch.length > 0) {
        const query = searchInput.value.trim();
        displayResults(nextBatch, query, true);
    }

    hasMoreResults = end < allResults.length;
    isLoadingMore = false;
    updateLoadMoreIndicator();
}

// Actualizar indicador de cargar más
function updateLoadMoreIndicator() {
    let indicator = document.getElementById('loadMoreIndicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'loadMoreIndicator';
        indicator.style.cssText = 'text-align: center; padding: var(--space-8); color: var(--text-secondary);';
        resultsSection.appendChild(indicator);
    }

    if (hasMoreResults) {
        indicator.innerHTML = `
            <div class="spinner" style="margin: 0 auto var(--space-4);"></div>
            <p>Cargando más resultados...</p>
        `;
        indicator.style.display = 'block';
    } else if (allResults.length > RESULTS_PER_PAGE) {
        indicator.innerHTML = `<p>Has visto todos los ${allResults.length} resultados</p>`;
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

// Observador de intersección para scroll infinito
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && hasMoreResults && !isLoadingMore) {
            loadMoreResults();
        }
    });
}, { rootMargin: '200px' });

// Iniciar observación cuando se muestran resultados
function startScrollObserver() {
    const indicator = document.getElementById('loadMoreIndicator');
    if (indicator) {
        scrollObserver.observe(indicator);
    }
}

// Detener observación
function stopScrollObserver() {
    const indicator = document.getElementById('loadMoreIndicator');
    if (indicator) {
        scrollObserver.unobserve(indicator);
    }
}

// Crear tarjeta de manga
function createMangaCard(manga) {
    const typeBadge = getTypeBadge(manga.type);
    const statusBadge = manga.status ? `<span class="badge badge-${manga.status}">${getStatusText(manga.status)}</span>` : '';
    const sourceBadge = getSourceBadge(manga.source);

    return `
    <div class="manga-card" data-id="${manga.id}" data-source="${manga.source || 'mangadex'}">
      <img
        src="${manga.coverUrl}"
        alt="${manga.title}"
        class="manga-cover"
        loading="lazy"
        onerror="this.src='/images/no-cover.jpg'"
      >
      <div class="manga-info">
        <h3 class="manga-title">${manga.title}</h3>
        <div class="manga-badges">
          ${sourceBadge}
          ${typeBadge}
          ${statusBadge}
        </div>
      </div>
    </div>
  `;
}

// Obtener badge de fuente
function getSourceBadge(source) {
    const badges = {
        'mangadex': '<span class="badge" style="background: #ff6740;">MangaDex</span>',
        'mangaplus': '<span class="badge" style="background: #dc0000;">M+</span>',
        'webtoons': '<span class="badge" style="background: #00d564;">Webtoons</span>',
        'tumanga': '<span class="badge" style="background: #ff6b35;">TuManga</span>',
        'anilist': '<span class="badge" style="background: #02a9ff;">AniList</span>',
        'jikan': '<span class="badge" style="background: #2e51a2;">MAL</span>',
        'visormanga': '<span class="badge" style="background: #9333ea;">VisorManga</span>',
        'mangalector': '<span class="badge" style="background: #f59e0b;">MangaLector</span>'
    };
    return badges[source] || '';
}

// Obtener badge de tipo
function getTypeBadge(type) {
    const badges = {
        'manga': '<span class="badge badge-manga">🇯🇵 Manga</span>',
        'manhwa': '<span class="badge badge-manhwa">🇰🇷 Manhwa</span>',
        'webtoon': '<span class="badge badge-webtoon">🌐 Webtoon</span>',
        'manhua': '<span class="badge badge-manhwa">🇨🇳 Manhua</span>'
    };
    return badges[type] || badges['manga'];
}

// Obtener texto de estado
function getStatusText(status) {
    const statusMap = {
        'ongoing': 'En curso',
        'completed': 'Completado',
        'hiatus': 'En pausa',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Mostrar loading
function showLoading() {
    loadingContainer.style.display = 'flex';
    resultsSection.style.display = 'none';
    noResults.style.display = 'none';
}

// Ocultar loading
function hideLoading() {
    loadingContainer.style.display = 'none';
}

// Ocultar resultados
function hideResults() {
    resultsSection.style.display = 'none';
    loadingContainer.style.display = 'none';
    noResults.style.display = 'none';
}

// Mostrar sin resultados
function showNoResults() {
    hideLoading();
    resultsSection.style.display = 'none';
    noResults.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 120px; height: 120px; margin-bottom: var(--space-6); opacity: 0.5;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <h3>No se encontraron resultados</h3>
    <p>Intenta con otro término de búsqueda o cambia los filtros</p>
  `;
    noResults.style.display = 'block';
}

// Mostrar error con detalles
function showError(error = null) {
    hideLoading();
    resultsSection.style.display = 'none';

    // Detectar tipo de error
    let title = 'Error al buscar';
    let message = 'Hubo un problema al realizar la búsqueda.';
    let canRetry = true;

    if (error) {
        if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
            title = 'Tiempo de espera agotado';
            message = 'El servidor tardó demasiado. Intenta con menos fuentes o más tarde.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            title = 'Error de conexión';
            message = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        } else if (error.message?.includes('403')) {
            title = 'Acceso denegado';
            message = 'Algunas fuentes están bloqueadas. Intenta con otras fuentes.';
            canRetry = false;
        }
    }

    noResults.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 120px; height: 120px; margin-bottom: var(--space-6); opacity: 0.5;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <h3>${title}</h3>
    <p style="margin-bottom: var(--space-4);">${message}</p>
    ${canRetry ? `<button class="btn btn-primary" onclick="retryLastSearch()">Reintentar</button>` : ''}
  `;
    noResults.style.display = 'block';
}

// Variable para guardar última búsqueda
let lastSearchQuery = '';

// Función para reintentar búsqueda
function retryLastSearch() {
    if (lastSearchQuery) {
        searchMangas(lastSearchQuery);
    }
}

// Hacer disponible globalmente
window.retryLastSearch = retryLastSearch;

// Auto-focus en el input de búsqueda
searchInput.focus();

// Ocultar loading inicial
loadingContainer.style.display = 'none';
