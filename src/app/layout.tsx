import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nomylax: Financial control plane for autonomous AI agents',
  description:
    'Give AI agents money. Not unlimited power. Nomylax enforces programmable budgets, risk controls and treasury limits for autonomous agents on Base.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime rather than via next/font/google, which times out on
            WSL when the project lives on the /mnt/c filesystem. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..500;1,6..72,200..400&family=Inter+Tight:wght@400;500;600&family=Jost:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
