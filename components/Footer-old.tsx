import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-base bg-card" style={{ marginTop: 'auto' }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap justify-between items-start gap-8">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 no-underline w-fit">
              <div
                className="bg-purple flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ width: '28px', height: '28px' }}
              >
                <BarChart2 size={14} color="white" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-primary text-sm">InfluenceIT</span>
            </Link>
            <p className="text-secondary text-sm leading-relaxed" style={{ maxWidth: '280px', margin: 0 }}>
              Data-driven creator discovery for modern marketing teams.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <p className="font-semibold text-primary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Platform
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/creators" className="text-sm text-secondary hover:text-primary no-underline">Browse Creators</Link>
                <Link href="/compare" className="text-sm text-secondary hover:text-primary no-underline">Compare</Link>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-semibold text-primary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Company
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/about" className="text-sm text-secondary hover:text-primary no-underline">About</Link>
                <a href="mailto:hello@influenceit.app" className="text-sm text-secondary hover:text-primary no-underline">Contact</a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-wrap justify-between items-center gap-3 border-t border-subtle" style={{ marginTop: '40px', paddingTop: '24px' }}>
          <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
            © {new Date().getFullYear()} InfluenceIT. All rights reserved.
          </p>
          <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
            Built for marketing teams who care about data.
          </p>
        </div>
      </div>
    </footer>
  );
}