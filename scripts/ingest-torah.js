// Ingest Jewish texts from the Sefaria API into torah_sources with embeddings.
//
// Usage:
//   node scripts/ingest-torah.js                 # ingest the full Phase-1 list
//   node scripts/ingest-torah.js --only=tanya    # one collection
//   node scripts/ingest-torah.js --dry           # fetch + chunk, no embed/store
//
// Idempotent: upserts by (ref, chunk_index). Re-runnable; skips already-stored
// chunks unless --force.

'use strict';

require('dotenv').config();

const HASURA = process.env.HASURA_GRAPHQL_ENDPOINT;
const SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const OPENAI = process.env.OPENAI_API_KEY;
if (!HASURA || !SECRET) { console.error('HASURA env required'); process.exit(1); }

const SQL_URL = HASURA.replace(/\/v1\/graphql\/?$/, '') + '/v2/query';
const SEFARIA = 'https://www.sefaria.org/api/v3/texts';
const EMBED_MODEL = 'text-embedding-3-small';

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;
const dry = args.includes('--dry');
const force = args.includes('--force');

// ── Phase 1 source list ──────────────────────────────────────────────────
// Each entry: how to enumerate refs from Sefaria + metadata for the chunks.
const SOURCES = [
  // Chumash — 5 books, fetched per chapter
  { collection: 'tanakh', author: 'Tanakh', category: 'tanakh', authority: 1,
    titleRu: 'Тора', books: ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy'],
    chapters: { Genesis:50, Exodus:40, Leviticus:27, Numbers:36, Deuteronomy:34 } },
  // Rashi on Torah
  { collection: 'rashi', author: 'Rashi', category: 'tanakh', authority: 1,
    titleRu: 'Раши на Тору', books: ['Rashi on Genesis','Rashi on Exodus','Rashi on Leviticus','Rashi on Numbers','Rashi on Deuteronomy'],
    chapters: { 'Rashi on Genesis':50, 'Rashi on Exodus':40, 'Rashi on Leviticus':27, 'Rashi on Numbers':36, 'Rashi on Deuteronomy':34 } },
  // Tanya
  { collection: 'tanya', author: 'Alter Rebbe', category: 'chassidut', authority: 1,
    titleRu: 'Тания', simpleRefs: tanyaRefs() },
  // Pirkei Avot — 6 chapters
  { collection: 'pirkei_avot', author: 'Mishnah', category: 'mussar', authority: 1,
    titleRu: 'Пиркей Авот', simpleRefs: rangeRefs('Pirkei Avot', 6) },
  // Kitzur Shulchan Aruch — 221 simanim
  { collection: 'kitzur', author: 'Rabbi Shlomo Ganzfried', category: 'halacha', authority: 1,
    titleRu: 'Кицур Шулхан Арух', simpleRefs: rangeRefs('Kitzur Shulchan Arukh', 221) },
  // Mishnah Berakhot (9) + Shabbat (24)
  { collection: 'mishnah', author: 'Mishnah', category: 'halacha', authority: 1,
    titleRu: 'Мишна Брахот', simpleRefs: rangeRefs('Mishnah Berakhot', 9) },
  { collection: 'mishnah', author: 'Mishnah', category: 'halacha', authority: 1,
    titleRu: 'Мишна Шаббат', simpleRefs: rangeRefs('Mishnah Shabbat', 24) },
  // Tehillim — 150 psalms
  { collection: 'tanakh', author: 'Tanakh', category: 'tanakh', authority: 1,
    titleRu: 'Теилим (Псалмы)', simpleRefs: rangeRefs('Psalms', 150) },
  // Bereshit Rabbah — 100 sections
  { collection: 'midrash', author: 'Midrash', category: 'aggadah', authority: 2,
    titleRu: 'Берешит Рабба', simpleRefs: rangeRefs('Bereshit Rabbah', 100) },
];

function rangeRefs(base, n) {
  return Array.from({ length: n }, (_, i) => `${base} ${i + 1}`);
}
function tanyaRefs() {
  // Likutei Amarim 1-53 + Shaar HaYichud (12) + Iggeret HaTeshuvah (12)
  return [
    ...Array.from({ length: 53 }, (_, i) => `Tanya, Part I, Chapter ${i + 1}`),
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchSefaria(ref) {
  // v3 API: request the English translation explicitly (the default version is
  // often Hebrew, which would pollute text_en).
  const url = `${SEFARIA}/${encodeURIComponent(ref)}?version=english&return_format=text_only`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(1000 * (attempt + 1));
    }
  }
  return null;
}

// Extract flat array of English segment strings from a v3 response.
function extractSegments(json) {
  if (!json || !json.versions || json.versions.length === 0) return [];
  // Prefer an English version.
  const en = json.versions.find((v) => v.language === 'en') || json.versions[0];
  let text = en.text;
  // text can be nested arrays; flatten to strings
  const out = [];
  const walk = (t) => {
    if (typeof t === 'string') { if (t.trim()) out.push(stripHtml(t)); }
    else if (Array.isArray(t)) t.forEach(walk);
  };
  walk(text);
  return out;
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

// Merge short segments into ~chunkWords-sized chunks, respecting segment
// boundaries (never split a segment).
function chunkSegments(segments, chunkWords = 220) {
  const chunks = [];
  let buf = [];
  let count = 0;
  for (const seg of segments) {
    const w = seg.split(/\s+/).length;
    if (count + w > chunkWords && buf.length > 0) {
      chunks.push(buf.join(' '));
      buf = []; count = 0;
    }
    buf.push(seg);
    count += w;
  }
  if (buf.length > 0) chunks.push(buf.join(' '));
  return chunks;
}

async function embedBatch(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

function sqlStr(s) { return s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`; }
function sqlVec(v) { return `'[${v.join(',')}]'::vector`; }
function sqlArr(a) { return `'{${a.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(',')}}'`; }

async function storeChunks(rows) {
  if (rows.length === 0) return;
  const values = rows.map((r) =>
    `(${sqlStr(r.collection)}, ${sqlStr(r.ref)}, ${sqlStr(r.title)}, ${sqlStr(r.author)}, ` +
    `${sqlStr(r.category)}, ${sqlArr(r.tags)}, ${r.authority}, ${sqlStr(r.text_en)}, ` +
    `${r.chunk_index}, ${sqlVec(r.embedding)}, ${r.token_count})`,
  ).join(',\n');

  const sql = `
    INSERT INTO public.torah_sources
      (collection, ref, title, author, category, tags, authority, text_en, chunk_index, embedding, token_count)
    VALUES ${values}
    ON CONFLICT (ref, chunk_index) DO UPDATE SET
      text_en = EXCLUDED.text_en, embedding = EXCLUDED.embedding,
      title = EXCLUDED.title, tags = EXCLUDED.tags;
  `;
  const res = await fetch(SQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql } }),
  });
  if (!res.ok) throw new Error(`store ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function existingRefs() {
  const res = await fetch(SQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', read_only: true,
      sql: 'SELECT DISTINCT ref FROM public.torah_sources;' } }),
  });
  const json = await res.json();
  const rows = json.result ?? [];
  return new Set(rows.slice(1).map((r) => r[0]));
}

// ── Enumerate refs for a source ──────────────────────────────────────────
function enumerateRefs(src) {
  if (src.simpleRefs) return src.simpleRefs.map((ref) => ({ ref, titleRu: src.titleRu }));
  // book + chapters
  const refs = [];
  for (const book of src.books) {
    const n = src.chapters[book];
    for (let ch = 1; ch <= n; ch++) refs.push({ ref: `${book} ${ch}`, titleRu: `${src.titleRu}, гл. ${ch}` });
  }
  return refs;
}

// ── Main ────────────────────────────────────────────────────────────────
(async () => {
  if (!dry && !OPENAI) { console.error('OPENAI_API_KEY required (or use --dry)'); process.exit(1); }

  const done = force ? new Set() : await existingRefs();
  console.log(`Already stored refs: ${done.size}`);

  let totalChunks = 0, totalEmbedded = 0;
  const sources = only ? SOURCES.filter((s) => s.collection === only) : SOURCES;

  for (const src of sources) {
    const refs = enumerateRefs(src);
    console.log(`\n=== ${src.titleRu} (${src.collection}) — ${refs.length} refs ===`);

    for (const { ref, titleRu } of refs) {
      if (done.has(ref)) { process.stdout.write('·'); continue; }

      const json = await fetchSefaria(ref);
      await sleep(350); // be polite to Sefaria
      if (!json) { process.stdout.write('x'); continue; }

      const segments = extractSegments(json);
      if (segments.length === 0) { process.stdout.write('o'); continue; }

      const chunks = chunkSegments(segments);
      totalChunks += chunks.length;

      if (dry) { process.stdout.write(`(${chunks.length})`); continue; }

      // Embed all chunks for this ref in one batch
      let embeddings;
      try {
        embeddings = await embedBatch(chunks);
      } catch (e) {
        console.error(`\n  embed fail ${ref}: ${e.message}`);
        continue;
      }

      const rows = chunks.map((text, i) => ({
        collection: src.collection,
        ref,
        title: chunks.length > 1 ? `${titleRu} (${i + 1})` : titleRu,
        author: src.author,
        category: src.category,
        tags: src.tags || [],
        authority: src.authority,
        text_en: text.slice(0, 8000),
        chunk_index: i,
        embedding: embeddings[i],
        token_count: Math.round(text.split(/\s+/).length * 1.3),
      }));

      try {
        await storeChunks(rows);
        totalEmbedded += rows.length;
        process.stdout.write('✓');
      } catch (e) {
        console.error(`\n  store fail ${ref}: ${e.message}`);
      }
    }
  }

  console.log(`\n\n✅ Done. Chunks seen: ${totalChunks}, embedded+stored: ${totalEmbedded}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
