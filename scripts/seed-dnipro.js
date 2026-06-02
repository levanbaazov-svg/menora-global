// Rich demo seed for the Dnipro Jewish Community (Menorah Center) — so the
// community profile / visitor page looks full for a live presentation.
//
// Creates: community profile + leaders (rabbi, director, rebbetzin) + several
// members + programs + places (synagogues, cafes, store, mikvah) + events.
//
// Idempotent: upserts by stable keys. Safe to re-run.
//
// Usage: node scripts/seed-dnipro.js

'use strict';

require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
if (!endpoint || !adminSecret) { console.error('HASURA env required'); process.exit(1); }
const c = new GraphQLClient(endpoint, { headers: { 'X-Hasura-Admin-Secret': adminSecret } });

// Photos intentionally null — UI shows branded MotifFallback until real
// images are uploaded via the community/place/event edit forms.
const photo = () => null;
const SLUG = 'dnipro-menorah';

// ── Mutations ──────────────────────────────────────────────────────────────
const UPSERT_COMMUNITY = gql`
  mutation($obj: communities_insert_input!) {
    insert_communities_one(object: $obj, on_conflict: {
      constraint: communities_slug_key
      update_columns: [name city country_code timezone description hero_image_url
        founded_year denomination address contact_phone contact_email website_url
        whatsapp_url instagram_url is_public]
    }) { id }
  }
`;
const UPSERT_USER = gql`
  mutation($email: citext!, $name: String!, $image: String) {
    insert_users_one(object: { email: $email, name: $name, image_url: $image, first_signup_path: invite },
      on_conflict: { constraint: users_email_key, update_columns: [name, image_url] }) { id }
  }
`;
const UPSERT_PROFILE = gql`
  mutation($obj: user_profiles_insert_input!) {
    insert_user_profiles_one(object: $obj, on_conflict: {
      constraint: user_profiles_pkey, update_columns: [hebrew_name, bio, legal_first_name, legal_last_name]
    }) { user_id }
  }
`;
const UPSERT_MEMBERSHIP = gql`
  mutation($user_id: uuid!, $community_id: uuid!, $role: membership_role!, $crole: String) {
    insert_memberships_one(object: {
      user_id: $user_id, community_id: $community_id, role: $role, status: active,
      entry_method: rabbi_added, community_role: $crole, joined_at: "now()"
    }, on_conflict: { constraint: memberships_user_community_unique, update_columns: [role, status, community_role] }) { id }
  }
`;
const FIND_PLACE = gql`query($cid: uuid!, $name: String!) { places(where:{community_id:{_eq:$cid},name:{_eq:$name}},limit:1){id} }`;
const INSERT_PLACE = gql`mutation($obj: places_insert_input!) { insert_places_one(object:$obj){id} }`;
const FIND_PROGRAM = gql`query($cid: uuid!, $name: String!) { programs(where:{community_id:{_eq:$cid},name:{_eq:$name}},limit:1){id} }`;
const INSERT_PROGRAM = gql`mutation($obj: programs_insert_input!) { insert_programs_one(object:$obj){id} }`;
const FIND_EVENT = gql`query($cid: uuid!, $title: String!) { events(where:{community_id:{_eq:$cid},title:{_eq:$title}},limit:1){id} }`;
const INSERT_EVENT = gql`mutation($obj: events_insert_input!) { insert_events_one(object:$obj){id} }`;

// ── Data ────────────────────────────────────────────────────────────────────
const COMMUNITY = {
  slug: SLUG,
  name: 'Днепровская еврейская община · Менора',
  city: 'Днепр', country_code: 'UA', timezone: 'Europe/Kiev',
  description: 'Один из крупнейших еврейских центров мира — комплекс «Менора» с семью золотыми башнями на улице Шолом-Алейхема. Дом для более чем 2 400 членов всех поколений: синагога «Золотая Роза», кошерные рестораны, школы, музей «Память еврейского народа и Холокост в Украине», медицинский центр и общинные программы для детей, молодёжи, семей и пожилых.',
  hero_image_url: photo('dnipro-menorah-towers'),
  founded_year: 1991, denomination: 'Chabad',
  address: 'ул. Шолом-Алейхема, 4, Днепр, 49000',
  contact_phone: '+380-56-717-7070',
  contact_email: 'office@djc.com.ua',
  website_url: 'https://djc.com.ua',
  whatsapp_url: 'https://wa.me/380567177070',
  instagram_url: 'https://instagram.com/menorah_center',
  is_public: true,
};

const LEADERS = [
  { email: 'rabbi.kaminezki@djc.demo', name: 'Раввин Шмуэль Каминецкий', hebrew: 'שמואל קמינצקי',
    role: 'rabbi', crole: 'Главный раввин Днепра', image: photo('rabbi-portrait-1'),
    bio: 'Главный раввин Днепра и области с 1990 года. Под его руководством община выросла в один из крупнейших еврейских центров Восточной Европы.' },
  { email: 'director.tkach@djc.demo', name: 'Зелик Ткач', hebrew: 'זליג טקץ׳',
    role: 'admin', crole: 'Исполнительный директор', image: photo('director-portrait-1'),
    bio: 'Исполнительный директор общинного центра «Менора». Координирует работу всех программ и социальных служб.' },
  { email: 'rebbetzin@djc.demo', name: 'Хана Каминецкая', hebrew: 'חנה קמינצקי',
    role: 'admin', crole: 'Руководитель женских программ', image: photo('rebbetzin-portrait-1'),
    bio: 'Руководит женскими и семейными программами общины, организует праздники и образовательные курсы.' },
];

const MEMBERS = [
  { email: 'member1@djc.demo', name: 'Давид Гольдман', image: photo('member-d1') },
  { email: 'member2@djc.demo', name: 'Рахель Шапиро', image: photo('member-r2') },
  { email: 'member3@djc.demo', name: 'Михаил Резник', image: photo('member-m3') },
  { email: 'member4@djc.demo', name: 'Сара Левина', image: photo('member-s4') },
  { email: 'member5@djc.demo', name: 'Йосеф Каплан', image: photo('member-y5') },
  { email: 'member6@djc.demo', name: 'Эстер Брановер', image: photo('member-e6') },
  { email: 'member7@djc.demo', name: 'Александр Фишман', image: photo('member-a7') },
  { email: 'member8@djc.demo', name: 'Двора Ройтман', image: photo('member-d8') },
];

const PLACES = [
  { type: 'synagogue', name: 'Синагога «Золотая Роза»', photo: photo('golden-rose-shul'),
    description: 'Историческая хоральная синагога Днепра, восстановленная в 2000 году. Сердце общины — ежедневные миньяны, шаббатние и праздничные службы.',
    address: 'ул. Шолом-Алейхема, 4', kashrut_level: 'glatt', kashrut_authority: 'Дніпро Бейт Дін',
    has_women_section: true },
  { type: 'restaurant', name: 'Ресторан «Менора»', photo: photo('menorah-restaurant'),
    description: 'Кошерный мясной ресторан в комплексе «Менора». Европейская и израильская кухня, банкеты, шаббатние ужины.',
    address: 'ул. Шолом-Алейхема, 4, 2 этаж', kashrut_level: 'glatt', kashrut_authority: 'Дніпро Бейт Дін',
    price_level: '$$$', cuisine_tags: ['israeli', 'european'], dietary_tags: ['meat'] },
  { type: 'cafe', name: 'Молочное кафе «Тиферет»', photo: photo('tiferet-cafe'),
    description: 'Уютное молочное кафе — выпечка, завтраки, кофе. Идеально для встреч и работы.',
    address: 'ул. Шолом-Алейхема, 4, 1 этаж', kashrut_level: 'mehadrin', kashrut_authority: 'Дніпро Бейт Дін',
    price_level: '$$', cuisine_tags: ['mediterranean'], dietary_tags: ['dairy'] },
  { type: 'store', name: 'Кошерный супермаркет «Тов»', photo: photo('tov-market'),
    description: 'Полный ассортимент кошерных продуктов, вина, товары к праздникам.',
    address: 'ул. Шолом-Алейхема, 6', kashrut_level: 'mehadrin', price_level: '$$' },
  { type: 'mikvah', name: 'Миква «Менора»', photo: photo('mikvah-menorah'),
    description: 'Современная миква при общинном центре. Запись по телефону.',
    address: 'ул. Шолом-Алейхема, 4', has_women_section: true },
  { type: 'school', name: 'Школа «Бейт-Хана»', photo: photo('beit-hana-school'),
    description: 'Полная еврейская школа — от детского сада до 11 класса. Иврит, традиции, сильная академическая программа.',
    address: 'ул. Европейская, 8' },
];

const PROGRAMS = [
  { category: 'kids', name: 'Воскресная школа для детей', photo: photo('prog-kids'),
    description: 'Знакомство с традицией, иврит, праздники и творчество для детей 5–12 лет. Каждое воскресенье.',
    schedule_text: 'Воскресенье, 10:00–13:00', age_min: 5, age_max: 12,
    price_amount: 0, price_currency: 'UAH', price_period: 'monthly' },
  { category: 'teens', name: 'Подростковый клуб CTeen', photo: photo('prog-teens'),
    description: 'Международное молодёжное движение. Встречи, поездки, лидерские программы, подготовка к бар/бат-мицве.',
    schedule_text: 'Четверг, 18:00', age_min: 13, age_max: 17 },
  { category: 'families', name: 'Шаббатоны для семей', photo: photo('prog-families'),
    description: 'Раз в месяц — совместная встреча шаббата для семей с детьми. Песни, ужин, истории.',
    schedule_text: 'Раз в месяц, пятница' },
  { category: 'couples', name: 'Курс для пар «Шалом Байт»', photo: photo('prog-couples'),
    description: 'Изучение еврейского взгляда на семью и отношения. Для пар любого возраста.',
    schedule_text: 'Среда, 19:30', age_min: 18 },
  { category: 'seniors', name: 'Клуб «Золотой возраст»', photo: photo('prog-seniors'),
    description: 'Общение, лекции, праздники и социальная поддержка для пожилых членов общины.',
    schedule_text: 'Вторник и четверг, 11:00', age_min: 60 },
  { category: 'women', name: 'Женский кружок Торы', photo: photo('prog-women'),
    description: 'Еженедельные уроки для женщин с ребецин Ханой. Чай, общение, мудрость недельной главы.',
    schedule_text: 'Понедельник, 11:00' },
];

const daysFromNow = (n, h = 19, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const EVENTS = [
  { title: 'Шаббатний ужин в «Меноре»', type: 'shabbat_dinner', cover: photo('ev-shabbat-dinner'),
    description: 'Традиционный общинный шаббатний ужин. Кидуш, праздничный стол, песни и тёплая атмосфера. Для всех желающих.',
    starts_at: daysFromNow(3, 19, 30), location_text: 'Ресторан «Менора», 2 этаж',
    location_address: 'ул. Шолом-Алейхема, 4, Днепр', max_attendees: 120, is_free: true },
  { title: 'Урок Торы с раввином Каминецким', type: 'lecture', cover: photo('ev-lecture'),
    description: 'Еженедельный разбор недельной главы. Глубоко, но доступно — приходите с вопросами.',
    starts_at: daysFromNow(5, 19, 0), location_text: 'Синагога «Золотая Роза»',
    location_address: 'ул. Шолом-Алейхема, 4, Днепр', is_free: true },
  { title: 'Концерт еврейской музыки', type: 'social', cover: photo('ev-concert'),
    description: 'Вечер клезмера и израильских песен. Живой оркестр, танцы, угощения.',
    starts_at: daysFromNow(9, 18, 0), location_text: 'Большой зал «Менора»',
    location_address: 'ул. Шолом-Алейхема, 4, Днепр', max_attendees: 300,
    is_free: false, price_amount: 250, price_currency: 'UAH' },
  { title: 'Семейный шаббатон', type: 'shabbat_dinner', cover: photo('ev-family-shabbaton'),
    description: 'Шаббат для семей с детьми: программа для малышей, ужин, истории у свечей.',
    starts_at: daysFromNow(10, 17, 30), location_text: 'Менора, семейный зал',
    location_address: 'ул. Шолом-Алейхема, 4, Днепр', max_attendees: 80, is_free: true },
];

// ── Run ─────────────────────────────────────────────────────────────────────
async function findOrInsert(findQ, insertQ, findVars, obj, label) {
  const found = await c.request(findQ, findVars);
  const key = Object.keys(found)[0];
  if (found[key].length > 0) { console.log(`  · exists: ${label}`); return found[key][0].id; }
  const r = await c.request(insertQ, { obj });
  const ik = Object.keys(r)[0];
  console.log(`  ✓ created: ${label}`);
  return r[ik].id;
}

(async () => {
  console.log('Seeding Dnipro community...');
  const comm = await c.request(UPSERT_COMMUNITY, { obj: COMMUNITY });
  const cid = comm.insert_communities_one.id;
  console.log(`Community: ${cid}`);

  console.log('\nLeaders:');
  let rabbiUid = null;
  for (const l of LEADERS) {
    const u = await c.request(UPSERT_USER, { email: l.email, name: l.name, image: l.image });
    const uid = u.insert_users_one.id;
    if (l.role === 'rabbi') rabbiUid = uid;
    await c.request(UPSERT_PROFILE, { obj: {
      user_id: uid, hebrew_name: l.hebrew, bio: l.bio,
      legal_first_name: l.name.split(' ')[0], legal_last_name: l.name.split(' ').slice(1).join(' '),
    }});
    await c.request(UPSERT_MEMBERSHIP, { user_id: uid, community_id: cid, role: l.role, crole: l.crole });
    console.log(`  ✓ ${l.name} (${l.crole})`);
  }

  console.log('\nMembers:');
  for (const m of MEMBERS) {
    const u = await c.request(UPSERT_USER, { email: m.email, name: m.name, image: m.image });
    await c.request(UPSERT_MEMBERSHIP, { user_id: u.insert_users_one.id, community_id: cid, role: 'member', crole: null });
    console.log(`  ✓ ${m.name}`);
  }

  console.log('\nPlaces:');
  for (const p of PLACES) {
    await findOrInsert(FIND_PLACE, INSERT_PLACE, { cid, name: p.name }, {
      community_id: cid, type: p.type, name: p.name, description: p.description,
      photo_url: p.photo, address: p.address, city: 'Днепр', country_code: 'UA',
      kashrut_level: p.kashrut_level, kashrut_authority: p.kashrut_authority,
      price_level: p.price_level,
      cuisine_tags: p.cuisine_tags ? `{${p.cuisine_tags.join(',')}}` : '{}',
      dietary_tags: p.dietary_tags ? `{${p.dietary_tags.join(',')}}` : '{}',
      has_women_section: p.has_women_section ?? false,
      submission_status: 'approved',
    }, p.name);
  }

  console.log('\nPrograms:');
  for (const pr of PROGRAMS) {
    await findOrInsert(FIND_PROGRAM, INSERT_PROGRAM, { cid, name: pr.name }, {
      community_id: cid, category: pr.category, name: pr.name, description: pr.description,
      photo_url: pr.photo, schedule_text: pr.schedule_text,
      age_min: pr.age_min, age_max: pr.age_max,
      price_amount: pr.price_amount, price_currency: pr.price_currency, price_period: pr.price_period,
      registration_open: true, status: 'active',
    }, pr.name);
  }

  console.log('\nEvents:');
  for (const e of EVENTS) {
    await findOrInsert(FIND_EVENT, INSERT_EVENT, { cid, title: e.title }, {
      community_id: cid, host_user_id: rabbiUid, title: e.title, type: e.type, description: e.description,
      cover_image_url: e.cover, starts_at: e.starts_at, timezone: 'Europe/Kiev',
      location_text: e.location_text, location_address: e.location_address,
      max_attendees: e.max_attendees, is_free: e.is_free,
      price_amount: e.price_amount, price_currency: e.price_currency,
      visibility: 'public_in_app', status: 'published', published_at: 'now()',
    }, e.title);
  }

  console.log('\n✅ Dnipro seeded. Open /dashboard/community/c/dnipro-menorah');
})().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.response?.errors) console.error(JSON.stringify(e.response.errors, null, 2));
  process.exit(1);
});
