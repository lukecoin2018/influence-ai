"use client";

// Place at: components/tools/shared/ToolHeader.tsx

import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

interface ToolHeaderProps {
  icon: string;
  title: string;
  description: string;
  crumbs: Crumb[];
}

export function ToolHeader({ icon, title, description, crumbs }: ToolHeaderProps) {
  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#9CA3AF' }}>
        {crumbs.map((crumb, i) => (
          <span key={crumb.label} className="flex items-center gap-2">
            {i > 0 && <span>/</span>}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="hover:text-brand-pink transition-colors"
                style={{ color: '#9CA3AF' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ color: '#3A3A3A', fontWeight: 600 }}>{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
          style={{ backgroundColor: '#FFF0F5', border: '1px solid #FFB3D1' }}
        >
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#3A3A3A', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{description}</p>
        </div>
      </div>
    </div>
  );
}
