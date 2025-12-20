// Lógica de la página de detalles del manga

// Obtener ID del manga y fuente de la URL
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('id');

// Detectar fuente automáticamente basado en el ID
function detectSource(id, urlSource) {
    if (urlSource) return urlSource;
    if (id && id.startsWith('mangaplus_')) return 'mangaplus';
    if (id && id.startsWith('webtoons-')) return 'webtoons';
    if (id && id.startsWith('tumanga-')) return 'tumanga';
    if (id && id.startsWith('anilist-')) return 'anilist';
    if (id && id.startsWith('jikan-')) return 'jikan';
    if (id && id.startsWith('visormanga-')) return 'visormanga';
    if (id && id.startsWith('mangalector-')) return 'mangalector';
    return 'mangadex';
}
const source = detectSource(mangaId, urlParams.get('source'));

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
    // Los capítulos se cargan dentro de loadMangaDetails si es necesario
} else {
    // Si no hay ID, redirigir a home
    window.location.href = '/';
}

// Cargar detalles del manga
async function loadMangaDetails() {
    try {
        // Usar API unificada /api/details para todas las fuentes
        const apiUrl = `/api/details?id=${encodeURIComponent(mangaId)}&source=${source}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('Error al cargar detalles');
        }

        const data = await response.json();

        if (data.success) {
            displayMangaDetails(data.manga);
            // Todos los detalles ahora traen capítulos en la misma respuesta
            if (data.chapters && data.chapters.length > 0) {
                displayChapters(data.chapters);
            } else if ((source === 'anilist' || source === 'jikan') && data.note) {
                // Para AniList y Jikan que no tienen capítulos, mostrar mensaje
                showInfoOnlyMessage(data);
            } else if (source === 'mangadex') {
                // MangaDex: cargar capítulos por separado si no vinieron
                loadChapters();
            } else {
                showNoChapters();
            }
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

    // Disparar evento para sistema de favoritos
    window.dispatchEvent(new CustomEvent('manga-loaded', {
        detail: {
            id: mangaId,
            source: source,
            title: manga.title,
            coverUrl: manga.coverUrl,
            type: manga.type,
            status: manga.status
        }
    }));
}

// Mostrar mensaje para fuentes solo de información (AniList, Jikan)
function showInfoOnlyMessage(data) {
    chaptersLoading.style.display = 'none';
    chaptersList.innerHTML = `
    <div style="text-align: center; padding: var(--space-8); background: var(--bg-secondary); border-radius: var(--radius-xl);">
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        ${data.note}
      </p>
      ${data.externalLinks && data.externalLinks.length > 0 ? `
        <div style="margin-top: var(--space-4);">
          <p style="font-weight: 600; margin-bottom: var(--space-2);">Links externos:</p>
          ${data.externalLinks.slice(0, 5).map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer"
               class="badge" style="margin: var(--space-1); display: inline-block; background: var(--accent-primary);">
              ${link.site}
            </a>
          `).join('')}
        </div>
      ` : ''}
      ${data.recommendations && data.recommendations.length > 0 ? `
        <div style="margin-top: var(--space-6);">
          <p style="font-weight: 600; margin-bottom: var(--space-3);">Recomendaciones similares:</p>
          <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap;">
            ${data.recommendations.slice(0, 4).map(rec => `
              <a href="/manga-detail.html?id=${rec.id}&source=${source}" style="text-align: center; max-width: 100px;">
                <img src="${rec.coverUrl}" alt="${rec.title}" style="width: 80px; height: 120px; object-fit: cover; border-radius: var(--radius-lg);">
                <p style="font-size: var(--text-xs); margin-top: var(--space-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rec.title}</p>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Cargar capítulos
async function loadChapters() {
    // Fuentes que ya cargan capítulos con los detalles
    const sourcesWithChapters = ['mangaplus', 'webtoons', 'tumanga', 'anilist', 'jikan', 'visormanga', 'mangalector'];
    if (sourcesWithChapters.includes(source)) {
        return;
    }

    try {
        const response = await fetch(`/api/chapters/${mangaId}?limit=100`);

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
            const chapterSource = item.dataset.source || source;

            // Manejar según la fuente
            if (chapterSource === 'mangaplus') {
                // Manga Plus - abrir en sitio oficial (imágenes encriptadas)
                const numericId = chapterId.replace('mangaplus_', '');
                window.open(`https://mangaplus.shueisha.co.jp/viewer/${numericId}`, '_blank');
            } else if (chapterSource === 'webtoons') {
                // Webtoons - abrir en sitio oficial
                const episodeUrl = item.dataset.url;
                if (episodeUrl) {
                    window.open(episodeUrl, '_blank');
                } else {
                    // Fallback: ir al reader local (si tenemos las imágenes)
                    window.location.href = `/reader.html?id=${chapterId}&manga=${mangaId}&chapter=${chapterNumber}&source=webtoons`;
                }
            } else if (chapterSource === 'tumanga') {
                // TuManga - leer en nuestro reader local
                const slug = item.dataset.slug;
                window.location.href = `/reader.html?id=${chapterId}&manga=${mangaId}&chapter=${chapterNumber}&source=tumanga&slug=${slug}`;
            } else {
                window.location.href = `/reader.html?id=${chapterId}&manga=${mangaId}&chapter=${chapterNumber}`;
            }
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
    const chapterSource = chapter.source || source;

    // Para Manga Plus, los capítulos se abren en su sitio oficial
    if (chapterSource === 'mangaplus') {
        const numericId = chapter.id.toString().replace('mangaplus_', '');
        return `
        <a href="https://mangaplus.shueisha.co.jp/viewer/${numericId}" target="_blank" rel="noopener noreferrer" class="chapter-item chapter-external" data-id="${chapter.id}" data-chapter="${chapterNumber}" data-source="mangaplus">
          <div class="chapter-info">
            <h4>Capítulo ${chapterNumber}</h4>
            ${title !== `Capítulo ${chapterNumber}` ? `<p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-1);">${title}</p>` : ''}
          </div>
          <div>
            <span class="badge" style="background: #dc0000; color: white;">
              M+ Leer
            </span>
          </div>
        </a>
      `;
    }

    // Para Webtoons, los capítulos se abren en su sitio oficial
    if (chapterSource === 'webtoons') {
        const episodeUrl = chapter.url || '#';
        return `
        <a href="${episodeUrl}" target="_blank" rel="noopener noreferrer" class="chapter-item chapter-external" data-id="${chapter.id}" data-chapter="${chapterNumber}" data-source="webtoons" data-url="${episodeUrl}">
          <div class="chapter-info">
            <h4>Episodio ${chapterNumber}</h4>
            ${title !== `Episodio ${chapterNumber}` && title !== `Capítulo ${chapterNumber}` ? `<p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-1);">${title}</p>` : ''}
            ${date ? `<span class="chapter-date">${date}</span>` : ''}
          </div>
          <div>
            <span class="badge" style="background: #00d564; color: white;">
              Webtoons
            </span>
          </div>
        </a>
      `;
    }

    // Para TuManga, los capítulos se leen en nuestro reader local
    if (chapterSource === 'tumanga') {
        return `
        <div class="chapter-item" data-id="${chapter.id}" data-chapter="${chapterNumber}" data-source="tumanga" data-slug="${chapter.slug || ''}">
          <div class="chapter-info">
            <h4>Capítulo ${chapterNumber}</h4>
            ${title !== `Capítulo ${chapterNumber}` ? `<p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-1);">${title}</p>` : ''}
            ${date ? `<span class="chapter-date">${date}</span>` : ''}
          </div>
          <div>
            <span class="badge" style="background: #ff6b35; color: white;">
              TuManga
            </span>
          </div>
        </div>
      `;
    }

    if (isExternal) {
        return `
        <a href="${chapter.externalUrl}" target="_blank" rel="noopener noreferrer" class="chapter-item chapter-external" data-id="${chapter.id}" data-chapter="${chapterNumber}" data-source="${chapterSource}">
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
    <div class="chapter-item" data-id="${chapter.id}" data-chapter="${chapterNumber}" data-source="${chapterSource}">
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
