
import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SiteShell } from '@/components/SiteShell';

const GA_MEASUREMENT_ID = 'G-7JXRG9MZQK';

export const metadata: Metadata = {
  metadataBase: new URL('https://influenceit.app'),
  title: {
    default: 'InfluenceIT — Creator Discovery Platform',
    template: '%s | InfluenceIT',
  },
  description: 'Discover and evaluate Instagram creators for influencer partnerships. Data-driven creator discovery for modern marketing teams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col" style={{ minHeight: '100vh' }}>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
