interface CategoryBadgeProps {
    category: string | null;
    size?: 'sm' | 'md';
  }
  
  export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
    if (!category) return null;
  
    const padding = size === 'sm' ? '2px 8px' : '3px 10px';
    const fontSize = size === 'sm' ? '11px' : '12px';
  
    return (
      <span
        className="badge bg-purple-light text-purple"
        style={{ padding, fontSize }}
      >
        {category}
      </span>
    );
  }