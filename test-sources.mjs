/**
 * Test de todas las fuentes implementadas
 */

import fetch from 'node-fetch';

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// ============ TEST ANILIST ============
async function testAniList() {
  log(colors.blue, '\n=== Testing AniList API ===');

  const query = `
    query ($search: String) {
      Page(perPage: 5) {
        media(search: $search, type: MANGA) {
          id
          title { romaji english }
          coverImage { large }
          format
          status
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: 'naruto' } })
    });

    const data = await response.json();

    if (data.data?.Page?.media?.length > 0) {
      log(colors.green, '✓ AniList: OK');
      console.log(`  Found ${data.data.Page.media.length} results`);
      console.log(`  First: ${data.data.Page.media[0].title.romaji}`);
      return true;
    } else {
      log(colors.red, '✗ AniList: No results');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ AniList ERROR:', error.message);
    return false;
  }
}

// ============ TEST JIKAN ============
async function testJikan() {
  log(colors.blue, '\n=== Testing Jikan API ===');

  try {
    const response = await fetch('https://api.jikan.moe/v4/manga?q=one+piece&limit=5');
    const data = await response.json();

    if (data.data?.length > 0) {
      log(colors.green, '✓ Jikan: OK');
      console.log(`  Found ${data.data.length} results`);
      console.log(`  First: ${data.data[0].title}`);
      return true;
    } else {
      log(colors.red, '✗ Jikan: No results');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ Jikan ERROR:', error.message);
    return false;
  }
}

// ============ TEST VISORMANGA ============
async function testVisorManga() {
  log(colors.blue, '\n=== Testing VisorManga ===');

  try {
    const response = await fetch('https://visormanga.com/biblioteca?search=solo', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      log(colors.red, `✗ VisorManga: HTTP ${response.status}`);
      return false;
    }

    const html = await response.text();
    const matches = html.match(/href="https:\/\/visormanga\.com\/manga\/[^"]+"/g) || [];

    if (matches.length > 0) {
      log(colors.green, '✓ VisorManga: OK');
      console.log(`  Found ${matches.length} manga links`);
      // Extraer primer título
      const firstMatch = matches[0].match(/manga\/([^"]+)/);
      if (firstMatch) console.log(`  First: ${firstMatch[1]}`);
      return true;
    } else {
      log(colors.yellow, '⚠ VisorManga: No manga links found (might be protected)');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ VisorManga ERROR:', error.message);
    return false;
  }
}

// ============ TEST MANGALECTOR ============
async function testMangaLector() {
  log(colors.blue, '\n=== Testing MangaLector ===');

  try {
    const response = await fetch('https://mangalector.com/search?s=tower', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      log(colors.red, `✗ MangaLector: HTTP ${response.status}`);
      return false;
    }

    const html = await response.text();
    const matches = html.match(/href="https:\/\/mangalector\.com\/manga\/[^"]+"/g) || [];

    if (matches.length > 0) {
      log(colors.green, '✓ MangaLector: OK');
      console.log(`  Found ${matches.length} manga links`);
      const firstMatch = matches[0].match(/manga\/([^"]+)/);
      if (firstMatch) console.log(`  First: ${firstMatch[1]}`);
      return true;
    } else {
      log(colors.yellow, '⚠ MangaLector: No manga links found');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ MangaLector ERROR:', error.message);
    return false;
  }
}

// ============ TEST TUMANGA ============
async function testTuManga() {
  log(colors.blue, '\n=== Testing TuManga ===');

  try {
    const response = await fetch('https://tumanga.org/biblioteca?title=solo', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      log(colors.red, `✗ TuManga: HTTP ${response.status}`);
      return false;
    }

    const html = await response.text();
    const matches = html.match(/href="\/online\/[^"]+"/g) || [];

    if (matches.length > 0) {
      log(colors.green, '✓ TuManga: OK');
      console.log(`  Found ${matches.length} manga links`);
      return true;
    } else {
      log(colors.yellow, '⚠ TuManga: No manga links found');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ TuManga ERROR:', error.message);
    return false;
  }
}

// ============ TEST WEBTOONS ============
async function testWebtoons() {
  log(colors.blue, '\n=== Testing Webtoons ===');

  try {
    const response = await fetch('https://www.webtoons.com/es/search?keyword=tower', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      }
    });

    if (!response.ok) {
      log(colors.red, `✗ Webtoons: HTTP ${response.status}`);
      return false;
    }

    const html = await response.text();
    const matches = html.match(/title_no=\d+/g) || [];

    if (matches.length > 0) {
      log(colors.green, '✓ Webtoons: OK');
      console.log(`  Found ${matches.length} title references`);
      return true;
    } else {
      log(colors.yellow, '⚠ Webtoons: No titles found');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ Webtoons ERROR:', error.message);
    return false;
  }
}

// ============ TEST MANGADEX ============
async function testMangaDex() {
  log(colors.blue, '\n=== Testing MangaDex API ===');

  try {
    const response = await fetch('https://api.mangadex.org/manga?title=naruto&limit=5');
    const data = await response.json();

    if (data.data?.length > 0) {
      log(colors.green, '✓ MangaDex: OK');
      console.log(`  Found ${data.data.length} results`);
      const title = data.data[0].attributes.title.en || Object.values(data.data[0].attributes.title)[0];
      console.log(`  First: ${title}`);
      return true;
    } else {
      log(colors.red, '✗ MangaDex: No results');
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ MangaDex ERROR:', error.message);
    return false;
  }
}

// ============ RUN ALL TESTS ============
async function runAllTests() {
  console.log('🧪 Starting source tests...\n');
  console.log('=' .repeat(50));

  const results = {
    anilist: await testAniList(),
    jikan: await testJikan(),
    visormanga: await testVisorManga(),
    mangalector: await testMangaLector(),
    tumanga: await testTuManga(),
    webtoons: await testWebtoons(),
    mangadex: await testMangaDex()
  };

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 RESULTS SUMMARY:');
  console.log('-'.repeat(30));

  let passed = 0;
  let failed = 0;

  for (const [source, ok] of Object.entries(results)) {
    if (ok) {
      log(colors.green, `  ✓ ${source}`);
      passed++;
    } else {
      log(colors.red, `  ✗ ${source}`);
      failed++;
    }
  }

  console.log('-'.repeat(30));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    log(colors.green, '\n🎉 All tests passed!');
  } else {
    log(colors.yellow, `\n⚠ ${failed} source(s) may need attention`);
  }
}

runAllTests().catch(console.error);
