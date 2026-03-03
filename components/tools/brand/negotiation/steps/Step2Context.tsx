'use client'

import { NegotiationData } from '../NegotiationAssistant'
import { Users, TrendingUp, Tag, Star, Briefcase, Target, DollarSign, FileText, Clock, Shield } from 'lucide-react'

interface Props {
  data: NegotiationData
  updateData: (updates: Partial<NegotiationData>) => void
}

const niches = [
  'Fashion & Beauty', 'Fitness & Wellness', 'Food & Cooking', 'Travel & Lifestyle',
  'Tech & Gaming', 'Parenting & Family', 'Business & Finance', 'Home & DIY',
  'Entertainment', 'Education', 'Other',
]

const sectionStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginBottom: 20,
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: '#F9FAFB',
  color: '#3A3A3A',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
}

const sectionHeadingStyle = {
  fontSize: 17,
  fontWeight: 700 as const,
  color: '#3A3A3A',
  margin: '0 0 16px',
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 8,
}

const fieldLabelStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  fontSize: 13,
  fontWeight: 600 as const,
  color: '#3A3A3A',
  marginBottom: 8,
}

const radioOption = (isSelected: boolean) => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
  backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
  textAlign: 'left' as const,
  cursor: 'pointer',
  transition: 'border-color 0.15s, background-color 0.15s',
  marginBottom: 8,
})

const radioDot = (isSelected: boolean, size: number = 18) => ({
  width: size, height: size,
  borderRadius: '50%',
  border: `2px solid ${isSelected ? '#FFD700' : '#D1D5DB'}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
})

const radioDotInner = {
  width: 9, height: 9,
  borderRadius: '50%',
  backgroundColor: '#FFD700',
}

function FlexibilityGroup({ label, icon: Icon, field, value, options, onChange }: {
  label: string
  icon: any
  field: string
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={fieldLabelStyle}>
        <Icon style={{ width: 15, height: 15, color: '#FFD700' }} />
        {label}
      </div>
      <div>
        {options.map(opt => {
          const isSelected = value === opt.value
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)} style={radioOption(isSelected)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={radioDot(isSelected, 16)}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FFD700' }} />}
                </div>
                <span style={{ fontSize: 13, color: '#3A3A3A' }}>{opt.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Step2Context({ data, updateData }: Props) {
  return (
    <div style={{ paddingBottom: 100 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Creator Context</h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>Help us understand this creator and your flexibility</p>

      {/* Creator Details */}
      <div style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>
          <Users style={{ width: 18, height: 18, color: '#FFD700' }} />
          Creator Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={fieldLabelStyle}><Users style={{ width: 14, height: 14, color: '#3AAFF4' }} />Follower count:</div>
            <input style={inputStyle} type="text" placeholder="e.g., 50K" value={data.followerCount} onChange={(e) => updateData({ followerCount: e.target.value })} />
          </div>
          <div>
            <div style={fieldLabelStyle}><TrendingUp style={{ width: 14, height: 14, color: '#3AAFF4' }} />Engagement rate (if known):</div>
            <input style={inputStyle} type="text" placeholder="e.g., 4.5%" value={data.engagementRate} onChange={(e) => updateData({ engagementRate: e.target.value })} />
          </div>
          <div>
            <div style={fieldLabelStyle}><Tag style={{ width: 14, height: 14, color: '#3AAFF4' }} />Niche:</div>
            <select style={inputStyle} value={data.niche} onChange={(e) => updateData({ niche: e.target.value })}>
              <option value="">Select niche</option>
              {niches.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <div style={fieldLabelStyle}><Star style={{ width: 14, height: 14, color: '#3AAFF4' }} />Past work quality:</div>
            <select style={inputStyle} value={data.pastWorkQuality} onChange={(e) => updateData({ pastWorkQuality: e.target.value })}>
              <option value="">Select quality</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={fieldLabelStyle}><Briefcase style={{ width: 14, height: 14, color: '#3AAFF4' }} />Professionalism so far:</div>
            <select style={inputStyle} value={data.professionalism} onChange={(e) => updateData({ professionalism: e.target.value })}>
              <option value="">Select professionalism level</option>
              <option value="great">Great (responsive, clear communication)</option>
              <option value="good">Good (reasonable, some delays)</option>
              <option value="concerning">Concerning (slow, unclear)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Creator Importance */}
      <div style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>
          <Target style={{ width: 18, height: 18, color: '#FFD700' }} />
          How important is this creator?
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>This affects how flexible the responses will be</p>
        {[
          { value: 'priority',  label: 'Priority',       desc: 'Really want to work with them' },
          { value: 'good-fit',  label: 'Good fit',       desc: 'One of several options' },
          { value: 'backup',    label: 'Backup option',  desc: 'Can walk away easily' },
        ].map(option => {
          const isSelected = data.creatorImportance === option.value
          return (
            <button key={option.value} onClick={() => updateData({ creatorImportance: option.value })} style={radioOption(isSelected)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={radioDot(isSelected)}>
                  {isSelected && <div style={radioDotInner} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A' }}>{option.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{option.desc}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Flexibility */}
      <div style={sectionStyle}>
        <h3 style={sectionHeadingStyle}>What's your flexibility?</h3>
        <FlexibilityGroup label="Budget flexibility:" icon={DollarSign} field="budgetFlexibility" value={data.budgetFlexibility}
          options={[
            { value: 'firm',     label: 'Firm (cannot increase)' },
            { value: 'some',     label: 'Some room (can go up 10-20%)' },
            { value: 'flexible', label: 'Flexible (can negotiate significantly)' },
          ]}
          onChange={(val) => updateData({ budgetFlexibility: val })}
        />
        <FlexibilityGroup label="Scope flexibility:" icon={FileText} field="scopeFlexibility" value={data.scopeFlexibility}
          options={[
            { value: 'firm',     label: 'Firm (need exact deliverables)' },
            { value: 'some',     label: 'Some flexibility (can adjust slightly)' },
            { value: 'flexible', label: 'Very flexible (open to alternatives)' },
          ]}
          onChange={(val) => updateData({ scopeFlexibility: val })}
        />
        <FlexibilityGroup label="Timeline flexibility:" icon={Clock} field="timelineFlexibility" value={data.timelineFlexibility}
          options={[
            { value: 'firm',     label: 'Firm deadline (cannot extend)' },
            { value: 'some',     label: 'Some flexibility (few days possible)' },
            { value: 'flexible', label: 'Very flexible (timing not critical)' },
          ]}
          onChange={(val) => updateData({ timelineFlexibility: val })}
        />
        <FlexibilityGroup label="Requirements flexibility:" icon={Shield} field="requirementsFlexibility" value={data.requirementsFlexibility}
          options={[
            { value: 'firm',     label: "Brand guidelines are firm (safety/legal)" },
            { value: 'some',     label: 'Some flexibility (can discuss)' },
            { value: 'flexible', label: "Very flexible (trust creator's judgment)" },
          ]}
          onChange={(val) => updateData({ requirementsFlexibility: val })}
        />
      </div>
    </div>
  )
}
