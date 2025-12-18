// Lógica del lector de capítulos

// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const chapterId = urlParams.get('id');
const mangaId = urlParams.get('manga');
const chapterNumber = urlParams.get('chapter');

// Estado del lector
let pages = [];
let currentPage = 0;
let viewMode = localStorage.getItem('viewMode') || 'vertical'; // 'vertical' o 'horizontal'
let hideControls = false;
let hideTimeout = null;

// Elementos del DOM
const readerContainer = document.getElementById('readerContainer');
const readerHeader = document.getElementById('readerHeader');
const navigationOverlay = document.getElementById('navigationOverlay');
const loadingOverlay = document.getElementById('loadingOverlay');
const readerTitle = document.getElementById('readerTitle');
const backBtn = document.getElementById('backBtn');
const modeToggle = document.getElementById('modeToggle');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressFill = document.getElementById('progressFill');
const pageInfo = document.getElementById('pageInfo');

// Inicializar
if (chapterId && mangaId) {
    loadChapter();
    setupEventListeners();
} else {
    window.location.href = '/';
}

// Cargar capítulo
async function loadChapter() {
    try {
        const response = await fetch(`/api/pages/${chapterId}`);

        if (!response.ok) {
            throw new Error('Error al cargar capítulo');
        }

        const data = await response.json();

        if (data.success && data.pages.length > 0) {
            pages = data.pages;
            renderPages();
            updateTitle();
            hideLoadingOverlay();

            // Guardar progreso (para futuras implementaciones)
            saveProgress();
        } else {
            showError('No se encontraron páginas para este capítulo');
        }
    } catch (error) {
        console.error('Error cargando capítulo:', error);
        showError('Error al cargar el capítulo');
    }
}

// Renderizar páginas
function renderPages() {
    readerContainer.innerHTML = '';
    readerContainer.className = `reader-container reader-${viewMode}`;

    if (viewMode === 'vertical') {
        // Modo vertical: mostrar todas las páginas
        pages.forEach((pageUrl, index) => {
            const img = document.createElement('img');
            img.src = pageUrl;
            img.alt = `Página ${index + 1}`;
            img.loading = index < 3 ? 'eager' : 'lazy'; // Eager para las primeras 3 páginas
            img.addEventListener('load', () => updateProgress());
            readerContainer.appendChild(img);
        });

        // Scroll listener para progreso en modo vertical
        window.addEventListener('scroll', updateProgressOnScroll);
    } else {
        // Modo horizontal: mostrar página actual
        renderCurrentPage();
    }

    updateNavigationButtons();
}

// Renderizar página actual (modo horizontal)
function renderCurrentPage() {
    readerContainer.innerHTML = '';

    if (pages[currentPage]) {
        const img = document.createElement('img');
        img.src = pages[currentPage];
        img.alt = `Página ${currentPage + 1}`;
        readerContainer.appendChild(img);

        // Precargar páginas adyacentes
        preloadAdjacentPages();
    }

    updateProgress();
    updateNavigationButtons();
}

// Precargar páginas adyacentes
function preloadAdjacentPages() {
    // Precargar siguiente página
    if (currentPage + 1 < pages.length) {
        const nextImg = new Image();
        nextImg.src = pages[currentPage + 1];
    }

    // Precargar página anterior
    if (currentPage > 0) {
        const prevImg = new Image();
        prevImg.src = pages[currentPage - 1];
    }
}

// Actualizar progreso
function updateProgress() {
    if (viewMode === 'horizontal') {
        const progress = ((currentPage + 1) / pages.length) * 100;
        progressFill.style.width = `${progress}%`;
        pageInfo.textContent = `Página ${currentPage + 1} de ${pages.length}`;
    }
}

// Actualizar progreso en scroll (modo vertical)
function updateProgressOnScroll() {
    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progressFill.style.width = `${scrollPercentage}%`;

    const estimatedPage = Math.floor((scrollPercentage / 100) * pages.length) + 1;
    pageInfo.textContent = `Página ~${estimatedPage} de ${pages.length}`;
}

// Actualizar botones de navegación
function updateNavigationButtons() {
    if (viewMode === 'horizontal') {
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage === pages.length - 1;
    } else {
        // En modo vertical, los botones no se usan para páginas individuales
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
}

// Navegar a página anterior
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        renderCurrentPage();
    }
}

// Navegar a página siguiente
function nextPage() {
    if (currentPage < pages.length - 1) {
        currentPage++;
        renderCurrentPage();
    }
}

// Cambiar modo de visualización
function toggleViewMode() {
    viewMode = viewMode === 'vertical' ? 'horizontal' : 'vertical';
    localStorage.setItem('viewMode', viewMode);

    currentPage = 0; // Resetear a primera página
    renderPages();

    modeToggle.textContent = viewMode === 'vertical' ? '📖 Horizontal' : '📜 Vertical';
}

// Actualizar título
function updateTitle() {
    readerTitle.textContent = `Capítulo ${chapterNumber || '?'}`;
    document.title = `Capítulo ${chapterNumber || '?'} - MangaLib`;
}

// Ocultar overlay de carga
function hideLoadingOverlay() {
    loadingOverlay.style.display = 'none';
}

// Mostrar error
function showError(message) {
    loadingOverlay.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 80px; height: 80px; opacity: 0.5;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <h3>${message}</h3>
    <a href="/manga-detail.html?id=${mangaId}" class="btn btn-primary" style="margin-top: var(--space-4);">Volver al manga</a>
  `;
}

// Guardar progreso
function saveProgress() {
    const progress = {
        mangaId,
        chapterId,
        chapterNumber,
        page: currentPage,
        timestamp: Date.now()
    };
    localStorage.setItem(`progress_${mangaId}`, JSON.stringify(progress));
}

// Auto-ocultar controles
function resetHideControlsTimer() {
    readerHeader.classList.remove('hidden');
    navigationOverlay.classList.remove('hidden');

    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        if (hideControls) {
            readerHeader.classList.add('hidden');
            navigationOverlay.classList.add('hidden');
        }
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Botón volver
    backBtn.addEventListener('click', () => {
        window.location.href = `/manga-detail.html?id=${mangaId}`;
    });

    // Toggle modo
    modeToggle.addEventListener('click', toggleViewMode);
    modeToggle.textContent = viewMode === 'vertical' ? '📖 Horizontal' : '📜 Vertical';

    // Navegación
    prevBtn.addEventListener('click', previousPage);
    nextBtn.addEventListener('click', nextPage);

    // Teclado
    document.addEventListener('keydown', (e) => {
        if (viewMode === 'horizontal') {
            if (e.key === 'ArrowLeft') previousPage();
            if (e.key === 'ArrowRight') nextPage();
        }

        // Toggle controles con 'H'
        if (e.key === 'h' || e.key === 'H') {
            hideControls = !hideControls;
            if (hideControls) {
                readerHeader.classList.add('hidden');
                navigationOverlay.classList.add('hidden');
            } else {
                resetHideControlsTimer();
            }
        }
    });

    // Mostrar controles al mover el mouse
    document.addEventListener('mousemove', () => {
        if (!hideControls) {
            resetHideControlsTimer();
        }
    });

    // Click en la imagen en modo horizontal para navegar
    if (viewMode === 'horizontal') {
        readerContainer.addEventListener('click', (e) => {
            const rect = readerContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const containerWidth = rect.width;

            // Click en el lado izquierdo = página anterior
            if (clickX < containerWidth / 3) {
                previousPage();
            }
            // Click en el lado derecho = página siguiente
            else if (clickX > (containerWidth * 2) / 3) {
                nextPage();
            }
        });
    }

    // Touch gestures para móvil
    let touchStartX = 0;
    let touchEndX = 0;

    readerContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    readerContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        if (viewMode === 'horizontal') {
            const swipeThreshold = 50;

            if (touchStartX - touchEndX > swipeThreshold) {
                // Swipe left = next page
                nextPage();
            }

            if (touchEndX - touchStartX > swipeThreshold) {
                // Swipe right = previous page
                previousPage();
            }
        }
    }

    // Guardar progreso al salir
    window.addEventListener('beforeunload', saveProgress);
}
