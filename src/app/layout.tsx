import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Pwa from "@/components/Pwa";

const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
export const metadata: Metadata = {
  title: 'GeoFlightPlannerCamp',
  description: 'Import, edit, and export geospatial CSV data for drone flight plans.',
  manifest: `${base}/manifest.webmanifest`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link href='/maplibre-gl.css' rel='stylesheet' />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href={`${base}/apple-touch-icon.png`} />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        <Pwa />
      </body>
    </html>
  );
}

