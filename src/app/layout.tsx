import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ClawFi - DeFi Skills for AI Agents',
  description: 'Give any AI agent secure, self-custodial DeFi powers on Solana. Jupiter swaps, Kamino vaults.',
  keywords: ['AI', 'Agent', 'Solana', 'DeFi', 'Jupiter', 'Kamino', 'ClawFi'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
