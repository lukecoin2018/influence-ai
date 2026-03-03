'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  'Campaign Type', 'Objectives', 'Content', 'Brand',
  'Timeline', 'Compensation', 'Review', 'Creators', 'Send',
];

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      padding: '20px 24px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Steps row */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>

          {/* Background connector line */}
          <div style={{
            position: 'absolute',
            top: 20, left: 0, right: 0,
            height: 2,
            backgroundColor: '#E5E7EB',
            zIndex: 0,
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#FFD700',
              transition: 'width 0.4s ease',
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            }} />
          </div>

          {stepLabels.slice(0, totalSteps).map((label, index) => {
            const stepNumber = index + 1;
            const isComplete = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <div key={index} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                flex: 1, position: 'relative', zIndex: 1,
              }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  marginBottom: 8,
                  backgroundColor: isComplete ? '#FFD700' : isCurrent ? '#FF6B8A' : '#F3F4F6',
                  color: isComplete ? '#3A3A3A' : isCurrent ? '#FFFFFF' : '#9CA3AF',
                  border: isCurrent ? '2px solid #FF6B8A' : '2px solid transparent',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(255,107,138,0.15)' : 'none',
                }}>
                  {isComplete ? <Check style={{ width: 18, height: 18 }} /> : stepNumber}
                </div>
                <span style={{
                  fontSize: 11, textAlign: 'center',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#FF6B8A' : '#9CA3AF',
                  display: 'none',
                }} className="md:block">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mobile: current step label */}
        <div style={{ textAlign: 'center', marginTop: 14 }} className="md:hidden">
          <span style={{ fontSize: 14, fontWeight: 600, color: '#FF6B8A' }}>
            Step {currentStep}: {stepLabels[currentStep - 1]}
          </span>
        </div>

      </div>
    </div>
  );
}
