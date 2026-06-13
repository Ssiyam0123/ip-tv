import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PwaInit } from '@/components/ui/pwa-init';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SportStream — Live Sports TV',
    template: '%s | SportStream',
  },
  description:
    'Watch live sports channels, football, cricket, tennis and more. Real-time scores and your favourite channels all in one place.',
  keywords: ['live sports', 'IPTV', 'football', 'cricket', 'tennis', 'live TV', 'sports streaming'],
  authors: [{ name: 'SportStream' }],
  creator: 'SportStream',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SportStream',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'SportStream',
    title: 'SportStream — Live Sports TV',
    description: 'Watch live sports channels, football, cricket, tennis and more.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SportStream — Live Sports TV',
    description: 'Watch live sports channels, football, cricket, tennis and more.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        {/* PWA iOS splash screens */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full bg-background text-text overscroll-none">
        <Providers>
          {children}
          <PwaInit />
        </Providers>
      </body>
    </html>
  );
}
