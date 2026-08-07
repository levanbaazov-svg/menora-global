import type { Metadata } from 'next';
import { ChederProvider } from './_components/state';
import { ChederShell } from './_components/shell';

export const metadata: Metadata = {
  title: 'Online Cheder — Demo',
  description:
    'A full cheder education online: live davening, chavrusas, mashpiim — and a personal program for every child.',
};

export default function ChederLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChederProvider>
      <ChederShell>{children}</ChederShell>
    </ChederProvider>
  );
}
