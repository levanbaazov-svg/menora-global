// Lightweight load test against the Hasura GraphQL endpoint.
//
// Fires N requests at a fixed concurrency, simulating the dashboard's
// per-navigation read, and reports latency percentiles + error rate. Useful to
// see how the current Hasura Cloud / Neon tier holds up before going to prod.
//
// Usage:
//   node scripts/load-test.js                 # 100 reqs, concurrency 10
//   node scripts/load-test.js --n=300 --c=30  # heavier

'use strict';
require('dotenv').config();

const H = process.env.HASURA_GRAPHQL_ENDPOINT;
const SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

const args = process.argv.slice(2);
const N = parseInt((args.find((a) => a.startsWith('--n=')) || '').split('=')[1] || '100', 10);
const C = parseInt((args.find((a) => a.startsWith('--c=')) || '').split('=')[1] || '10', 10);

// Representative dashboard-home read (community + a couple of lists).
const QUERY = /* GraphQL */ `
  query LoadProbe {
    communities(where: { is_public: { _eq: true } }, limit: 8) { id name member_count_cached }
    events(limit: 5, order_by: { starts_at: asc }) { id title }
    interest_groups(limit: 5) { id name }
  }
`;

async function once() {
  const t0 = Date.now();
  try {
    const r = await fetch(H, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hasura-Admin-Secret': SECRET },
      body: JSON.stringify({ query: QUERY }),
    });
    const j = await r.json();
    return { ms: Date.now() - t0, ok: r.ok && !j.errors };
  } catch {
    return { ms: Date.now() - t0, ok: false };
  }
}

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

(async () => {
  if (!H || !SECRET) { console.error('HASURA env required'); process.exit(1); }
  console.log(`Load test: ${N} requests, concurrency ${C}\nTarget: ${H.replace(/\/\/.*@/, '//')}\n`);

  const results = [];
  let inFlight = 0, started = 0;
  const wallStart = Date.now();

  await new Promise((resolve) => {
    const pump = () => {
      while (inFlight < C && started < N) {
        started++; inFlight++;
        once().then((res) => {
          results.push(res);
          inFlight--;
          if (results.length % Math.max(1, Math.floor(N / 20)) === 0) process.stdout.write('.');
          if (results.length === N) resolve();
          else pump();
        });
      }
    };
    pump();
  });

  const wall = Date.now() - wallStart;
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok).length;
  const avg = Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);

  console.log('\n\n── Results ──────────────────────────');
  console.log(`requests:    ${N}  (concurrency ${C})`);
  console.log(`wall time:   ${wall} ms`);
  console.log(`throughput:  ${(N / (wall / 1000)).toFixed(1)} req/s`);
  console.log(`errors:      ${errors} (${((errors / N) * 100).toFixed(1)}%)`);
  console.log(`latency avg: ${avg} ms`);
  console.log(`  p50 ${pct(lat, 50)}  p95 ${pct(lat, 95)}  p99 ${pct(lat, 99)}  max ${lat[lat.length - 1]} ms`);
})();
