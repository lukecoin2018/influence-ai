'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';


interface Props {
  creatorId: string;
  creatorName: string;
  onClose: () => void;
}

const CAMPAIGN_TYPES = [
  'Sponsored Post', 'Ambassador', 'Gifting', 'Event', 'Other'
];

const BUDGET_RANGES = [
  'Under $500', '$500-1,000', '$1,000-5,000', '$5,000-10,000', '$10,000+', 'To be discussed'
];

const TIMELINES = [
  'ASAP', '1-2 weeks', '1 month', '2-3 months', 'Flexible'
];

export function InquiryModal({ creatorId, creatorName, onClose }: Props) {
  const { user } = useAuth();
  const [campaignType, setCampaignType] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [timeline, setTimeline] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!message.trim()) { setError('Please write a message.'); return; }
    setLoading(true);
    setError('');
  
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId,
        message: message.trim(),
        campaignType: campaignType || null,
        budgetRange: budgetRange || null,
        timeline: timeline || null,
        brandId: user!.id,
      }),
    });
  
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to send inquiry. Please try again.');
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid #E5E7EB', fontSize: '14px', color: '#3A3A3A',
    outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white',
  };

  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: '#6B7280', textTransform: 'uppercase' as const,
    letterSpacing: '0.06em', marginBottom: '6px',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '480px',
        zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#3A3A3A', margin: '0 0 4px 0' }}>
              Work with {creatorName.split(' ')[0]}
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>We'll review your inquiry and get back to you shortly.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px 0' }}>Inquiry Sent!</h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0' }}>We'll review and follow up with you soon.</p>
            <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#FFD700', color: '#3A3A3A', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Campaign Type</label>
              <select value={campaignType} onChange={(e) => setCampaignType(e.target.value)} style={inputStyle}>
                <option value="">Select type...</option>
                {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Budget Range</label>
              <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} style={inputStyle}>
                <option value="">Select budget...</option>
                {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timeline</label>
              <select value={timeline} onChange={(e) => setTimeline(e.target.value)} style={inputStyle}>
                <option value="">Select timeline...</option>
                {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Message <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi, we're interested in working with ${creatorName.split(' ')[0]} on a campaign...`}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5', fontFamily: 'inherit' }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #FFD700, #E6C200)', color: 'white', fontSize: '15px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Inquiry'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}