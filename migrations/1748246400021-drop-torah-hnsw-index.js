'use strict';

const { runSQL } = require('../scripts/hasura');

// The HNSW index on torah_sources.embedding had poor recall at our corpus size
// (~12k rows): exact nearest neighbours (incl. the community rabbi's own talks)
// were being skipped by the approximate search, and raising hnsw.ef_search via
// Hasura's run_sql (fresh connection per request) didn't reliably apply.
//
// At this scale an exact KNN scan is only a few milliseconds and guarantees
// correct retrieval, so we drop the index. If the corpus grows to 100k+ rows,
// re-add HNSW with higher ef_construction/m AND a tuned hnsw.ef_search on a
// persistent pooled connection.

exports.description = 'drop torah_sources HNSW index (use exact KNN for correct recall)';

exports.up = (next) => {
  runSQL('DROP INDEX IF EXISTS torah_sources_embedding_idx;').then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    CREATE INDEX IF NOT EXISTS torah_sources_embedding_idx ON public.torah_sources
      USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
  `).then(() => next(), next);
};
