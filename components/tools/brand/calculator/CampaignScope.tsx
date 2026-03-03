'use client'

import { Users, Info } from 'lucide-react'
import type { CalculatorInputs } from './types'

interface Props {
  inputs: CalculatorInputs
  updateInputs: (updates: Partial<CalculatorInputs>) => void
}

export default function CampaignScope({ inputs, updateInputs }: Props) {
  const creatorOptions = [1, 3, 5, 10, 15, 20, 25, 50]

  const tierInfo = {
    nano: {
      range: '1k-10k followers',
      bestFor: 'Niche audiences, high engagement, tight budgets',
      engagement: '5-8%',
    },
    micro: {
      range: '10k-50k followers',
      bestFor: 'Authentic partnerships, engaged communities',
      engagement: '4-6%',
    },
    mid: {
      range: '50k-100k followers',
      bestFor: 'Balanced reach and engagement',
      engagement: '3-5%',
    },
    macro: {
      range: '100k-500k followers',
      bestFor: 'Significant reach, established creators',
      engagement: '2-4%',
    },
    mega: {
      range: '500k-1M followers',
      bestFor: 'Maximum reach, celebrity status',
      engagement: '1-3%',
    },
    custom: {
      range: 'Custom follower count',
      bestFor: 'Specific creator requirements',
      engagement: 'Varies',
    },
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
        <Users style={{ width: 24, height: 24, color: '#FFD700' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Campaign Scope</h2>
      </div>

      {/* Number of Creators */}
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#3A3A3A', marginBottom: 8 }}>
          Number of Creators
        </label>
        <select
          value={inputs.numberOfCreators}
          onChange={(e) => updateInputs({ numberOfCreators: Number(e.target.value) })}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#F9FAFB',
            color: '#3A3A3A',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {creatorOptions.map(num => (
            <option key={num} value={num}>{num} creators</option>
          ))}
        </select>
      </div>

      {/* Creator Tier */}
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#3A3A3A', marginBottom: 12 }}>
          Creator Tier
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(tierInfo).map(([tier, info]) => {
            const isSelected = inputs.creatorTier === tier
            return (
              <label
                key={tier}
                style={{
                  display: 'block',
                  padding: 14,
                  border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <input
                    type="radio"
                    name="creatorTier"
                    value={tier}
                    checked={isSelected}
                    onChange={(e) => updateInputs({ creatorTier: e.target.value as any })}
                    style={{ marginTop: 3, accentColor: '#FFD700' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: '#3A3A3A', textTransform: 'capitalize' }}>{tier}</span>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>({info.range})</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      <strong>Best for:</strong> {info.bestFor}
                    </p>
                    <p style={{ fontSize: 13, color: '#3AAFF4', marginTop: 4 }}>
                      Typical engagement: {info.engagement}
                    </p>
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        {/* Custom Follower Count */}
        {inputs.creatorTier === 'custom' && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#3A3A3A', marginBottom: 8 }}>
              Specific Follower Count
            </label>
            <input
              type="number"
              value={inputs.customFollowerCount || ''}
              onChange={(e) => updateInputs({ customFollowerCount: Number(e.target.value) || null })}
              placeholder="e.g., 75000"
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#F9FAFB',
                color: '#3A3A3A',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Engagement Level */}
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#3A3A3A', marginBottom: 12 }}>
          Engagement Level
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { value: 'average', label: 'Average', rate: '2-3%' },
            { value: 'good', label: 'Good', rate: '4-5%' },
            { value: 'excellent', label: 'Excellent', rate: '6%+' },
          ].map(option => {
            const isSelected = inputs.engagementLevel === option.value
            return (
              <label
                key={option.value}
                style={{
                  display: 'block',
                  padding: 14,
                  border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'center',
                  backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="engagementLevel"
                  value={option.value}
                  checked={isSelected}
                  onChange={(e) => updateInputs({ engagementLevel: e.target.value as any })}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: 600, color: '#3A3A3A' }}>{option.label}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{option.rate}</div>
              </label>
            )
          })}
        </div>

        {/* Info box */}
        <div style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#EBF7FF',
          borderRadius: 8,
          border: '1px solid #A3D9FF',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <Info style={{ width: 18, height: 18, color: '#3AAFF4', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#3A3A3A', margin: 0 }}>
            Higher engagement = higher rates. Creators with engaged audiences charge premium prices.
          </p>
        </div>
      </div>
    </div>
  )
}
