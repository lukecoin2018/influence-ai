import { getEngagementTier, formatEngagementRate } from '@/lib/formatters';

interface EngagementIndicatorProps {
  rate: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EngagementIndicator({ rate, showLabel = true, size = 'md' }: EngagementIndicatorProps) {
  const tier = getEngagementTier(rate);
  const formatted = formatEngagementRate(rate);

  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '15px' : '12px';
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';

  return (
    <span
      className={`badge engagement-${tier}`}
      style={{ fontSize, padding, fontWeight: 600 }}
    >
      {formatted}{showLabel && rate != null ? ' eng.' : ''}
    </span>
  );
}