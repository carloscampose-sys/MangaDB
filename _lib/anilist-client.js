/**
 * Cliente para AniList GraphQL API
 * https://graphql.anilist.co
 * Documentación: https://anilist.gitbook.io/anilist-apiv2-docs/
 */

const ANILIST_URL = 'https://graphql.anilist.co';

/**
 * Ejecuta una query GraphQL en AniList
 * @param {string} query - Query GraphQL
 * @param {Object} variables - Variables de la query
 * @returns {Promise<Object>} Respuesta de AniList
 */
async function executeQuery(query, variables = {}) {
  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`AniList GraphQL error: ${data.errors[0].message}`);
  }

  return data.data;
}

/**
 * Busca manga/manhwa en AniList
 * @param {string} searchQuery - Término de búsqueda
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas encontrados
 */
export async function searchAniList(searchQuery, limit = 20) {
  const query = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
            native
          }
          description(asHtml: false)
          coverImage {
            large
            medium
          }
          bannerImage
          format
          status
          chapters
          volumes
          startDate {
            year
          }
          genres
          tags {
            name
            rank
          }
          averageScore
          popularity
          countryOfOrigin
          isAdult
          siteUrl
        }
      }
    }
  `;

  try {
    console.log('AniList search:', searchQuery);
    const data = await executeQuery(query, { search: searchQuery, perPage: limit });

    return data.Page.media.map(manga => formatAniListManga(manga));
  } catch (error) {
    console.error('Error searching AniList:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de un manga por ID
 * @param {number} id - ID de AniList
 * @returns {Promise<Object>} Detalles del manga
 */
export async function getAniListDetails(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        title {
          romaji
          english
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
        }
        bannerImage
        format
        status
        chapters
        volumes
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        genres
        tags {
          name
          rank
        }
        averageScore
        popularity
        countryOfOrigin
        isAdult
        siteUrl
        staff {
          edges {
            role
            node {
              name {
                full
              }
            }
          }
        }
        characters(sort: ROLE) {
          edges {
            role
            node {
              name {
                full
              }
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
              }
              type
              format
              coverImage {
                medium
              }
            }
          }
        }
        recommendations(sort: RATING_DESC, perPage: 5) {
          nodes {
            mediaRecommendation {
              id
              title {
                romaji
              }
              coverImage {
                medium
              }
            }
          }
        }
        externalLinks {
          site
          url
        }
      }
    }
  `;

  try {
    console.log('AniList details:', id);
    const data = await executeQuery(query, { id: parseInt(id) });

    return formatAniListDetails(data.Media);
  } catch (error) {
    console.error('Error getting AniList details:', error);
    throw error;
  }
}

/**
 * Obtiene mangas populares/trending
 * @param {number} limit - Número de resultados
 * @returns {Promise<Array>} Lista de mangas trending
 */
export async function getTrendingManga(limit = 20) {
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: MANGA, sort: TRENDING_DESC) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          format
          status
          averageScore
          countryOfOrigin
        }
      }
    }
  `;

  try {
    const data = await executeQuery(query, { perPage: limit });
    return data.Page.media.map(manga => formatAniListManga(manga));
  } catch (error) {
    console.error('Error getting trending manga:', error);
    throw error;
  }
}

/**
 * Formatea un manga de AniList al formato de la app
 */
function formatAniListManga(manga) {
  // Determinar tipo basado en formato y país de origen
  let type = 'manga';
  if (manga.countryOfOrigin === 'KR') {
    type = 'manhwa';
  } else if (manga.countryOfOrigin === 'CN') {
    type = 'manhua';
  } else if (manga.format === 'ONE_SHOT') {
    type = 'oneshot';
  }

  // Elegir el mejor título disponible
  const title = manga.title.english || manga.title.romaji || manga.title.native;

  return {
    id: `anilist-${manga.id}`,
    anilistId: manga.id,
    title,
    titleRomaji: manga.title.romaji,
    titleEnglish: manga.title.english,
    titleNative: manga.title.native,
    description: cleanDescription(manga.description),
    coverUrl: manga.coverImage?.large || manga.coverImage?.medium || '/images/no-cover.jpg',
    bannerUrl: manga.bannerImage,
    type,
    status: mapStatus(manga.status),
    year: manga.startDate?.year,
    chapters: manga.chapters,
    volumes: manga.volumes,
    genres: manga.genres || [],
    tags: (manga.tags || []).slice(0, 10).map(t => t.name),
    score: manga.averageScore,
    popularity: manga.popularity,
    isAdult: manga.isAdult,
    countryOfOrigin: manga.countryOfOrigin,
    source: 'anilist',
    sourceUrl: manga.siteUrl
  };
}

/**
 * Formatea detalles completos de AniList
 */
function formatAniListDetails(manga) {
  const basic = formatAniListManga(manga);

  // Extraer autor y artista
  const staff = manga.staff?.edges || [];
  const author = staff.find(s => s.role.toLowerCase().includes('story'))?.node?.name?.full;
  const artist = staff.find(s => s.role.toLowerCase().includes('art'))?.node?.name?.full;

  // Formatear relaciones
  const relations = (manga.relations?.edges || []).map(rel => ({
    id: `anilist-${rel.node.id}`,
    title: rel.node.title.romaji,
    type: rel.node.type,
    format: rel.node.format,
    relation: rel.relationType,
    coverUrl: rel.node.coverImage?.medium
  }));

  // Formatear recomendaciones
  const recommendations = (manga.recommendations?.nodes || [])
    .filter(r => r.mediaRecommendation)
    .map(r => ({
      id: `anilist-${r.mediaRecommendation.id}`,
      title: r.mediaRecommendation.title.romaji,
      coverUrl: r.mediaRecommendation.coverImage?.medium
    }));

  // Links externos (útil para encontrar dónde leer)
  const externalLinks = (manga.externalLinks || []).map(link => ({
    site: link.site,
    url: link.url
  }));

  return {
    ...basic,
    author: author || 'Desconocido',
    artist: artist || author || 'Desconocido',
    relations,
    recommendations,
    externalLinks,
    // AniList no tiene capítulos para leer, solo información
    chapters: [],
    totalChapters: manga.chapters || 0,
    note: 'AniList solo provee información. Para leer, busca en otras fuentes.'
  };
}

/**
 * Limpia la descripción de HTML y caracteres especiales
 */
function cleanDescription(desc) {
  if (!desc) return 'Sin descripción disponible';

  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Mapea el estado de AniList al formato de la app
 */
function mapStatus(status) {
  const statusMap = {
    'FINISHED': 'completed',
    'RELEASING': 'ongoing',
    'NOT_YET_RELEASED': 'upcoming',
    'CANCELLED': 'cancelled',
    'HIATUS': 'hiatus'
  };
  return statusMap[status] || 'ongoing';
}

/**
 * Formatea un resultado para el search unificado
 */
export function formatAniListResult(manga) {
  return {
    id: manga.id,
    title: manga.title,
    description: manga.description || '',
    coverUrl: manga.coverUrl,
    author: manga.author || 'Desconocido',
    artist: manga.artist || 'Desconocido',
    status: manga.status,
    year: manga.year,
    type: manga.type,
    tags: [...(manga.genres || []), ...(manga.tags || [])].slice(0, 5),
    score: manga.score,
    source: 'anilist',
    sourceUrl: manga.sourceUrl
  };
}
