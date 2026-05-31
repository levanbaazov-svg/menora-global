'use strict';

const { runSQL } = require('../scripts/hasura');

exports.description = 'enrich communities with profile fields (description, hero, contacts, address, denomination, is_public)';

exports.up = (next) => {
  (async () => {
    await runSQL(`
      ALTER TABLE public.communities
        ADD COLUMN description     text,
        ADD COLUMN hero_image_url  text,
        ADD COLUMN founded_year    integer,
        ADD COLUMN denomination    text,        -- 'Chabad', 'Modern Orthodox', 'Reform', ...
        ADD COLUMN address         text,
        ADD COLUMN contact_phone   text,
        ADD COLUMN contact_email   text,
        ADD COLUMN website_url     text,
        ADD COLUMN whatsapp_url    text,
        ADD COLUMN instagram_url   text,
        ADD COLUMN is_public       boolean NOT NULL DEFAULT true,  -- shows in discover feed
        ADD COLUMN member_count_cached integer NOT NULL DEFAULT 0;

      -- Recalc cached member count when active memberships change.
      CREATE OR REPLACE FUNCTION public.recalc_community_member_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        target_community uuid;
      BEGIN
        target_community := COALESCE(NEW.community_id, OLD.community_id);
        UPDATE public.communities SET member_count_cached = (
          SELECT COUNT(*) FROM public.memberships
          WHERE community_id = target_community AND status = 'active'
        )
        WHERE id = target_community;
        RETURN COALESCE(NEW, OLD);
      END;
      $$;

      CREATE TRIGGER memberships_recalc_community_count
      AFTER INSERT OR UPDATE OR DELETE ON public.memberships
      FOR EACH ROW EXECUTE FUNCTION public.recalc_community_member_count();

      -- Backfill existing counts.
      UPDATE public.communities c SET member_count_cached = (
        SELECT COUNT(*) FROM public.memberships m
        WHERE m.community_id = c.id AND m.status = 'active'
      );

      CREATE INDEX communities_is_public_idx ON public.communities (is_public) WHERE is_public = true;
      CREATE INDEX communities_city_idx ON public.communities (city);
    `);
  })().then(() => next(), next);
};

exports.down = (next) => {
  runSQL(`
    DROP TRIGGER IF EXISTS memberships_recalc_community_count ON public.memberships;
    DROP FUNCTION IF EXISTS public.recalc_community_member_count();
    DROP INDEX IF EXISTS public.communities_is_public_idx;
    DROP INDEX IF EXISTS public.communities_city_idx;
    ALTER TABLE public.communities
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS hero_image_url,
      DROP COLUMN IF EXISTS founded_year,
      DROP COLUMN IF EXISTS denomination,
      DROP COLUMN IF EXISTS address,
      DROP COLUMN IF EXISTS contact_phone,
      DROP COLUMN IF EXISTS contact_email,
      DROP COLUMN IF EXISTS website_url,
      DROP COLUMN IF EXISTS whatsapp_url,
      DROP COLUMN IF EXISTS instagram_url,
      DROP COLUMN IF EXISTS is_public,
      DROP COLUMN IF EXISTS member_count_cached;
  `).then(() => next(), next);
};
