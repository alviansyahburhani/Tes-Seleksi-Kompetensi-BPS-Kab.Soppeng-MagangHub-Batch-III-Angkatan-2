import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seleksi Kompetensi MagangHub BPS Kab. Soppeng - Batch III',
  description:
    'Platform Seleksi Kompetensi MagangHub Batch III - Badan Pusat Statistik Kabupaten Soppeng',
  icons: {
    icon: '/BPSIndonesia.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-[#FFFDF7] text-slate-950 antialiased selection:bg-[#F7941D] selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
