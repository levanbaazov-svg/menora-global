// Ingest curated Chabad.org content into torah_sources for the AI Rabbi RAG.
//
// Targets the HIGH-VALUE sections that shape Chabad "spirit & patterns":
//   teachings / chassidus, Ask-the-Rabbi Q&A, stories, parshah, the Rebbe.
//   (Deliberately NOT news / recipes / store / multimedia — that's noise.)
//
// IMPORTANT — access:
//   chabad.org + api.chabad.org sit behind Cloudflare bot-protection. Plain
//   requests get a "Just a moment…" challenge (HTTP 403). This script does NOT
//   try to bypass that. To run it you need OFFICIAL access from Chabad.org
//   (your Beit Chabad is part of the network), provided as ONE of:
//     CHABAD_API_KEY=...            → sent as a header (name via CHABAD_AUTH_HEADER, default x-api-key)
//     CHABAD_COOKIE="cf_clearance=…; …"  → a whitelisted session cookie
//     CHABAD_HEADERS='{"X-Foo":"bar"}'   → arbitrary extra headers (JSON)
//   When the request still returns a Cloudflare challenge, the script stops and
//   tells you access isn't enabled yet — no scraping-around the protection.
//
// Usage:
//   node scripts/ingest-chabad.js --dry                 # crawl + extract, no embed/store
//   node scripts/ingest-chabad.js --only=qa             # one section
//   node scripts/ingest-chabad.js --lang=ru             # ru.chabad.org → text_ru
//   node scripts/ingest-chabad.js --limit=50            # cap articles per section
//   node scripts/ingest-chabad.js --file=/tmp/page.html # test the extractor on a saved page
//
// Idempotent: upserts by (ref, chunk_index); ref = canonical article URL.

'use strict';

require('dotenv').config();

const HASURA = process.env.HASURA_GRAPHQL_ENDPOINT;
const SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const OPENAI = process.env.OPENAI_API_KEY;

const SQL_URL = (HASURA || '').replace(/\/v1\/graphql\/?$/, '') + '/v2/query';
const EMBED_MODEL = 'text-embedding-3-small';

// ── CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || null;
const only = flag('only');
const lang = (flag('lang') || 'en').toLowerCase();          // en | ru
const limit = flag('limit') ? parseInt(flag('limit'), 10) : 400;
const fileMode = flag('file');
const dry = args.includes('--dry');
const force = args.includes('--force');

const BASE = lang === 'ru' ? 'https://ru.chabad.org' : 'https://www.chabad.org';

// ── Curated high-value sections ────────────────────────────────────────────
// Seed = section landing/index pages we crawl for article links. URLs/section
// roots are stable slugs; if a seed 404s after access is granted, adjust here.
// collection/category drive how chunks are tagged + retrieved.
const SECTIONS = [
  { key: 'chassidus', collection: 'chabad_chassidus', category: 'chassidut',
    seeds: ['/library/article_cdo/aid/3867/jewish/Chassidism.htm', '/chassidism'] },
  { key: 'rebbe', collection: 'chabad_rebbe', category: 'chassidut',
    seeds: ['/therebbe', '/therebbe/default_cdo/jewish/The-Rebbe.htm'] },
  { key: 'qa', collection: 'chabad_qa', category: 'qa',
    seeds: ['/library/article_cdo/aid/361921/jewish/Ask-the-Rabbi.htm', '/ask'] },
  { key: 'stories', collection: 'chabad_stories', category: 'aggadah',
    seeds: ['/library/article_cdo/aid/2592/jewish/Stories.htm', '/stories'] },
  { key: 'parshah', collection: 'chabad_parshah', category: 'tanakh',
    seeds: ['/parshah'] },
  { key: 'torah', collection: 'chabad_torah', category: 'torah',
    seeds: ['/torah-texts', '/library'] },
];

// ── HTTP with auth + Cloudflare detection ──────────────────────────────────
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function authHeaders() {
  const h = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': lang === 'ru' ? 'ru,en;q=0.8' : 'en-US,en;q=0.9',
  };
  if (process.env.CHABAD_API_KEY) h[process.env.CHABAD_AUTH_HEADER || 'x-api-key'] = process.env.CHABAD_API_KEY;
  if (process.env.CHABAD_COOKIE) h['Cookie'] = process.env.CHABAD_COOKIE;
  if (process.env.CHABAD_HEADERS) { try { Object.assign(h, JSON.parse(process.env.CHABAD_HEADERS)); } catch {} }
  return h;
}

class CloudflareError extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function looksLikeChallenge(status, body) {
  if (status === 403 || status === 503) {
    if (/just a moment|challenge-platform|cf-mitigated|cloudflare|enable javascript and cookies/i.test(body)) return true;
  }
  return false;
}

async function fetchPage(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: authHeaders(), redirect: 'follow' });
    } catch (e) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    const body = await res.text();
    if (looksLikeChallenge(res.status, body)) throw new CloudflareError(url);
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) return null;
    return body;
  }
  return null;
}

// ── HTML → text ────────────────────────────────────────────────────────────
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z]+;/gi, ' ');
}

function stripChrome(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

// Try to isolate the article body. chabad.org bodies typically live in a
// container whose class contains co_body / article-body / articleBody.
// Configurable via CHABAD_CONTENT_RE (a RegExp source). Falls back to <article>,
// then to the cleaned <body>.
function extractBody(html) {
  const cleaned = stripChrome(html);
  const custom = process.env.CHABAD_CONTENT_RE;
  const patterns = [];
  if (custom) patterns.push(new RegExp(custom, 'i'));
  patterns.push(
    /<div[^>]*class="[^"]*(?:co_body|article-?body|articleBody|content-?body)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<aside|<footer|$)/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  );
  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m && m[1] && m[1].replace(/<[^>]+>/g, '').trim().length > 200) return m[1];
  }
  const b = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return b ? b[1] : cleaned;
}

function htmlToText(html) {
  const text = decodeEntities(
    html
      .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  );
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractTitle(html) {
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (og) return decodeEntities(og[1]).trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].replace(/<[^>]+>/g, '')).trim();
  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  return t ? decodeEntities(t[1]).replace(/\s*\|\s*Chabad.*$/i, '').trim() : 'Chabad.org';
}

// Article link pattern: …/<something>_cdo/aid/<digits>/…
function extractArticleLinks(html, baseUrl) {
  const out = new Set();
  const re = /href="([^"#]*\/[a-z_]+_cdo\/aid\/\d+\/[^"#]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], baseUrl);
      const host = new URL(BASE).host;
      if (u.host === host && /\/aid\/\d+\//.test(u.pathname)) {
        u.hash = ''; out.add(u.origin + u.pathname);
      }
    } catch {}
  }
  return [...out];
}

// ── embeddings + store (same shape as ingest-torah.js) ─────────────────────
function chunkText(text, chunkWords = 220) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkWords) chunks.push(words.slice(i, i + chunkWords).join(' '));
  return chunks.filter((c) => c.trim().length > 40);
}

async function embedBatch(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

const sqlStr = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const sqlVec = (v) => `'[${v.join(',')}]'::vector`;
const sqlArr = (a) => `'{${a.map((t) => `"${String(t).replace(/"/g, '\\"')}"`).join(',')}}'`;

async function runSql(sql, readOnly = false) {
  const res = await fetch(SQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql, read_only: readOnly } }),
  });
  if (!res.ok) throw new Error(`run_sql ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function existingRefs() {
  const j = await runSql("SELECT DISTINCT ref FROM public.torah_sources WHERE collection LIKE 'chabad_%';", true);
  return new Set((j.result || []).slice(1).map((r) => r[0]));
}

async function storeChunks(rows) {
  if (!rows.length) return;
  const textCol = lang === 'ru' ? 'text_ru' : 'text_en';
  const values = rows.map((r) =>
    `(${sqlStr(r.collection)}, ${sqlStr(r.ref)}, ${sqlStr(r.title)}, ${sqlStr('Chabad.org')}, ` +
    `${sqlStr(r.category)}, ${sqlArr(r.tags)}, 2, ${sqlStr(r.text)}, ${r.chunk_index}, ` +
    `${sqlVec(r.embedding)}, ${r.token_count})`).join(',\n');
  const sql = `
    INSERT INTO public.torah_sources
      (collection, ref, title, author, category, tags, authority, ${textCol}, chunk_index, embedding, token_count)
    VALUES ${values}
    ON CONFLICT (ref, chunk_index) DO UPDATE SET
      ${textCol} = EXCLUDED.${textCol}, embedding = EXCLUDED.embedding, title = EXCLUDED.title;`;
  await runSql(sql);
}

// ── crawl one section ──────────────────────────────────────────────────────
async function crawlSection(sec, done) {
  console.log(`\n=== ${sec.key} (${sec.collection}) ===`);
  const seen = new Set();
  const queue = sec.seeds.map((s) => new URL(s, BASE).href);
  const articles = new Set();

  // BFS over section index pages, collecting article links (cap at limit).
  while (queue.length && articles.size < limit) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const html = await fetchPage(url);
    await sleep(600);
    if (!html) { process.stdout.write('x'); continue; }
    for (const link of extractArticleLinks(html, url)) {
      if (!articles.has(link)) articles.add(link);
      if (articles.size >= limit) break;
    }
    process.stdout.write('.');
  }
  console.log(`\n  found ${articles.size} article URLs`);

  let stored = 0;
  for (const url of articles) {
    if (done.has(url) && !force) { process.stdout.write('·'); continue; }
    const html = await fetchPage(url);
    await sleep(700);
    if (!html) { process.stdout.write('x'); continue; }
    const title = extractTitle(html);
    const text = htmlToText(extractBody(html));
    if (text.length < 250) { process.stdout.write('o'); continue; }
    const chunks = chunkText(text);
    if (dry) { process.stdout.write(`(${chunks.length})`); continue; }
    let embs;
    try { embs = await embedBatch(chunks); } catch (e) { console.error(`\n  embed fail ${url}: ${e.message}`); continue; }
    const rows = chunks.map((c, i) => ({
      collection: sec.collection, ref: url,
      title: chunks.length > 1 ? `${title} (${i + 1})` : title,
      category: sec.category, tags: [sec.key, lang],
      text: c.slice(0, 8000), chunk_index: i, embedding: embs[i],
      token_count: Math.round(c.split(/\s+/).length * 1.3),
    }));
    try { await storeChunks(rows); stored += rows.length; process.stdout.write('✓'); }
    catch (e) { console.error(`\n  store fail ${url}: ${e.message}`); }
  }
  console.log(`\n  stored ${stored} chunks`);
  return stored;
}

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  // Extraction test mode — tune the body selector against a saved page.
  if (fileMode) {
    const fs = require('fs');
    const html = fs.readFileSync(fileMode, 'utf8');
    console.log('TITLE:', extractTitle(html));
    const text = htmlToText(extractBody(html));
    console.log('CHARS:', text.length, '\nSAMPLE:\n', text.slice(0, 600));
    console.log('\nARTICLE LINKS:', extractArticleLinks(html, BASE).slice(0, 10));
    return;
  }

  if (!HASURA || !SECRET) { console.error('HASURA env required'); process.exit(1); }
  if (!dry && !OPENAI) { console.error('OPENAI_API_KEY required (or use --dry)'); process.exit(1); }

  // Preflight: confirm access is actually enabled before crawling.
  try {
    await fetchPage(BASE + '/');
    console.log(`✅ ${BASE} reachable — access looks enabled.`);
  } catch (e) {
    if (e instanceof CloudflareError) {
      console.error(`\n⛔ Blocked by Cloudflare bot-protection at ${BASE}.`);
      console.error('   Official access is not enabled yet. Ask Chabad.org to whitelist this');
      console.error('   server/IP or issue an API key, then set ONE of:');
      console.error('     CHABAD_API_KEY=...   (header name via CHABAD_AUTH_HEADER, default x-api-key)');
      console.error('     CHABAD_COOKIE="cf_clearance=...; ..."');
      console.error('     CHABAD_HEADERS=\'{"X-...":"..."}\'');
      console.error('   This script will not bypass the challenge.');
      process.exit(2);
    }
    throw e;
  }

  const done = force ? new Set() : await existingRefs();
  console.log(`Already stored chabad refs: ${done.size}`);
  const sections = only ? SECTIONS.filter((s) => s.key === only) : SECTIONS;

  let total = 0;
  for (const sec of sections) {
    try { total += await crawlSection(sec, done); }
    catch (e) {
      if (e instanceof CloudflareError) { console.error(`\n⛔ Cloudflare challenge mid-run at ${e.message} — stopping.`); break; }
      console.error(`\n  section ${sec.key} failed: ${e.message}`);
    }
  }
  console.log(`\n\n✅ Done. Stored ${total} new chunks from ${BASE}.`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
