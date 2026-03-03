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
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{
          fontSize: 17,
          fontWeight: 600,
          color: '#3A3A3A',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {title}
          {required && <span style={{ color: '#FF6B8A', fontSize: 13 }}>*</span>}
        </h3>
        {description && (
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 0 }}>{description}</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}
