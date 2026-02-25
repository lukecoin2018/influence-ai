"use client";

// Place at: components/tools/calculator/AddDeliverableModal.tsx

import { useState } from "react";
import { Platform, ContentType, Deliverable } from "@/types/calculator";

interface AddDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (deliverable: Omit<Deliverable, "id">) => void;
  editingDeliverable?: Deliverable;
}

const contentTypesByPlatform: Record<Platform, Array<{ value: ContentType; label: string; description: string }>> = {
  instagram: [
    { value: "reel-short", label: "Short Reel", description: "15-30 seconds" },
    { value: "reel-standard", label: "Standard Reel", description: "30-60 seconds" },
    { value: "reel-long", label: "Long Reel", description: "60-90 seconds" },
    { value: "post", label: "Feed Post", description: "Single image/video" },
    { value: "carousel", label: "Carousel", description: "Multiple images" },
    { value: "story", label: "Story", description: "24hr ephemeral" },
  ],
  tiktok: [
    { value: "video-short", label: "Short Video", description: "15-30 seconds" },
    { value: "video-standard", label: "Standard Video", description: "30-60 seconds" },
    { value: "video-long", label: "Long Video", description: "60-90 seconds" },
    { value: "series", label: "Series", description: "Multi-part content" },
  ],
  youtube: [
    { value: "short", label: "Short", description: "60 sec vertical" },
    { value: "integration", label: "Video Integration", description: "In-video sponsorship" },
  ],
};

export function AddDeliverableModal({ isOpen, onClose, onAdd, editingDeliverable }: AddDeliverableModalProps) {
  const [platform, setPlatform] = useState<Platform>(editingDeliverable?.platform || "instagram");
  const [contentType, setContentType] = useState<ContentType>(editingDeliverable?.contentType || "reel-standard");
  const [quantity, setQuantity] = useState(editingDeliverable?.quantity || 1);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onAdd({ platform, contentType, quantity });
    onClose();
  };

  const availableTypes = contentTypesByPlatform[platform];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: '#3A3A3A' }}>
            {editingDeliverable ? "Edit Deliverable" : "Add Deliverable"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-xl leading-none"
            style={{ color: '#9CA3AF', backgroundColor: '#F9FAFB' }}
          >
            ×
          </button>
        </div>

        {/* Platform */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-3" style={{ color: '#374151' }}>Platform</label>
          <div className="grid grid-cols-3 gap-2">
            {(["instagram", "tiktok", "youtube"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPlatform(p);
                  setContentType(contentTypesByPlatform[p][0].value);
                }}
                className="py-2.5 px-3 rounded-lg font-medium text-sm transition-all"
                style={
                  platform === p
                    ? { backgroundColor: '#FFD700', color: '#3A3A3A', border: '2px solid #FFD700' }
                    : { backgroundColor: '#F9FAFB', color: '#374151', border: '2px solid #E5E7EB' }
                }
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Type */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-3" style={{ color: '#374151' }}>Content Type</label>
          <div className="grid grid-cols-2 gap-2">
            {availableTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setContentType(type.value)}
                className="py-3 px-3 rounded-lg font-medium text-left transition-all"
                style={
                  contentType === type.value
                    ? { backgroundColor: '#FFF0F5', color: '#FF4D94', border: '2px solid #FF4D94' }
                    : { backgroundColor: '#F9FAFB', color: '#374151', border: '2px solid #E5E7EB' }
                }
              >
                <div className="font-semibold text-sm">{type.label}</div>
                <div className="text-xs mt-0.5 opacity-70">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Quantity</label>
          <input
            type="number"
            min="1"
            max="20"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-3 rounded-lg border text-sm outline-none focus:ring-2"
            style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#3A3A3A' }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#FF4D94', color: '#fff' }}
          >
            {editingDeliverable ? "Update" : "Add"} Deliverable
          </button>
        </div>
      </div>
    </div>
  );
}
