'use client';

// Staff controls on a program detail page: edit + delete (archive).

import { useActionState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { archiveProgram } from '../../_actions';
import { INITIAL_STATE } from '@/lib/onboarding/action-state';

export function ProgramAdminBar({ programId }: { programId: string }) {
  const t = useTranslations('communityPages.newProgram');
  const tc = useTranslations('common');
  const [, action, pending] = useActionState(archiveProgram, INITIAL_STATE);

  return (
    <div className="flex items-center gap-2.5 mb-5">
      <Link
        href={`/dashboard/community/programs/${programId}/edit`}
        className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) px-4 h-9 text-sm font-medium hover:border-(--color-gold) transition-colors"
      >
        <Pencil size={14} /> {tc('edit')}
      </Link>
      <form
        action={action}
        onSubmit={(e) => { if (!confirm(t('deleteConfirm'))) e.preventDefault(); }}
      >
        <input type="hidden" name="program_id" value={programId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 text-destructive px-4 h-9 text-sm font-medium hover:bg-destructive/10 disabled:opacity-60"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t('delete')}
        </button>
      </form>
    </div>
  );
}
