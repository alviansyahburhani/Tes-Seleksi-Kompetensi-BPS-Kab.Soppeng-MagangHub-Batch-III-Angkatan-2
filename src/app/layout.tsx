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
      <body className="bg-[#F8FAFC] text-slate-900 antialiased selection:bg-[#00AEEF]/20 selection:text-[#0284C7]">
        {children}
      </body>
    </html>
  );
}
