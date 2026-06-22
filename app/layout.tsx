import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SYORDER - Étterem Menedzsment Platform',
  description: 'Multi-tenant SaaS platform étteremek számára. Kezeld a rendeléseket, készletet, hűségprogramot és analitikát.',
  icons: {
    icon: [
      { url: '/Gemini_Generated_Image_gaqzzsgaqzzsgaqz-removebg-preview.png', type: 'image/png' },
    ],
    apple: '/Gemini_Generated_Image_gaqzzsgaqzzsgaqz-removebg-preview.png',
  },
  openGraph: {
    title: 'SYORDER - Étterem Menedzsment Platform',
    description: 'Teljes körű étterem-menedzsment megoldás',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
