import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, Geist, Noto_Sans_Hebrew } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { dirFor } from '@/i18n/config';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// Display serif for headings — emotional, warm, magazine-like.
// Fraunces is latin-only; Russian headings will fall back to Inter (Cyrillic).
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  style: ['normal', 'italic'],
  // No weight= → uses full variable axis, supports any 100-900.
});

// Body sans — clean, high legibility. Covers Latin + Cyrillic.
const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Hebrew glyphs (Inter has none) — fallback in the --font-sans chain.
const hebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-hebrew',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Menorah Global',
  description: 'Community platform for the Jewish world.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Menorah',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#FCFAF8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={cn(fraunces.variable, inter.variable, hebrew.variable, "font-sans", geist.variable)}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
