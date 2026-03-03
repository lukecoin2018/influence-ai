'use client'

import { DollarSign, Info } from 'lucide-react'
import type { CalculatorInputs } from './types'

interface Props {
  inputs: CalculatorInputs
  updateInputs: (updates: Partial<CalculatorInputs>) => void
}

export default function UsageRights({ inputs, updateInputs }: Props) {
  const updateUsageType = (type: keyof typeof inputs.usageRightsTypes, checked: boolean) => {
    updateInputs({
      usageRightsTypes: {
        ...inputs.usageRightsTypes,
        [type]: checked,
      },
    })
  }

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
    marginBottom: 12,
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
        <DollarSign style={{ width: 24, height: 24, color: '#FFD700' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Usage Rights & Exclusivity</h2>
      </div>

      {/* Usage Rights Duration */}
      <div>
        <label style={sectionLabelStyle}>Usage Rights Duration</label>
        <select
          value={inputs.usageRightsDuration}
          onChange={(e) => updateInputs({ usageRightsDuration: e.target.value as any })}
          style={selectStyle}
        >
          <option value="organic-only">Organic posts only (30 days) — Base rate</option>
          <option value="30-days">30 days (organic + paid ads) — +20-30%</option>
          <option value="60-days">60 days (organic + paid ads) — +40-50%</option>
          <option value="90-days">90 days (organic + paid ads) — +60-80%</option>
          <option value="6-months">6 months — +100-120%</option>
          <option value="1-year">1 year — +150-200%</option>
          <option value="perpetual">Perpetual/unlimited — +200-300%</option>
        </select>
      </div>

      {/* Usage Rights Types */}
      <div>
        <label style={sectionLabelStyle}>Usage Rights Types</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { key: 'organicOnly',   label: 'Organic social media only',              premium: 'Base rate' },
            { key: 'paidAds',       label: 'Paid social ads',                         premium: '+20-40%' },
            { key: 'whitelisting',  label: 'Whitelisting (ads from creator account)', premium: '+30-50%' },
            { key: 'websiteEmail',  label: 'Website/email marketing',                 premium: '+15-25%' },
            { key: 'print',         label: 'Print materials',                         premium: '+25-40%' },
            { key: 'retail',        label: 'Retail/in-store displays',                premium: '+40-60%' },
            { key: 'commercial',    label: 'Commercial/TV',                           premium: '+100-200%' },
          ].map(option => {
            const isChecked = inputs.usageRightsTypes[option.key as keyof typeof inputs.usageRightsTypes]
            return (
              <label
                key={option.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  backgroundColor: isChecked ? '#FFF9E0' : '#F9FAFB',
                  border: `1px solid ${isChecked ? '#FFD700' : '#E5E7EB'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => updateUsageType(option.key as any, e.target.checked)}
                  style={{ accentColor: '#FFD700', width: 15, height: 15 }}
                />
                <span style={{ flex: 1, fontSize: 14, color: '#3A3A3A' }}>{option.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFD700' }}>{option.premium}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Exclusivity */}
      <div>
        <label style={sectionLabelStyle}>Exclusivity Requirements</label>
        <select
          value={inputs.exclusivity}
          onChange={(e) => updateInputs({ exclusivity: e.target.value as any })}
          style={selectStyle}
        >
          <option value="none">No exclusivity — Base rate</option>
          <option value="category-30">Category exclusivity (30 days) — +10-20%</option>
          <option value="category-60">Category exclusivity (60 days) — +20-30%</option>
          <option value="category-90">Category exclusivity (90 days) — +30-40%</option>
          <option value="full-30">Full exclusivity (30 days) — +30-50%</option>
          <option value="full-60">Full exclusivity (60 days) — +50-80%</option>
          <option value="full-90">Full exclusivity (90 days) — +80-120%</option>
        </select>

        <div style={{
          marginTop: 12,
          padding: 14,
          backgroundColor: '#EBF7FF',
          borderRadius: 8,
          border: '1px solid #A3D9FF',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <Info style={{ width: 18, height: 18, color: '#3AAFF4', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#3A3A3A', margin: 0 }}>
            <strong>Category exclusivity:</strong> Creator can't promote competing brands in your category.
            <br />
            <strong>Full exclusivity:</strong> Creator can't promote any other brands.
          </p>
        </div>
      </div>
    </div>
  )
}
