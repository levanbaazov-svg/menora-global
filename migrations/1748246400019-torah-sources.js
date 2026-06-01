'use strict';

const { runSQL, trackAll } = require('../scripts/hasura');

exports.description = 'torah_sources — pgvector RAG store for AI Rabbi knowledge base';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE public.torah_sources (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        collection    text NOT NULL,        -- 'tanya' | 'tanakh' | 'rashi' | 'mishnah' | 'kitzur' | 'pirkei_avot' | 'midrash' ...
        ref           text NOT NULL,        -- Sefaria ref, e.g. 'Tanya, Part I, Chapter 32'
        title         text NOT NULL,        -- human label, e.g. 'Тания · Ликутей Амарим, гл. 32'
        author        text,                 -- 'Alter Rebbe', 'Rashi', 'Maimonides', ...
        category      text,                 -- 'halacha' | 'aggadah' | 'philosophy' | 'mussar' | 'chassidut' | 'tanakh'
        tags          text[] NOT NULL DEFAULT '{}',  -- 'shabbat', 'kashrut', 'teshuva', 'parsha:bereshit'...
        authority     smallint NOT NULL DEFAULT 2,   -- 1=foundational, 2=classic, 3=supplementary
        text_en       text,
        text_ru       text,
        chunk_index   integer NOT NULL DEFAULT 0,
        embedding     vector(1536),
        token_count   integer,
        created_at    timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX torah_sources_collection_idx ON public.torah_sources (collection);
      CREATE INDEX torah_sources_tags_gin ON public.torah_sources USING gin (tags);
      CREATE UNIQUE INDEX torah_sources_ref_chunk_idx ON public.torah_sources (ref, chunk_index);

      -- HNSW: higher recall, no pre-training, works from an empty table.
      CREATE INDEX torah_sources_embedding_idx ON public.torah_sources
        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

      CREATE OR REPLACE FUNCTION public.match_torah_sources(
        query_embedding vector(1536),
        match_count integer DEFAULT 5,
        filter_collection text DEFAULT NULL
      )
      RETURNS SETOF public.torah_sources
      LANGUAGE sql STABLE AS $$
        SELECT *
        FROM public.torah_sources
        WHERE filter_collection IS NULL OR collection = filter_collection
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
      $$;
    `);

    await trackAll(['torah_sources']);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP FUNCTION IF EXISTS public.match_torah_sources(vector, integer, text);
    DROP TABLE IF EXISTS public.torah_sources CASCADE;
  `).then(() => next(), next);
};
