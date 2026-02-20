'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const TYPES = ['General Inquiry', 'Brand Partnership', 'Creator Inquiry', 'Support', 'Press/Media', 'Other'];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('General Inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) { setError('Please fill in all required fields.'); return; }
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('contact_submissions').insert({
      name, email, type, subject, message, status: 'unread',
    });

    if (insertError) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // Log activity (fire and forget)
    try {
      await supabase.from('activity_log').insert({
        event_type: 'contact_form',
        details: { name, email, subject, type },
      });
    } catch (_) {}

    setSubmitted(true);
    setSubmitting(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #E5E7EB', fontSize: '14px', color: '#111827',
    outline: 'none', boxSizing: 'border-box', backgroundColor: 'white',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>Message Sent!</h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>Thanks for reaching out. We'll get back to you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', padding: '60px 24px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Get in Touch</h1>
          <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>Have a question or want to work together? We'd love to hear from you.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Tell us more..."
                style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', fontSize: '15px', fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
