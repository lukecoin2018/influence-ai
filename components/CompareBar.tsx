'use client';

import { useRouter } from 'next/navigation';
import { GitCompare, X } from 'lucide-react';

interface CompareBarProps {
  selectedHandles: string[];
  onRemove: (handle: string) => void;
  onClear: () => void;
}

export function CompareBar({ selectedHandles, onRemove, onClear }: CompareBarProps) {
  const router = useRouter();

  if (selectedHandles.length < 2) return null;

  const handleCompare = () => {
    router.push(`/compare?handles=${selectedHandles.join(',')}`);
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#3A3A3A', borderRadius: '12px',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      zIndex: 100,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
        {selectedHandles.length} selected
      </span>

      <div style={{ display: 'flex', gap: '6px' }}>
        {selectedHandles.map((handle) => (
          <span key={handle} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#3A3A3A', borderRadius: '6px',
            padding: '4px 8px', fontSize: '13px', color: 'white',
          }}>
            @{handle}
            <button
              onClick={() => onRemove(handle)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6B7280', display: 'flex', alignItems: 'center' }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={handleCompare}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          backgroundColor: '#FFD700', color: '#3A3A3A',
          border: 'none', borderRadius: '8px',
          padding: '8px 14px', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <GitCompare size={14} />
        Compare
      </button>

      <button
        onClick={onClear}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}