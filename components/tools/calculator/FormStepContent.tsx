"use client";

// Place at: components/tools/calculator/FormStepContent.tsx

import { useState } from "react";
import { Deliverable } from "@/types/calculator";
import { DeliverableCard } from "./DeliverableCard";
import { AddDeliverableModal } from "./AddDeliverableModal";

interface FormStepContentProps {
  deliverables: Deliverable[];
  onChange: (deliverables: Deliverable[]) => void;
}

export function FormStepContent({ deliverables, onChange }: FormStepContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | undefined>();

  const handleAddDeliverable = (newDeliverable: Omit<Deliverable, "id">) => {
    if (editingDeliverable) {
      onChange(deliverables.map((d) =>
        d.id === editingDeliverable.id ? { ...newDeliverable, id: d.id } : d
      ));
      setEditingDeliverable(undefined);
    } else {
      onChange([...deliverables, { ...newDeliverable, id: Date.now().toString() }]);
    }
  };

  const totalDeliverables = deliverables.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>
          Build Your Package
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Add all deliverables for this partnership. Mix platforms and content types freely.
        </p>
      </div>

      {/* Deliverables List */}
      {deliverables.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: '#374151' }}>Your Deliverables</span>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FFF0F5', color: '#FF4D94' }}>
              {totalDeliverables} item{totalDeliverables !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliverables.map((deliverable, index) => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                index={index}
                onEdit={(id) => {
                  setEditingDeliverable(deliverables.find((d) => d.id === id));
                  setIsModalOpen(true);
                }}
                onRemove={(id) => onChange(deliverables.filter((d) => d.id !== id))}
              />
            ))}
          </div>

          {/* Bundle Discount Info */}
          {totalDeliverables >= 3 && (
            <div className="p-3 rounded-lg flex items-center gap-2 text-sm"
              style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#3AAFF4' }}>
              <span>💡</span>
              <span>
                Bundle discount will be applied: <strong>{totalDeliverables >= 5 ? "15%" : "10%"} off</strong> the total package
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {deliverables.length === 0 && (
        <div className="text-center py-12 rounded-xl border-2 border-dashed"
          style={{ borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' }}>
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold mb-1" style={{ color: '#374151' }}>No deliverables yet</h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Add your first deliverable to start building your package
          </p>
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-md"
        style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
      >
        <span className="text-lg font-bold">+</span>
        Add Deliverable
      </button>

      <AddDeliverableModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDeliverable(undefined); }}
        onAdd={handleAddDeliverable}
        editingDeliverable={editingDeliverable}
      />
    </div>
  );
}
