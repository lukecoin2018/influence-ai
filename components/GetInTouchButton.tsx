'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { InquiryModal } from './InquiryModal';

interface Props {
  creatorId: string;
  creatorName: string;
}

export function GetInTouchButton({ creatorId, creatorName }: Props) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: '#FFD700',
    color: '#3A3A3A',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  } as const;

  if (!user) {
    return (
      <a href="/auth/signup" style={buttonStyle}>
        Get in Touch
      </a>
    );
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} style={buttonStyle}>
        Get in Touch
      </button>
      {showModal && (
        <InquiryModal
          creatorId={creatorId}
          creatorName={creatorName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}