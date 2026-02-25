// @ts-nocheck
"use client";

// Place at: components/tools/contract/ClauseCustomizer.tsx
// Import path matches your lib/contract.ts filename.
// If you renamed it to contract-types.ts, update the import below.

import { useState } from "react";
import { ContractSection, SelectedClause, ClauseVariable } from "@/lib/contract";

interface ClauseCustomizerProps {
  sections: ContractSection[];
  selectedSections: string[];
  onSaveClause: (clause: SelectedClause) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ClauseCustomizer({
  sections,
  selectedSections,
  onSaveClause,
  onNext,
  onBack,
}: ClauseCustomizerProps) {
  const selectedSectionObjects = sections
    .filter(s => selectedSections.includes(s.id))
    .sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSection = selectedSectionObjects[currentIndex];

  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    selectedSectionObjects.forEach((s: ContractSection) => { init[s.id] = s.defaultVariationId; });
    return init;
  });

  const [variableValues, setVariableValues] = useState<Record<string, Record<string, any>>>(() => {
    const init: Record<string, Record<string, any>> = {};
    selectedSectionObjects.forEach((section: ContractSection) => {
      const variation = section.variations.find((v: { id: string }) => v.id === section.defaultVariationId);
      if (variation) {
        init[section.id] = {};
        variation.variables.forEach((v: ClauseVariable) => {
          if (!v.calculated) init[section.id][v.id] = v.defaultValue;
        });
      }
    });
    return init;
  });

  const handleVariationChange = (sectionId: string, variationId: string) => {
    setSelectedVariations(prev => ({ ...prev, [sectionId]: variationId }));
    const section = sections.find((s: ContractSection) => s.id === sectionId);
    const variation = section?.variations.find((v: { id: string }) => v.id === variationId);
    if (variation) {
      const newValues: Record<string, any> = {};
      variation.variables.forEach((v: ClauseVariable) => { if (!v.calculated) newValues[v.id] = v.defaultValue; });
      setVariableValues(prev => ({ ...prev, [sectionId]: newValues }));
    }
  };

  const handleVariableChange = (sectionId: string, variableId: string, value: any) => {
    setVariableValues(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [variableId]: value },
    }));
  };

  const handleNext = () => {
    const variation = currentSection.variations.find(
      v => v.id === selectedVariations[currentSection.id]
    );
    if (variation) {
      onSaveClause({
        sectionId: currentSection.id,
        variationId: variation.id,
        variableValues: variableValues[currentSection.id] || {},
      });
    }
    if (currentIndex < selectedSectionObjects.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onNext();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    else onBack();
  };

  if (!currentSection) {
    return (
      <div className="text-center py-12">
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>No sections selected</p>
        <button onClick={onBack} className="px-6 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
          ← Back to Section Selection
        </button>
      </div>
    );
  }

  const currentVariation = currentSection.variations.find(
    v => v.id === selectedVariations[currentSection.id]
  );
  const progress = ((currentIndex + 1) / selectedSectionObjects.length) * 100;

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6B7280' }}>
          <span>Section {currentIndex + 1} of {selectedSectionObjects.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
          <div className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: '#FFD700' }} />
        </div>
      </div>

      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>
          {currentSection.order}. {currentSection.title}
        </h2>
        <p className="text-sm mb-3" style={{ color: '#6B7280' }}>{currentSection.description}</p>
        <div className="p-3 rounded-xl text-xs"
          style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <span className="font-semibold" style={{ color: '#1D4ED8' }}>💡 Why this matters: </span>
          <span style={{ color: '#1E40AF' }}>{currentSection.explanation}</span>
        </div>
      </div>

      {/* Variation selector */}
      {currentSection.variations.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
            Choose Your {currentSection.title} Option:
          </label>
          <div className="space-y-2">
            {currentSection.variations.map((variation: { id: string; name: string; description: string }) => {
              const isSelected = selectedVariations[currentSection.id] === variation.id;
              return (
                <button
                  key={variation.id}
                  onClick={() => handleVariationChange(currentSection.id, variation.id)}
                  className="w-full text-left p-4 rounded-xl border-2 transition-all duration-200"
                  style={{
                    borderColor: isSelected ? '#FFD700' : '#E5E7EB',
                    backgroundColor: isSelected ? '#FFFBEB' : '#F9FAFB',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-0.5" style={{ color: '#3A3A3A' }}>
                        {variation.name}
                      </h4>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{variation.description}</p>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#FFD700', fontSize: '18px', flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Variable inputs */}
      {currentVariation && currentVariation.variables.filter(v => !v.calculated).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>
            Fill in the Details:
          </h3>
          <div className="space-y-4">
            {currentVariation.variables
              .filter(v => !v.calculated)
              .map(variable => (
                <VariableInput
                  key={variable.id}
                  variable={variable}
                  value={variableValues[currentSection.id]?.[variable.id]}
                  onChange={(value) => handleVariableChange(currentSection.id, variable.id, value)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
        <button
          onClick={handlePrevious}
          className="flex-1 py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
        >
          ← {currentIndex === 0 ? 'Back to Sections' : 'Previous Section'}
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
          style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
        >
          {currentIndex === selectedSectionObjects.length - 1
            ? 'Continue to Preview →'
            : 'Next Section →'}
        </button>
      </div>
    </div>
  );
}

// ─── Variable Input Component ───────────────────────────────────────────────

interface VariableInputProps {
  variable: ClauseVariable;
  value: any;
  onChange: (value: any) => void;
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1.5px solid #E5E7EB',
  backgroundColor: '#F9FAFB',
  color: '#3A3A3A',
  fontSize: '14px',
  outline: 'none',
};

function VariableInput({ variable, value, onChange }: VariableInputProps) {
  const renderInput = () => {
    switch (variable.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={variable.placeholder}
            required={variable.validation?.required}
            style={inputStyle}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            placeholder={variable.placeholder}
            min={variable.validation?.min}
            max={variable.validation?.max}
            required={variable.validation?.required}
            style={inputStyle}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            required={variable.validation?.required}
            style={inputStyle}
          />
        );
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            required={variable.validation?.required}
            style={inputStyle}
          >
            {variable.options?.map((opt: { value: string; label: string }) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={variable.placeholder}
            rows={4}
            required={variable.validation?.required}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
        {variable.label}
        {variable.validation?.required && (
          <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
        )}
      </label>
      {renderInput()}
      {variable.helpText && (
        <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>{variable.helpText}</p>
      )}
    </div>
  );
}
