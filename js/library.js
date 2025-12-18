// Lógica de la biblioteca (búsqueda y visualización de mangas)

let currentFilter = 'all';
let searchTimeout = null;

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const loadingContainer = document.getElementById('loadingContainer');
const noResults = document.getElementById('noResults');
const filterButtons = document.querySelectorAll('.filter-btn');

// Event Listeners
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

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Actualizar botón activo
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Actualizar filtro
        currentFilter = btn.dataset.type;

        // Buscar de nuevo si hay texto
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            searchMangas(query);
        }
    });
});

// Buscar mangas
async function searchMangas(query) {
    showLoading();

    try {
        const url = `/api/search?q=${encodeURIComponent(query)}&type=${currentFilter}&limit=30`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }

        const data = await response.json();

        if (data.success && data.results.length > 0) {
            displayResults(data.results, query);
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Error buscando mangas:', error);
        showError();
    }
}

// Mostrar resultados
function displayResults(mangas, query) {
    resultsTitle.textContent = `Resultados para "${query}"`;
    resultsCount.textContent = `${mangas.length} ${mangas.length === 1 ? 'resultado' : 'resultados'}`;

    resultsGrid.innerHTML = mangas.map(manga => createMangaCard(manga)).join('');

    // Agregar event listeners a las tarjetas
    document.querySelectorAll('.manga-card').forEach(card => {
        card.addEventListener('click', () => {
            const mangaId = card.dataset.id;
            window.location.href = `/manga-detail.html?id=${mangaId}`;
        });
    });

    hideLoading();
    resultsSection.style.display = 'block';
    noResults.style.display = 'none';
}

// Crear tarjeta de manga
function createMangaCard(manga) {
    const typeBadge = getTypeBadge(manga.type);
    const statusBadge = manga.status ? `<span class="badge badge-${manga.status}">${getStatusText(manga.status)}</span>` : '';

    return `
    <div class="manga-card" data-id="${manga.id}">
      <img 
        src="${manga.coverUrl}" 
        alt="${manga.title}"
        class="manga-cover"
        loading="lazy"
      >
      <div class="manga-info">
        <h3 class="manga-title">${manga.title}</h3>
        <div class="manga-badges">
          ${typeBadge}
          ${statusBadge}
        </div>
      </div>
    </div>
  `;
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
    noResults.style.display = 'block';
}

// Mostrar error
function showError() {
    hideLoading();
    resultsSection.style.display = 'none';
    noResults.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 120px; height: 120px; margin-bottom: var(--space-6); opacity: 0.5;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <h3>Error al buscar</h3>
    <p>Hubo un problema al realizar la búsqueda. Intenta de nuevo.</p>
  `;
    noResults.style.display = 'block';
}

// Auto-focus en el input de búsqueda
searchInput.focus();
