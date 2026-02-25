"use client";

// Place at: components/tools/calculator/DeliverableCard.tsx

import { Deliverable, Platform, ContentType } from "@/types/calculator";

interface DeliverableCardProps {
  deliverable: Deliverable;
  index: number;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  estimatedRate?: number;
}

const platformEmojis: Record<Platform, string> = {
  instagram: "📱",
  tiktok: "🎵",
  youtube: "▶️",
};

const platformNames: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const contentTypeNames: Record<ContentType, string> = {
  "reel-short": "Short Reel (15-30s)",
  "reel-standard": "Standard Reel (30-60s)",
  "reel-long": "Long Reel (60-90s)",
  post: "Feed Post",
  carousel: "Carousel Post",
  story: "Story",
  "video-short": "Short Video (15-30s)",
  "video-standard": "Standard Video (30-60s)",
  "video-long": "Long Video (60-90s)",
  series: "Series",
  short: "YouTube Short",
  integration: "Video Integration",
};

export function DeliverableCard({ deliverable, index, onEdit, onRemove, estimatedRate }: DeliverableCardProps) {
  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
    >
      {/* Number Badge */}
      <div
        className="absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm"
        style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
      >
        {index + 1}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{platformEmojis[deliverable.platform]}</span>
            <span className="font-semibold text-sm" style={{ color: '#FF4D94' }}>
              {platformNames[deliverable.platform]}
            </span>
          </div>
          <div className="font-medium text-sm" style={{ color: '#3A3A3A' }}>
            {contentTypeNames[deliverable.contentType]}
          </div>
          <div className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Quantity: {deliverable.quantity}
          </div>
        </div>

        {estimatedRate && (
          <div className="text-right flex-shrink-0">
            <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Est.</div>
            <div className="text-lg font-bold" style={{ color: '#FF4D94' }}>
              ${Math.round(estimatedRate).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onEdit(deliverable.id)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: '#EFF6FF', color: '#3AAFF4', border: '1px solid #BFDBFE' }}
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(deliverable.id)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: '#FFF0F5', color: '#FF4D94', border: '1px solid #FFB3D1' }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
