// Seed richer community profiles + several public communities across cities
// so the Discover feed looks alive. Idempotent (upsert by slug).
//
// Usage: node scripts/seed-communities.js

'use strict';

require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');

const endpoint = process.env.HASURA_GRAPHQL_ENDPOINT;
const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
if (!endpoint || !adminSecret) {
  console.error('HASURA env required.');
  process.exit(1);
}
const client = new GraphQLClient(endpoint, {
  headers: { 'X-Hasura-Admin-Secret': adminSecret },
});

const UPSERT = gql`
  mutation UpsertCommunity($obj: communities_insert_input!) {
    insert_communities_one(
      object: $obj
      on_conflict: {
        constraint: communities_slug_key
        update_columns: [
          name city country_code timezone description hero_image_url
          founded_year denomination address contact_phone contact_email
          website_url whatsapp_url instagram_url is_public member_count_cached
        ]
      }
    ) { id slug name }
  }
`;

// Stable deterministic photos via picsum seed (rabbi can replace later).
// Photos intentionally null — UI shows branded MotifFallback until real
// images are uploaded via the community/place/event edit forms.
const photo = () => null;

const COMMUNITIES = [
  {
    slug: 'menorah-test',
    name: 'Menorah · Test Community',
    city: 'Tel Aviv', country_code: 'IL', timezone: 'Asia/Jerusalem',
    description: 'Тёплая русскоязычная община в сердце Тель-Авива. Шаббатние ужины, уроки Торы, программы для детей и молодёжи. Дом вдали от дома для тех, кто только переехал.',
    hero_image_url: photo('telaviv-shul'),
    founded_year: 2019, denomination: 'Chabad',
    address: 'ул. Бен-Йехуда 5, Тель-Авив',
    contact_phone: '+972-3-555-0100', contact_email: 'hello@menorah-tlv.org',
    website_url: 'https://menorah-tlv.org', whatsapp_url: 'https://wa.me/97235550100',
    is_public: true, member_count_cached: 2,
  },
  {
    slug: 'london-central',
    name: 'London Jewish Centre',
    city: 'London', country_code: 'GB', timezone: 'Europe/London',
    description: 'Vibrant central London community welcoming Russian-speaking Jews. Weekly Shabbat dinners, young professionals network, Hebrew school.',
    hero_image_url: photo('london-jcc'),
    founded_year: 1998, denomination: 'Modern Orthodox',
    address: '21 Golders Green Rd, London',
    contact_phone: '+44-20-7946-0100', contact_email: 'info@londonjcc.uk',
    website_url: 'https://londonjcc.uk',
    is_public: true, member_count_cached: 1240,
  },
  {
    slug: 'paris-marais',
    name: 'Communauté du Marais',
    city: 'Paris', country_code: 'FR', timezone: 'Europe/Paris',
    description: 'Au cœur du Marais — une communauté chaleureuse mêlant tradition et modernité. Dîners de Chabbat, cours de Torah, événements culturels.',
    hero_image_url: photo('paris-marais'),
    founded_year: 1985, denomination: 'Sephardic',
    address: '10 Rue des Rosiers, Paris',
    contact_phone: '+33-1-42-72-0100', contact_email: 'bonjour@marais-kehila.fr',
    website_url: 'https://marais-kehila.fr',
    is_public: true, member_count_cached: 860,
  },
  {
    slug: 'budapest-dohany',
    name: 'Budapest Dohány Kehila',
    city: 'Budapest', country_code: 'HU', timezone: 'Europe/Budapest',
    description: 'Историческая община у Большой синагоги Дохань. Богатое наследие, активная молодёжь, программы для семей и пожилых.',
    hero_image_url: photo('budapest-dohany'),
    founded_year: 1859, denomination: 'Neolog',
    address: 'Dohány u. 2, Budapest',
    contact_phone: '+36-1-555-0100', contact_email: 'shalom@dohany.hu',
    website_url: 'https://dohany.hu',
    is_public: true, member_count_cached: 1530,
  },
  {
    slug: 'vienna-stadttempel',
    name: 'Wien Stadttempel',
    city: 'Vienna', country_code: 'AT', timezone: 'Europe/Vienna',
    description: 'Единственная синагога Вены, пережившая Хрустальную ночь. Тёплая, сплочённая община с глубокими традициями.',
    hero_image_url: photo('vienna-tempel'),
    founded_year: 1826, denomination: 'Orthodox',
    address: 'Seitenstettengasse 4, Wien',
    contact_phone: '+43-1-555-0100', contact_email: 'office@stadttempel.at',
    website_url: 'https://stadttempel.at',
    is_public: true, member_count_cached: 720,
  },
  {
    slug: 'marseille-sud',
    name: 'Marseille Communauté du Sud',
    city: 'Marseille', country_code: 'FR', timezone: 'Europe/Paris',
    description: 'Большая сефардская община юга Франции. Солнце, море и крепкие семейные традиции. Кошерные рестораны, школы, молодёжные клубы.',
    hero_image_url: photo('marseille-sud'),
    founded_year: 1962, denomination: 'Sephardic',
    address: '5 Rue Saint-Suffren, Marseille',
    contact_phone: '+33-4-91-55-0100', contact_email: 'contact@marseille-sud.fr',
    website_url: 'https://marseille-sud.fr',
    is_public: true, member_count_cached: 2100,
  },
  {
    slug: 'bangkok-jcc',
    name: 'Bangkok Jewish Community',
    city: 'Bangkok', country_code: 'TH', timezone: 'Asia/Bangkok',
    description: 'Дом для еврейских путешественников и экспатов в Юго-Восточной Азии. Шаббат-ужины каждую неделю, кошерная кухня, тёплый приём для туристов.',
    hero_image_url: photo('bangkok-jcc'),
    founded_year: 1995, denomination: 'Chabad',
    address: '96 Thanon Rambuttri, Bangkok',
    contact_phone: '+66-2-555-0100', contact_email: 'shalom@bangkokjewish.com',
    website_url: 'https://bangkokjewish.com', whatsapp_url: 'https://wa.me/6625550100',
    is_public: true, member_count_cached: 340,
  },
];

(async () => {
  console.log(`Seeding ${COMMUNITIES.length} community profiles...`);
  for (const c of COMMUNITIES) {
    try {
      const r = await client.request(UPSERT, { obj: c });
      console.log(`  ✓ ${r.insert_communities_one.name} (${r.insert_communities_one.slug})`);
    } catch (e) {
      console.error(`  ✗ ${c.slug}: ${e.message}`);
    }
  }
  console.log('\n✅ Done. The test community keeps its real member count via trigger; seed cities keep static counts.');
})().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.response?.errors) console.error(JSON.stringify(e.response.errors, null, 2));
  process.exit(1);
});
