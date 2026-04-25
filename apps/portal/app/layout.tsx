import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trámites al Chilazo',
  description: 'Automated legal document procurement platform for Guatemala',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
