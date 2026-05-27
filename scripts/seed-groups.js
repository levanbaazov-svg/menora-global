// Seed sample interest groups: ~3 per community + a handful of global groups.
// Idempotent — skips groups whose name already exists for the same community.
//
// Usage:
//   node scripts/seed-groups.js            # seed for all communities
//   node scripts/seed-groups.js --slug=menorah-test

'use strict';

require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
if (!endpoint || !adminSecret) {
  console.error('HASURA_GRAPHQL_ENDPOINT and HASURA_GRAPHQL_ADMIN_SECRET required.');
  process.exit(1);
}

const arg = (k, def) => {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=').slice(1).join('=') : def;
};
const onlySlug = arg('slug');

const client = new GraphQLClient(endpoint, {
  headers: { 'X-Hasura-Admin-Secret': adminSecret },
});

const FETCH = gql`
  query FetchCommunitiesAndAdmins {
    communities(order_by: { created_at: asc }) {
      id slug name
      memberships(
        where: { role: { _eq: admin }, status: { _eq: active } }
        order_by: { joined_at: asc }
        limit: 1
      ) {
        user_id
      }
    }
  }
`;

const FIND_GROUP_IN_COMMUNITY = gql`
  query FindGroupInCommunity($community_id: uuid!, $name: String!) {
    interest_groups(
      where: {
        community_id: { _eq: $community_id }
        name: { _eq: $name }
      }
      limit: 1
    ) { id }
  }
`;

const FIND_GLOBAL_GROUP = gql`
  query FindGlobalGroup($name: String!) {
    interest_groups(
      where: {
        community_id: { _is_null: true }
        name: { _eq: $name }
      }
      limit: 1
    ) { id }
  }
`;

const INSERT_GROUP = gql`
  mutation InsertGroup($obj: interest_groups_insert_input!) {
    insert_interest_groups_one(object: $obj) { id name }
  }
`;

// ── Per-community templates (rotated through every community) ───────────────
const COMMUNITY_TEMPLATES = [
  {
    category: 'learning',
    name: 'Утренний parsha-кружок',
    description: 'Каждый четверг в 8:00 разбираем недельную главу за чашкой кофе. Для новичков и продолжающих.',
    visibility: 'community',
    frequency: 'Раз в неделю · Четверг 8:00',
    meeting_location: 'Кафе у синагоги',
    tags: ['иврит', 'утро', 'parsha'],
    is_ai_suggested: false,
  },
  {
    category: 'family',
    name: 'Мамы общины',
    description: 'Поддержка, обмен опытом, плейдейты для детей. Знакомимся, помогаем друг другу.',
    visibility: 'community',
    frequency: 'Воскресенья 10:00',
    meeting_location: 'Парк рядом с JCC',
    tags: ['мамы', 'дети', 'плейдейт'],
    is_ai_suggested: false,
  },
  {
    category: 'cooking',
    name: 'Шаббатний кулинарный клуб',
    description: 'Готовим шаббатный стол вместе по четвергам. Делимся рецептами, учимся новому.',
    visibility: 'community',
    frequency: 'Четверги после 17:00',
    meeting_location: 'У Рахели дома',
    tags: ['кашрут', 'шаббат', 'рецепты'],
    is_ai_suggested: true,
  },
  {
    category: 'wellness',
    name: 'Йога на иврите',
    description: 'Утренние занятия в спокойной атмосфере. Подходит для начинающих, есть коврики.',
    visibility: 'community',
    frequency: 'Вторник и пятница 7:30',
    meeting_location: 'Студия Tikva',
    tags: ['йога', 'утро', 'wellness'],
    is_ai_suggested: false,
  },
  {
    category: 'social',
    name: 'Кофе с новенькими',
    description: 'Раз в две недели встречаемся в кафе чтобы познакомить недавно переехавших с общиной.',
    visibility: 'public',
    frequency: 'Раз в 2 недели · Суббота вечер',
    meeting_location: 'Café Aleph',
    tags: ['знакомство', 'переезд', 'кофе'],
    is_ai_suggested: false,
  },
  {
    category: 'volunteer',
    name: 'Хесед — помощь пожилым',
    description: 'Помогаем старшим членам общины с продуктами, врачами, разговорами. Один час в неделю.',
    visibility: 'community',
    frequency: 'Воскресенья',
    meeting_location: 'По домам',
    tags: ['хесед', 'волонтёрство'],
    is_ai_suggested: false,
  },
];

// ── Global templates (community_id = NULL — joinable from any community) ────
const GLOBAL_TEMPLATES = [
  {
    category: 'business',
    name: 'Jewish Tech Founders',
    description: 'Networking community for Jewish startup founders worldwide. Monthly Zoom + city meetups.',
    visibility: 'public',
    frequency: 'Раз в месяц онлайн',
    meeting_location: 'Zoom + city meetups',
    tags: ['startup', 'tech', 'global', 'networking'],
    is_ai_suggested: false,
  },
  {
    category: 'travel',
    name: 'Шаббат в путешествии',
    description: 'Где встретить шаббат когда ты в дороге. Чат, рекомендации синагог и хостов по всему миру.',
    visibility: 'public',
    frequency: 'Постоянно онлайн',
    meeting_location: 'Telegram + WhatsApp',
    tags: ['travel', 'shabbat', 'global'],
    is_ai_suggested: false,
  },
  {
    category: 'arts',
    name: 'Еврейские музыканты',
    description: 'Глобальное сообщество композиторов и исполнителей. Делимся работами, ищем коллабы.',
    visibility: 'public',
    frequency: 'Свободно',
    meeting_location: 'Discord',
    tags: ['music', 'arts', 'global'],
    is_ai_suggested: true,
  },
  {
    category: 'learning',
    name: 'Daf Yomi — русский',
    description: 'Ежедневное изучение страницы Талмуда на русском языке. Утренний голосовой чат + конспекты.',
    visibility: 'public',
    frequency: 'Каждый день 7:00 UTC',
    meeting_location: 'Telegram голосовой',
    tags: ['talmud', 'daily', 'russian'],
    is_ai_suggested: false,
  },
  {
    category: 'family',
    name: 'Couples Learning Global',
    description: 'Пары изучают вместе еврейские темы — Тора, отношения, праздники. Раз в неделю онлайн.',
    visibility: 'public',
    frequency: 'Среда вечер',
    meeting_location: 'Zoom',
    tags: ['couples', 'learning', 'global'],
    is_ai_suggested: false,
  },
  {
    category: 'sports',
    name: 'Бегуны в Иерусалиме',
    description: 'Утренние и вечерние пробежки группой. Все уровни. Конкурируем на полумарафоне.',
    visibility: 'public',
    frequency: 'Вт/Чт/Сб',
    meeting_location: 'Парк Сахер',
    tags: ['running', 'jerusalem'],
    is_ai_suggested: false,
  },
];

// Convert array → PG literal string
function pgArray(arr) {
  return `{${arr.map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(',')}}`;
}

async function findOrCreate(template, communityId, creatorUserId) {
  const found = communityId
    ? await client.request(FIND_GROUP_IN_COMMUNITY, {
        community_id: communityId, name: template.name,
      })
    : await client.request(FIND_GLOBAL_GROUP, { name: template.name });
  if (found.interest_groups.length > 0) {
    return { id: found.interest_groups[0].id, created: false };
  }
  const obj = {
    community_id: communityId,
    created_by_user_id: creatorUserId,
    category: template.category,
    name: template.name,
    description: template.description,
    visibility: template.visibility,
    frequency: template.frequency,
    meeting_location: template.meeting_location,
    tags: pgArray(template.tags),
    is_ai_suggested: !!template.is_ai_suggested,
  };
  const r = await client.request(INSERT_GROUP, { obj });
  return { id: r.insert_interest_groups_one.id, created: true };
}

(async () => {
  console.log('Fetching communities + admins...');
  const data = await client.request(FETCH);

  const communities = onlySlug
    ? data.communities.filter((c) => c.slug === onlySlug)
    : data.communities;

  if (communities.length === 0) {
    console.error(onlySlug ? `No community with slug "${onlySlug}"` : 'No communities found.');
    process.exit(1);
  }

  let createdCount = 0;
  let skippedCount = 0;

  // Per-community groups
  for (const c of communities) {
    const adminId = c.memberships[0]?.user_id ?? null;
    console.log(`\n→ ${c.name} (slug=${c.slug})${adminId ? '' : '  ⚠ no admin found — groups will have no creator'}`);

    for (const t of COMMUNITY_TEMPLATES) {
      try {
        const { id, created } = await findOrCreate(t, c.id, adminId);
        if (created) {
          console.log(`  ✓ created: ${t.name}  (${id})`);
          createdCount++;
        } else {
          console.log(`  · exists:  ${t.name}`);
          skippedCount++;
        }
      } catch (e) {
        console.error(`  ✗ failed:  ${t.name}  — ${e.message}`);
      }
    }
  }

  // Global groups (creator = admin of first community for membership-trigger sanity)
  const firstAdmin = communities[0]?.memberships[0]?.user_id ?? null;
  console.log(`\n→ Global groups${firstAdmin ? '' : '  ⚠ no admin available as creator'}`);
  for (const t of GLOBAL_TEMPLATES) {
    try {
      const { id, created } = await findOrCreate(t, null, firstAdmin);
      if (created) {
        console.log(`  ✓ created: ${t.name}  (${id})`);
        createdCount++;
      } else {
        console.log(`  · exists:  ${t.name}`);
        skippedCount++;
      }
    } catch (e) {
      console.error(`  ✗ failed:  ${t.name}  — ${e.message}`);
    }
  }

  console.log(`\n✅ Done — ${createdCount} created, ${skippedCount} already existed.`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.response?.errors) console.error(JSON.stringify(e.response.errors, null, 2));
  process.exit(1);
});
