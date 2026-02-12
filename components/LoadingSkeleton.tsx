export function CreatorCardSkeleton() {
    return (
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="skeleton" style={{ height: '14px', width: '60%' }} />
            <div className="skeleton" style={{ height: '12px', width: '40%' }} />
          </div>
        </div>
        {/* Bio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div className="skeleton" style={{ height: '12px', width: '100%' }} />
          <div className="skeleton" style={{ height: '12px', width: '75%' }} />
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="skeleton" style={{ height: '24px', width: '60px', borderRadius: '999px' }} />
          <div className="skeleton" style={{ height: '24px', width: '70px', borderRadius: '999px' }} />
          <div className="skeleton" style={{ height: '24px', width: '55px', borderRadius: '999px' }} />
        </div>
      </div>
    );
  }
  
  export function CreatorGridSkeleton({ count = 24 }: { count?: number }) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <CreatorCardSkeleton key={i} />
        ))}
      </div>
    );
  }