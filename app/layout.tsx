import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: {
    default: 'InfluenceAI — Creator Discovery Platform',
    template: '%s | InfluenceAI',
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
        <AuthProvider>
          <Navigation />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}