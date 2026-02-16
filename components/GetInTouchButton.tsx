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
    backgroundColor: '#7C3AED',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  } as const;

  if (!user) {
    const mailtoHref = `mailto:hello@influenceai.com?subject=Partnership Inquiry: ${creatorName}&body=Hi, I'm interested in working with ${creatorName}.`;
    return (
      <a href={mailtoHref} style={buttonStyle}>
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