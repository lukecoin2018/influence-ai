'use client'

import { NegotiationData } from '../NegotiationAssistant'
import { Target, CheckSquare } from 'lucide-react'

interface Props {
  data: NegotiationData
  updateData: (updates: Partial<NegotiationData>) => void
}

const priorities = [
  'Stay within budget',
  'Get this specific creator',
  'Maintain good relationship',
  'Get required deliverables',
  'Protect brand requirements',
  'Set precedent for future creators',
  'Close deal quickly',
]

const willingToOptions = [
  'Increase budget slightly',
  'Reduce deliverables',
  'Extend timeline',
  'Adjust creative requirements',
  'Modify usage rights',
  'Add non-monetary value (exposure, products, etc.)',
  'Walk away if needed',
]

const sectionStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginBottom: 20,
}

export default function Step3Goals({ data, updateData }: Props) {
  const togglePriority = (priority: string) => {
    const current = data.priorities || []
    updateData({
      priorities: current.includes(priority)
        ? current.filter(p => p !== priority)
        : [...current, priority],
    })
  }

  const toggleWillingTo = (option: string) => {
    const current = data.willingTo || []
    updateData({
      willingTo: current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option],
    })
  }

  const CheckItem = ({ label, isSelected, onToggle, accentColor }: {
    label: string
    isSelected: boolean
    onToggle: () => void
    accentColor: string
  }) => (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: 8,
        border: `2px solid ${isSelected ? accentColor : '#E5E7EB'}`,
        backgroundColor: isSelected ? (accentColor === '#FFD700' ? '#FFF9E0' : '#FFF0F5') : '#FFFFFF',
        textAlign: 'left',
        cursor: 'pointer',
        marginBottom: 8,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 20, height: 20,
          borderRadius: 4,
          border: `2px solid ${isSelected ? accentColor : '#D1D5DB'}`,
          backgroundColor: isSelected ? accentColor : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isSelected && <CheckSquare style={{ width: 14, height: 14, color: '#3A3A3A' }} strokeWidth={3} />}
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#3A3A3A' }}>{label}</span>
      </div>
    </button>
  )

  return (
    <div style={{ paddingBottom: 100 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Your Negotiation Goals</h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>Define what matters most to you in this negotiation</p>

      {/* Priorities */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target style={{ width: 18, height: 18, color: '#FFD700' }} />
          What's most important in this negotiation?
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Select all that apply</p>
        {priorities.map(priority => (
          <CheckItem
            key={priority}
            label={priority}
            isSelected={data.priorities.includes(priority)}
            onToggle={() => togglePriority(priority)}
            accentColor="#FFD700"
          />
        ))}
      </div>

      {/* Willing To */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#3A3A3A', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckSquare style={{ width: 18, height: 18, color: '#FF6B8A' }} />
          Are you willing to:
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Select all options you're open to</p>
        {willingToOptions.map(option => (
          <CheckItem
            key={option}
            label={option}
            isSelected={data.willingTo.includes(option)}
            onToggle={() => toggleWillingTo(option)}
            accentColor="#FF6B8A"
          />
        ))}
      </div>
    </div>
  )
}
