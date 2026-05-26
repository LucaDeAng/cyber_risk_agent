import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI-Mind — Ipnosi guidata dall\'intelligenza artificiale',
  description:
    'Sessioni di trance adattive sul tuo battito cardiaco. Per chi attraversa burnout, layoff o un cambiamento che brucia.',
  openGraph: {
    title: 'AI-Mind',
    description:
      'Ipnosi generativa, adattiva al battito. Per chi attraversa burnout e layoff tech.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
