import { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  required?: boolean;
}

export default function FormSection({ 
  title, 
  description, 
  children,
  required = false 
}: FormSectionProps) {
  return (
    <div className="bg-brand-grey rounded-lg p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          {title}
          {required && <span className="text-brand-pink text-sm">*</span>}
        </h3>
        {description && (
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
