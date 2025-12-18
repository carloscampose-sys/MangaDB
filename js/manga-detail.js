// Lógica de la página de detalles del manga

// Obtener ID del manga de la URL
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('id');

// Elementos del DOM
const loadingContainer = document.getElementById('loadingContainer');
const mangaDetails = document.getElementById('mangaDetails');
const mangaCover = document.getElementById('mangaCover');
const mangaTitle = document.getElementById('mangaTitle');
const mangaMeta = document.getElementById('mangaMeta');
const mangaDescription = document.getElementById('mangaDescription');
const mangaStatus = document.getElementById('mangaStatus');
const mangaYear = document.getElementById('mangaYear');
const mangaAuthor = document.getElementById('mangaAuthor');
const chaptersLoading = document.getElementById('chaptersLoading');
const chaptersList = document.getElementById('chaptersList');

// Cargar datos al iniciar
if (mangaId) {
    loadMangaDetails();
    loadChapters();
} else {
    // Si no hay ID, redirigir a home
    window.location.href = '/';
}

// Cargar detalles del manga
async function loadMangaDetails() {
    try {
        const response = await fetch(`/api/manga/${mangaId}`);

        if (!response.ok) {
            throw new Error('Error al cargar detalles');
        }

        const data = await response.json();

        if (data.success) {
            displayMangaDetails(data.manga);
        }
    } catch (error) {
        console.error('Error cargando detalles:', error);
        showError();
    }
}

// Mostrar detalles del manga
function displayMangaDetails(manga) {
    mangaCover.src = manga.coverUrl;
    mangaCover.alt = manga.title;
    mangaTitle.textContent = manga.title;
    mangaDescription.textContent = manga.description || 'Sin descripción disponible.';

    // Meta badges
    const badges = [];
    badges.push(getTypeBadge(manga.type));
    if (manga.status) {
        badges.push(`<span class="badge badge-${manga.status}">${getStatusText(manga.status)}</span>`);
    }
    mangaMeta.innerHTML = badges.join('');

    // Stats
    mangaStatus.textContent = getStatusText(manga.status);
    mangaYear.textContent = manga.year || 'N/A';
    mangaAuthor.textContent = manga.author || 'Desconocido';

    // Actualizar título de la página
    document.title = `${manga.title} - MangaLib`;

    // Mostrar detalles y ocultar loading
    loadingContainer.style.display = 'none';
    mangaDetails.style.display = 'block';
}

// Cargar capítulos
async function loadChapters() {
    try {
        const response = await fetch(`/api/chapters/${mangaId}?limit=500`);

        if (!response.ok) {
            throw new Error('Error al cargar capítulos');
        }

        const data = await response.json();

        if (data.success && data.chapters.length > 0) {
            displayChapters(data.chapters);
        } else {
            showNoChapters();
        }
    } catch (error) {
        console.error('Error cargando capítulos:', error);
        showChaptersError();
    }
}

// Mostrar capítulos
function displayChapters(chapters) {
    chaptersList.innerHTML = chapters.map(chapter => createChapterItem(chapter)).join('');
    chaptersLoading.style.display = 'none';

    // Event listeners solo para capítulos no externos (los externos son <a> tags)
    document.querySelectorAll('.chapter-item:not(.chapter-external)').forEach(item => {
        item.addEventListener('click', () => {
            const chapterId = item.dataset.id;
            const chapterNumber = item.dataset.chapter;
            window.location.href = `/reader.html?id=${chapterId}&manga=${mangaId}&chapter=${chapterNumber}`;
        });
    });
}

// Crear elemento de capítulo
function createChapterItem(chapter) {
    const date = chapter.publishAt ? formatDate(chapter.publishAt) : '';
    const chapterNumber = chapter.chapter || '0';
    const title = chapter.title || `Capítulo ${chapterNumber}`;
    const isExternal = chapter.isExternal || chapter.externalUrl;
    const langFlag = getLangFlag(chapter.translatedLanguage);

    if (isExternal) {
        return `
        <a href="${chapter.externalUrl}" target="_blank" rel="noopener noreferrer" class="chapter-item chapter-external" data-id="${chapter.id}" data-chapter="${chapterNumber}">
          <div class="chapter-info">
            <h4>${langFlag} Capítulo ${chapterNumber}${chapter.volume ? ` - Vol. ${chapter.volume}` : ''}</h4>
            ${title !== `Capítulo ${chapterNumber}` ? `<p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-1);">${title}</p>` : ''}
            <span class="chapter-date">${date}</span>
          </div>
          <div>
            <span class="badge" style="background: var(--accent-primary); color: white;">
              🔗 Externo
            </span>
          </div>
        </a>
      `;
    }

    return `
    <div class="chapter-item" data-id="${chapter.id}" data-chapter="${chapterNumber}">
      <div class="chapter-info">
        <h4>${langFlag} Capítulo ${chapterNumber}${chapter.volume ? ` - Vol. ${chapter.volume}` : ''}</h4>
        ${title !== `Capítulo ${chapterNumber}` ? `<p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-1);">${title}</p>` : ''}
        <span class="chapter-date">${date}</span>
      </div>
      <div>
        <span class="badge" style="background: var(--bg-tertiary);">
          ${chapter.pages || '?'} págs
        </span>
      </div>
    </div>
  `;
}

// Obtener bandera del idioma
function getLangFlag(lang) {
    const flags = {
        'es': '🇪🇸',
        'es-la': '🇲🇽',
        'en': '🇬🇧',
        'pt-br': '🇧🇷',
        'fr': '🇫🇷',
        'de': '🇩🇪',
        'it': '🇮🇹',
        'ru': '🇷🇺',
        'ja': '🇯🇵',
        'ko': '🇰🇷',
        'zh': '🇨🇳'
    };
    return flags[lang] || '🌐';
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

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;

    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Mostrar error
function showError() {
    loadingContainer.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 120px; height: 120px; opacity: 0.5;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <h3>Error al cargar</h3>
    <p style="color: var(--text-secondary);">No se pudo cargar la información del manga.</p>
    <a href="/" class="btn btn-primary" style="margin-top: var(--space-4);">Volver al inicio</a>
  `;
}

// Mostrar sin capítulos
function showNoChapters() {
    chaptersLoading.style.display = 'none';
    chaptersList.innerHTML = `
    <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary);">
      <p>No hay capítulos disponibles en español.</p>
    </div>
  `;
}

// Mostrar error de capítulos
function showChaptersError() {
    chaptersLoading.style.display = 'none';
    chaptersList.innerHTML = `
    <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary);">
      <p>Error al cargar los capítulos. Intenta de nuevo más tarde.</p>
    </div>
  `;
}
