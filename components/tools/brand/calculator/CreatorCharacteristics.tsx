'use client'

import { TrendingUp } from 'lucide-react'
import type { CalculatorInputs } from './types'

interface Props {
  inputs: CalculatorInputs
  updateInputs: (updates: Partial<CalculatorInputs>) => void
}

export default function CreatorCharacteristics({ inputs, updateInputs }: Props) {
  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const selectStyle = {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#F9FAFB',
    color: '#3A3A3A',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  }

  const sectionLabelStyle = {
    display: 'block' as const,
    fontSize: 14,
    fontWeight: 600 as const,
    color: '#3A3A3A',
    marginBottom: 8,
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
        <TrendingUp style={{ width: 24, height: 24, color: '#FFD700' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Creator Characteristics</h2>
      </div>

      {/* Niche/Category */}
      <div>
        <label style={sectionLabelStyle}>Niche/Category</label>
        <select
          value={inputs.niche}
          onChange={(e) => updateInputs({ niche: e.target.value as any })}
          style={selectStyle}
        >
          <option value="beauty">Beauty/Skincare — Premium rates</option>
          <option value="fashion">Fashion — Premium rates</option>
          <option value="fitness">Fitness/Health — High rates</option>
          <option value="tech">Tech/Gaming — High rates</option>
          <option value="food">Food/Cooking — Medium rates</option>
          <option value="lifestyle">Lifestyle — Medium rates</option>
          <option value="travel">Travel — Medium rates</option>
          <option value="parenting">Parenting — Medium-high rates</option>
          <option value="finance">Finance — Premium rates</option>
          <option value="b2b">B2B/Business — Premium rates</option>
          <option value="other">Other — Medium rates</option>
        </select>
        <p style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
          Different niches have different rate standards based on typical brand budgets in those industries.
        </p>
      </div>

      {/* Location */}
      <div>
        <label style={sectionLabelStyle}>Creator Location</label>
        <select
          value={inputs.location}
          onChange={(e) => updateInputs({ location: e.target.value as any })}
          style={selectStyle}
        >
          <option value="us">United States — Base rates (highest)</option>
          <option value="uk">United Kingdom — 80-90% of US rates</option>
          <option value="canada">Canada — 85-95% of US rates</option>
          <option value="australia">Australia — 85-95% of US rates</option>
          <option value="europe">Europe — 70-90% of US rates</option>
          <option value="other">Other regions — 50-80% of US rates</option>
        </select>
      </div>

      {/* Content Quality */}
      <div>
        <label style={{ ...sectionLabelStyle, marginBottom: 12 }}>Content Quality Expectations</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { value: 'ugc',          label: 'UGC Style (casual, authentic)',              premium: 'Base rate' },
            { value: 'professional', label: 'Professional (polished, high production)',   premium: '+20-40%' },
            { value: 'studio',       label: 'Studio Quality (professional shoot)',        premium: '+50-100%' },
          ].map(option => {
            const isSelected = inputs.contentQuality === option.value
            return (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="radio"
                    name="contentQuality"
                    value={option.value}
                    checked={isSelected}
                    onChange={(e) => updateInputs({ contentQuality: e.target.value as any })}
                    style={{ accentColor: '#FFD700' }}
                  />
                  <span style={{ fontSize: 14, color: '#3A3A3A' }}>{option.label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFD700' }}>{option.premium}</span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
