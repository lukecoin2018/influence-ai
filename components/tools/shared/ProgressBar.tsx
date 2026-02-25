"use client";

// Place at: components/tools/shared/ProgressBar.tsx

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function ProgressBar({ currentStep, totalSteps, stepLabels }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">
          {stepLabels ? stepLabels[currentStep - 1] : `Step ${currentStep} of ${totalSteps}`}
        </span>
        <span className="text-sm font-semibold" style={{ color: '#FF4D94' }}>
          {Math.round(progress)}% Complete
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(to right, #FFD700, #FF4D94, #3AAFF4)',
          }}
        />
      </div>
      {stepLabels && (
        <div className="flex justify-between mt-2">
          {stepLabels.map((label, i) => (
            <span
              key={label}
              className="text-xs"
              style={{
                color: i + 1 === currentStep ? '#FF4D94' : i + 1 < currentStep ? '#3A3A3A' : '#9CA3AF',
                fontWeight: i + 1 === currentStep ? 600 : 400,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
