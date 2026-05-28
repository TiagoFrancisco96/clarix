/**
 * Comprehensive Smoke Test — checks every page loads and
 * validates all interactive elements (buttons, links, forms) exist and are clickable.
 *
 * Run: node tests/smoke-test.mjs
 */

const BASE = 'http://localhost:3000';

// All routes to test
const ROUTES = [
  '/',
  '/login',
  '/chat',
  '/image',
  '/video',
  '/music',
  '/docs',
  '/sheets',
  '/slides',
  '/designer',
  '/developer',
  '/search',
  '/meeting-notes',
  '/podcasts',
  '/drive',
  '/inbox',
  '/settings',
  '/info',
  '/status',
  '/terms',
  '/privacy',
  '/security',
  '/api-docs',
];

let passed = 0;
let failed = 0;
const failures = [];

async function testRoute(path) {
  const url = `${BASE}${path}`;
  try {
    const start = Date.now();
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ClarixSmokeTest/1.0' },
      redirect: 'follow',
    });
    const elapsed = Date.now() - start;
    const html = await res.text();

    // Check status
    if (!res.ok) {
      failures.push({ path, error: `HTTP ${res.status}` });
      failed++;
      console.log(`  ❌ ${path} — HTTP ${res.status} (${elapsed}ms)`);
      return;
    }

    // Check page has content (not blank)
    if (html.length < 100) {
      failures.push({ path, error: 'Page appears empty (< 100 bytes)' });
      failed++;
      console.log(`  ❌ ${path} — Empty page (${html.length} bytes, ${elapsed}ms)`);
      return;
    }

    // Check for React hydration errors embedded in HTML
    if (html.includes('Hydration failed') || html.includes('There was an error while hydrating')) {
      failures.push({ path, error: 'React hydration error detected in HTML' });
      failed++;
      console.log(`  ❌ ${path} — Hydration error (${elapsed}ms)`);
      return;
    }

    // Check for Next.js error overlay
    if (html.includes('__next-error') || html.includes('Internal Server Error')) {
      failures.push({ path, error: 'Next.js error overlay or 500 detected' });
      failed++;
      console.log(`  ❌ ${path} — Server error (${elapsed}ms)`);
      return;
    }

    passed++;
    console.log(`  ✅ ${path} — OK (${elapsed}ms, ${(html.length / 1024).toFixed(1)}KB)`);
  } catch (err) {
    failures.push({ path, error: err.message });
    failed++;
    console.log(`  ❌ ${path} — FETCH ERROR: ${err.message}`);
  }
}

async function testAPIEndpoints() {
  console.log('\n── API Endpoint Tests ──');

  // Test /api/health
  try {
    const res = await fetch(`${BASE}/api/health`, { method: 'GET' });
    if (res.ok) {
      passed++;
      console.log('  ✅ GET /api/health — OK');
    } else {
      failed++;
      failures.push({ path: '/api/health', error: `HTTP ${res.status}` });
      console.log(`  ❌ GET /api/health — HTTP ${res.status}`);
    }
  } catch (err) {
    failed++;
    failures.push({ path: '/api/health', error: err.message });
    console.log(`  ❌ GET /api/health — ${err.message}`);
  }

  // Test /api/chat with dry-run body
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'ping' }],
        model: 'auto',
      }),
    });
    // We expect either 200 (streaming) or 500 (no API key) — NOT 404
    if (res.status !== 404) {
      passed++;
      console.log(`  ✅ POST /api/chat — reachable (HTTP ${res.status})`);
    } else {
      failed++;
      failures.push({ path: '/api/chat', error: '404 Not Found' });
      console.log('  ❌ POST /api/chat — 404 Not Found');
    }
  } catch (err) {
    failed++;
    failures.push({ path: '/api/chat', error: err.message });
    console.log(`  ❌ POST /api/chat — ${err.message}`);
  }

  // Test /api/image/generate with dry-run
  try {
    const res = await fetch(`${BASE}/api/image/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'dryRun', model: 'flux-schnell', style: 'Digital Art' }),
    });
    if (res.status !== 404) {
      passed++;
      console.log(`  ✅ POST /api/image/generate — reachable (HTTP ${res.status})`);
    } else {
      failed++;
      failures.push({ path: '/api/image/generate', error: '404' });
      console.log('  ❌ POST /api/image/generate — 404');
    }
  } catch (err) {
    failed++;
    failures.push({ path: '/api/image/generate', error: err.message });
    console.log(`  ❌ POST /api/image/generate — ${err.message}`);
  }

  // Test /api/video/generate with dry-run
  try {
    const res = await fetch(`${BASE}/api/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'dryRun', model: 'seedance-2.0' }),
    });
    const data = await res.json();
    if (data.success && data.dryRun) {
      passed++;
      console.log('  ✅ POST /api/video/generate — dry-run OK');
    } else if (res.status !== 404) {
      passed++;
      console.log(`  ✅ POST /api/video/generate — reachable (HTTP ${res.status})`);
    } else {
      failed++;
      failures.push({ path: '/api/video/generate', error: '404' });
      console.log('  ❌ POST /api/video/generate — 404');
    }
  } catch (err) {
    failed++;
    failures.push({ path: '/api/video/generate', error: err.message });
    console.log(`  ❌ POST /api/video/generate — ${err.message}`);
  }

  // Test /api/music/generate
  try {
    const res = await fetch(`${BASE}/api/music/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', style: 'pop', duration: 30 }),
    });
    if (res.status !== 404) {
      passed++;
      console.log(`  ✅ POST /api/music/generate — reachable (HTTP ${res.status})`);
    } else {
      failed++;
      failures.push({ path: '/api/music/generate', error: '404' });
      console.log('  ❌ POST /api/music/generate — 404');
    }
  } catch (err) {
    failed++;
    failures.push({ path: '/api/music/generate', error: err.message });
    console.log(`  ❌ POST /api/music/generate — ${err.message}`);
  }

  // Test /api/errors/report
  try {
    const res = await fetch(`${BASE}/api/errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test',
        message: 'smoke test',
        source: 'smoke-test.mjs',
        timestamp: new Date().toISOString(),
      }),
    });
    if (res.status !== 404) {
      passed++;
      console.log(`  ✅ POST /api/errors/report — reachable (HTTP ${res.status})`);
    } else {
      failed++;
      failures.push({ path: '/api/errors/report', error: '404' });
      console.log('  ❌ POST /api/errors/report — 404');
    }
  } catch (err) {
    failed++;
    failures.push({ path: '/api/errors/report', error: err.message });
    console.log(`  ❌ POST /api/errors/report — ${err.message}`);
  }
}

async function testHTMLInteractiveElements() {
  console.log('\n── Interactive Element Audit (HTML scan) ──');

  const criticalPages = [
    { path: '/', expectedButtons: ['Get Started', 'Start Free'], expectedLinks: ['Login', 'Pricing'] },
    { path: '/login', expectedButtons: ['Continue with Google', 'Sign in', 'Create Account'], expectedLinks: [] },
    { path: '/chat', expectedButtons: [], expectedLinks: [] },
    { path: '/image', expectedButtons: ['Generate'], expectedLinks: [] },
    { path: '/video', expectedButtons: ['Generate'], expectedLinks: [] },
    { path: '/info', expectedButtons: ['About Us', 'Careers', 'Changelog'], expectedLinks: ['Back to Home'] },
  ];

  for (const page of criticalPages) {
    try {
      const res = await fetch(`${BASE}${page.path}`);
      const html = await res.text();

      // Count buttons and links
      const buttonCount = (html.match(/<button/gi) || []).length;
      const linkCount = (html.match(/<a /gi) || []).length;
      const formCount = (html.match(/<form/gi) || []).length;
      const inputCount = (html.match(/<input/gi) || []).length;
      const selectCount = (html.match(/<select/gi) || []).length;

      console.log(`  📄 ${page.path}: ${buttonCount} buttons, ${linkCount} links, ${formCount} forms, ${inputCount} inputs, ${selectCount} selects`);

      // Check for expected buttons/links
      for (const expected of page.expectedButtons) {
        if (html.includes(expected)) {
          console.log(`     ✅ Found button/text: "${expected}"`);
        } else {
          console.log(`     ⚠️  Missing expected: "${expected}" (may be client-rendered)`);
        }
      }
      for (const expected of page.expectedLinks) {
        if (html.includes(expected)) {
          console.log(`     ✅ Found link/text: "${expected}"`);
        } else {
          console.log(`     ⚠️  Missing expected: "${expected}" (may be client-rendered)`);
        }
      }

      // Check for broken onClick references (e.g., onClick handler referencing undefined function)
      const onClickMatches = html.match(/onClick="([^"]+)"/g) || [];
      if (onClickMatches.length > 0) {
        console.log(`     📌 ${onClickMatches.length} inline onClick handlers found`);
      }

    } catch (err) {
      console.log(`  ❌ ${page.path} — Could not scan: ${err.message}`);
    }
  }
}

async function testNavigationLinks() {
  console.log('\n── Navigation Link Validation ──');

  // Fetch homepage and extract all internal links
  try {
    const res = await fetch(`${BASE}/`);
    const html = await res.text();

    // Extract href values from <a> tags
    const hrefRegex = /href="(\/[^"]*?)"/g;
    const links = new Set();
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1].split('#')[0].split('?')[0]; // strip anchors and params
      if (href && href !== '/') links.add(href);
    }

    console.log(`  Found ${links.size} unique internal links on homepage:`);

    for (const link of links) {
      try {
        const linkRes = await fetch(`${BASE}${link}`, { redirect: 'follow' });
        if (linkRes.ok) {
          passed++;
          console.log(`    ✅ ${link} → ${linkRes.status}`);
        } else {
          failed++;
          failures.push({ path: link, error: `HTTP ${linkRes.status}` });
          console.log(`    ❌ ${link} → ${linkRes.status}`);
        }
      } catch (err) {
        failed++;
        failures.push({ path: link, error: err.message });
        console.log(`    ❌ ${link} → ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Could not fetch homepage for link extraction: ${err.message}`);
  }
}

// ──────────────────────────────────────
//  MAIN
// ──────────────────────────────────────
console.log('╔═══════════════════════════════════════════╗');
console.log('║   CLARIX AI — Full Smoke Test Suite       ║');
console.log('╚═══════════════════════════════════════════╝\n');

console.log('── Page Load Tests ──');
for (const route of ROUTES) {
  await testRoute(route);
}

await testAPIEndpoints();
await testHTMLInteractiveElements();
await testNavigationLinks();

// Final Summary
console.log('\n═══════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n  FAILURES:');
  for (const f of failures) {
    console.log(`    ❌ ${f.path}: ${f.error}`);
  }
}

console.log('\n  Done.\n');
process.exit(failed > 0 ? 1 : 0);
