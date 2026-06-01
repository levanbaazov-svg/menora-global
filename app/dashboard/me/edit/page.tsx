// Self-edit page. Re-uses the onboarding step components (identity, family,
// religious, interests, privacy) — each as its own card. User can submit any
// step independently. Onboarding completion is NOT regressed.

import { auth } from '@/lib/auth';
import { hasuraAdmin } from '@/lib/hasura';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { IdentityForm } from '@/app/onboarding/identity/IdentityForm';
import { FamilyForm } from '@/app/onboarding/family/FamilyForm';
import { ReligiousForm } from '@/app/onboarding/religious/ReligiousForm';
import { InterestsForm } from '@/app/onboarding/interests/InterestsForm';
import { PrivacyForm } from '@/app/onboarding/privacy/PrivacyForm';

const FETCH = /* GraphQL */ `
  query FetchAll($user_id: uuid!) {
    user_profiles_by_pk(user_id: $user_id) {
      legal_first_name legal_last_name hebrew_name gender date_of_birth phone_e164
      marital_status has_children children_ages spouse_hebrew_name
      denomination observance_level kashrut_level
      interests languages bio
      profile_visibility notification_prefs
    }
    users_by_pk(id: $user_id) { name }
  }
`;

interface NotifPrefs { channels?: string[]; categories?: string[]; }
interface Profile {
  legal_first_name: string | null; legal_last_name: string | null;
  hebrew_name: string | null; gender: string | null;
  date_of_birth: string | null; phone_e164: string | null;
  marital_status: string | null; has_children: boolean | null;
  children_ages: number[] | null; spouse_hebrew_name: string | null;
  denomination: string | null; observance_level: string | null; kashrut_level: string | null;
  interests: string[] | null; languages: string[] | null; bio: string | null;
  profile_visibility: string | null; notification_prefs: NotifPrefs | null;
}

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const data = await hasuraAdmin.request<{
    user_profiles_by_pk: Profile | null;
    users_by_pk: { name: string | null } | null;
  }>(FETCH, { user_id: session.user.id });

  const p = data.user_profiles_by_pk;
  const googleName = data.users_by_pk?.name ?? '';
  const [defaultFirst, defaultLast] = googleName.split(' ', 2);

  const ch = new Set(p?.notification_prefs?.channels ?? ['email', 'push']);
  const cat = new Set(p?.notification_prefs?.categories ?? ['events', 'requests', 'prayers', 'community_news']);

  return (
    <div className="container mx-auto max-w-xl px-4 md:px-6 pt-3 pb-8">
      <Link href="/dashboard/me" className="text-sm text-(--color-fg-muted) hover:text-(--color-deep) mb-6 inline-block">
        ← К моему профилю
      </Link>
      <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight mb-2">Редактировать профиль</h1>
      <p className="text-sm text-(--color-fg-muted) mb-8">
        Каждый раздел сохраняется отдельно. После сохранения вернёшься на профиль.
      </p>

      <div className="space-y-10">
        <Section title="Идентичность">
          <IdentityForm mode="edit" defaults={{
            legal_first_name: p?.legal_first_name ?? defaultFirst ?? '',
            legal_last_name:  p?.legal_last_name  ?? defaultLast  ?? '',
            hebrew_name:      p?.hebrew_name      ?? '',
            gender:           p?.gender           ?? '',
            date_of_birth:    p?.date_of_birth    ?? '',
            phone_e164:       p?.phone_e164       ?? '',
          }} />
        </Section>

        <Section title="Семья">
          <FamilyForm mode="edit" defaults={{
            marital_status: p?.marital_status ?? '',
            has_children: p?.has_children ?? false,
            children_ages: p?.children_ages?.join(', ') ?? '',
            spouse_hebrew_name: p?.spouse_hebrew_name ?? '',
          }} />
        </Section>

        <Section title="Религиозный профиль">
          <ReligiousForm mode="edit" defaults={{
            denomination: p?.denomination ?? '',
            observance_level: p?.observance_level ?? '',
            kashrut_level: p?.kashrut_level ?? '',
          }} />
        </Section>

        <Section title="Интересы">
          <InterestsForm mode="edit" defaults={{
            interests: p?.interests ?? [],
            languages: p?.languages ?? ['en'],
            bio: p?.bio ?? '',
          }} />
        </Section>

        <Section title="Приватность">
          <PrivacyForm mode="edit" defaults={{
            profile_visibility: p?.profile_visibility ?? 'community',
            channels: { email: ch.has('email'), push: ch.has('push') },
            categories: {
              events: cat.has('events'), requests: cat.has('requests'),
              prayers: cat.has('prayers'), community: cat.has('community_news'),
            },
          }} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-xl p-6">
      <h2 className="font-serif text-xl font-semibold mb-5">{title}</h2>
      {children}
    </section>
  );
}
