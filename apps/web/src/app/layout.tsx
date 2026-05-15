import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'AiERP - Enterprise Resource Planning', template: '%s | AiERP' },
  description: 'AiERP - Multi-tenant cloud ERP for modern enterprises.',
  keywords: ['ERP', 'Finance', 'Inventory', 'SaaS', 'Accounting'],
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a5f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-50 text-surface-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
