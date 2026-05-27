import Link from 'next/link';
import { NewInvitationForm } from './NewInvitationForm';

export default function NewInvitationPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard/invitations" className="text-sm text-(--color-muted) hover:text-(--color-deep) mb-4 inline-block">
        ← К списку приглашений
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2">Новое приглашение</h1>
      <p className="text-sm text-(--color-muted) mb-8">
        Сгенерируем магическую ссылку. Любой, кто откроет её и войдёт через Google, получит membership.
      </p>
      <NewInvitationForm />
    </div>
  );
}
