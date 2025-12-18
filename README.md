# 📚 MangaLib - Biblioteca de Manga, Manhwa y Webtoons

Plataforma completa para leer mangas, manhwas y webtoons en español de forma gratuita.

## ✨ Características

- 🔍 **Búsqueda avanzada** de miles de títulos
- 🇯🇵 **Manga japonés**, 🇰🇷 **Manhwa coreano**, 🌐 **Webtoons**
- 📖 **Lector optimizado** con modos vertical y horizontal
- 🌙 **Modo oscuro** y tema claro
- 📱 **Completamente responsive** (móvil, tablet, desktop)
- ⚡ **Actualización automática** de nuevos capítulos
- 💾 **Progreso de lectura** guardado localmente
- 🎨 **Diseño moderno** y premium

## 🚀 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Vercel Serverless Functions
- **APIs**: MangaDex, Consumet, Anilist
- **Hosting**: Vercel (gratis)

## 📦 Instalación

### Pre-requisitos

- Node.js 18+ instalado
- Cuenta en Vercel (gratis)

### Desarrollo Local

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Instalar Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Iniciar servidor de desarrollo**
   ```bash
   vercel dev
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
Pagina Manga/
├── api/                      # Backend (Serverless Functions)
│   ├── search.js            # Búsqueda de mangas
│   ├── manga/[id].js        # Detalles de manga
│   ├── chapters/[id].js     # Lista de capítulos
│   └── pages/[chapterId].js # Páginas del capítulo
│
├── lib/                      # Utilidades y clientes de APIs
│   └── mangadex-client.js   # Cliente de MangaDex API
│
├── public/                   # Frontend
│   ├── index.html           # Página principal
│   ├── manga-detail.html    # Detalles del manga
│   ├── reader.html          # Lector de capítulos
│   ├── css/
│   │   ├── variables.css    # Tokens de diseño
│   │   └── styles.css       # Estilos globales
│   └── js/
│       ├── library.js       # Lógica de búsqueda
│       ├── manga-detail.js  # Lógica de detalles
│       ├── reader.js        # Lógica del lector
│       └── theme.js         # Toggle de tema
│
├── vercel.json              # Configuración de Vercel
└── package.json             # Dependencias
```

## 🎮 Uso

### Búsqueda

1. Escribe el nombre del manga en la barra de búsqueda
2. Usa los filtros para seleccionar tipo (Manga, Manhwa, Webtoon)
3. Click en cualquier resultado para ver detalles

### Lectura

1. En la página de detalles, selecciona un capítulo
2. Usa los controles para navegar:
   - **Modo Vertical**: Scroll continuo (ideal para webtoons)
   - **Modo Horizontal**: Paginado (ideal para manga tradicional)
3. Atajos de teclado:
   - `←` / `→`: Navegar páginas (modo horizontal)
   - `H`: Ocultar/mostrar controles

### Navegación Móvil

- **Swipe izquierda/derecha**: Cambiar páginas
- **Tap en el borde**: Página anterior/siguiente
- **Scroll**: En modo vertical

## 🔧 Configuración

### Variables de Entorno

No se requieren variables de entorno ya que usamos APIs públicas.

### Personalización

- **Colores**: Modifica `public/css/variables.css`
- **Tema por defecto**: Edita `public/js/theme.js`

## 🚀 Despliegue a Producción

### Opción 1: Vercel CLI

```bash
# Login a Vercel
vercel login

# Deploy
vercel --prod
```

### Opción 2: GitHub + Vercel

1. Sube el proyecto a GitHub
2. Conecta tu repositorio en [vercel.com](https://vercel.com)
3. Deploy automático en cada push

## 📚 APIs Utilizadas

### MangaDex API
- **Endpoint**: `https://api.mangadex.org`
- **Documentación**: https://api.mangadex.org/docs/
- **Rate Limit**: 5 requests/segundo
- **Gratis**: ✅

### Consumet API (Futuro)
- Fuentes adicionales de manhwa/webtoon

### Anilist API (Futuro)
- Metadata complementaria

## ⌨️ Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `←` | Página anterior (modo horizontal) |
| `→` | Página siguiente (modo horizontal) |
| `H` | Ocultar/mostrar controles |

## 🎨 Características del Lector

- ✅ Modo vertical (webtoon) y horizontal (manga)
- ✅ Precarga de imágenes
- ✅ Barra de progreso
- ✅ Controles auto-ocultables
- ✅ Navegación táctil y por teclado
- ✅ Guardado de progreso local

## 🐛 Problemas Conocidos

- El scraping puede fallar si los sitios cambian su estructura
- Algunos mangas pueden no tener traducciones al español

## 📄 Licencia

Este proyecto es de código abierto para fines educativos.

**Nota**: El contenido (mangas, manhwas) pertenece a sus respectivos creadores y editoriales.

## 🤝 Contribuir

Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📧 Soporte

Si encuentras algún bug o tienes sugerencias, abre un issue en GitHub.

---

Hecho con ❤️ para la comunidad hispanohablante de manga/manhwa/webtoon
