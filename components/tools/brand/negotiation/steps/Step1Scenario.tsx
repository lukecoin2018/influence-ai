'use client'

import { NegotiationData } from '../NegotiationAssistant'
import { DollarSign, FileText, Palette, Shield, Lock, Clock, XCircle, MessageSquareOff, MoreHorizontal } from 'lucide-react'

interface Props {
  data: NegotiationData
  updateData: (updates: Partial<NegotiationData>) => void
}

const scenarios = [
  { id: 'higher-rate',      icon: DollarSign,       label: 'Creator wants higher rate',              fields: ['yourOffer', 'creatorCounter', 'maxBudget'] },
  { id: 'reduced-scope',    icon: FileText,          label: 'Creator wants reduced scope',            fields: ['requestedDeliverables', 'proposedDeliverables', 'reason'] },
  { id: 'creative-freedom', icon: Palette,           label: 'Creator wants more creative freedom',   fields: ['yourRequirements', 'creatorConcern'] },
  { id: 'usage-rights',     icon: Shield,            label: 'Creator wants different usage rights',  fields: ['requestedRights', 'proposedRights', 'reason'] },
  { id: 'exclusivity',      icon: Lock,              label: 'Creator wants less exclusivity',        fields: ['requestedExclusivity', 'creatorExclusivityConcern'] },
  { id: 'timeline',         icon: Clock,             label: 'Creator wants longer timeline',         fields: ['yourDeadline', 'requestedDate', 'reason'] },
  { id: 'declined',         icon: XCircle,           label: 'Creator declined campaign',             fields: ['declineReason', 'wantTo'] },
  { id: 'ghosted',          icon: MessageSquareOff,  label: 'Creator ghosted/no response',           fields: ['briefSentDate', 'daysSince', 'wantTo'] },
  { id: 'multiple',         icon: MoreHorizontal,    label: 'Creator negotiating multiple terms',    fields: ['multiplePoints'] },
]

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: '#FFFFFF',
  color: '#3A3A3A',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 13,
  fontWeight: 600 as const,
  color: '#3A3A3A',
  marginBottom: 8,
}

export default function Step1Scenario({ data, updateData }: Props) {
  const handleScenarioSelect = (scenarioId: string) => {
    updateData({ scenario: scenarioId, scenarioDetails: {} })
  }

  const handleDetailChange = (field: string, value: string) => {
    updateData({ scenarioDetails: { ...data.scenarioDetails, [field]: value } })
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>What's the negotiation scenario?</h2>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>Select the situation you're facing with this creator</p>

      {/* Scenario Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {scenarios.map((scenario) => {
          const Icon = scenario.icon
          const isSelected = data.scenario === scenario.id
          return (
            <button
              key={scenario.id}
              onClick={() => handleScenarioSelect(scenario.id)}
              style={{
                padding: 16,
                borderRadius: 10,
                border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
                backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon style={{ width: 20, height: 20, color: isSelected ? '#FFD700' : '#9CA3AF', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#3A3A3A' }}>{scenario.label}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Scenario Details */}
      {data.scenario && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#3A3A3A', margin: '0 0 20px' }}>Scenario Details</h3>

          {data.scenario === 'higher-rate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>You offered:</label><input style={inputStyle} type="text" placeholder="e.g., $500" value={data.scenarioDetails.yourOffer || ''} onChange={(e) => handleDetailChange('yourOffer', e.target.value)} /></div>
              <div><label style={labelStyle}>Creator countered:</label><input style={inputStyle} type="text" placeholder="e.g., $800" value={data.scenarioDetails.creatorCounter || ''} onChange={(e) => handleDetailChange('creatorCounter', e.target.value)} /></div>
              <div><label style={labelStyle}>Your max budget:</label><input style={inputStyle} type="text" placeholder="e.g., $600" value={data.scenarioDetails.maxBudget || ''} onChange={(e) => handleDetailChange('maxBudget', e.target.value)} /></div>
            </div>
          )}

          {data.scenario === 'reduced-scope' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>You requested:</label><textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., 3 Instagram posts + 5 stories" value={data.scenarioDetails.requestedDeliverables || ''} onChange={(e) => handleDetailChange('requestedDeliverables', e.target.value)} rows={2} /></div>
              <div><label style={labelStyle}>Creator proposed:</label><textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., 2 Instagram posts + 3 stories" value={data.scenarioDetails.proposedDeliverables || ''} onChange={(e) => handleDetailChange('proposedDeliverables', e.target.value)} rows={2} /></div>
              <div><label style={labelStyle}>Reason given:</label><input style={inputStyle} type="text" placeholder="e.g., Time constraints, too much work" value={data.scenarioDetails.reason || ''} onChange={(e) => handleDetailChange('reason', e.target.value)} /></div>
            </div>
          )}

          {data.scenario === 'creative-freedom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Your requirements:</label><textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., Must show product in first 3 seconds, specific talking points" value={data.scenarioDetails.yourRequirements || ''} onChange={(e) => handleDetailChange('yourRequirements', e.target.value)} rows={3} /></div>
              <div><label style={labelStyle}>Creator's concern:</label><textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., Too restrictive, doesn't match their style" value={data.scenarioDetails.creatorConcern || ''} onChange={(e) => handleDetailChange('creatorConcern', e.target.value)} rows={2} /></div>
            </div>
          )}

          {data.scenario === 'usage-rights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>You requested:</label><input style={inputStyle} type="text" placeholder="e.g., 12 months across all platforms" value={data.scenarioDetails.requestedRights || ''} onChange={(e) => handleDetailChange('requestedRights', e.target.value)} /></div>
              <div><label style={labelStyle}>Creator proposed:</label><input style={inputStyle} type="text" placeholder="e.g., 3 months organic only" value={data.scenarioDetails.proposedRights || ''} onChange={(e) => handleDetailChange('proposedRights', e.target.value)} /></div>
              <div><label style={labelStyle}>Their reasoning:</label><input style={inputStyle} type="text" placeholder="e.g., Standard industry terms, protecting their content" value={data.scenarioDetails.reason || ''} onChange={(e) => handleDetailChange('reason', e.target.value)} /></div>
            </div>
          )}

          {data.scenario === 'exclusivity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>You requested:</label><input style={inputStyle} type="text" placeholder="e.g., Category exclusivity for 3 months" value={data.scenarioDetails.requestedExclusivity || ''} onChange={(e) => handleDetailChange('requestedExclusivity', e.target.value)} /></div>
              <div><label style={labelStyle}>Creator concerned about:</label><textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., Other partnerships in pipeline, income impact" value={data.scenarioDetails.creatorExclusivityConcern || ''} onChange={(e) => handleDetailChange('creatorExclusivityConcern', e.target.value)} rows={2} /></div>
            </div>
          )}

          {data.scenario === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>You need content by:</label><input style={inputStyle} type="text" placeholder="e.g., March 15, 2024" value={data.scenarioDetails.yourDeadline || ''} onChange={(e) => handleDetailChange('yourDeadline', e.target.value)} /></div>
              <div><label style={labelStyle}>Creator requested:</label><input style={inputStyle} type="text" placeholder="e.g., April 1, 2024" value={data.scenarioDetails.requestedDate || ''} onChange={(e) => handleDetailChange('requestedDate', e.target.value)} /></div>
              <div><label style={labelStyle}>Reason:</label><input style={inputStyle} type="text" placeholder="e.g., Schedule conflict, production time needed" value={data.scenarioDetails.reason || ''} onChange={(e) => handleDetailChange('reason', e.target.value)} /></div>
            </div>
          )}

          {data.scenario === 'declined' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Reason given:</label><textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., Budget too low, timing doesn't work, not the right fit" value={data.scenarioDetails.declineReason || ''} onChange={(e) => handleDetailChange('declineReason', e.target.value)} rows={2} /></div>
              <div><label style={labelStyle}>You want to:</label><input style={inputStyle} type="text" placeholder="e.g., Revise offer, understand why, stay connected for future" value={data.scenarioDetails.wantTo || ''} onChange={(e) => handleDetailChange('wantTo', e.target.value)} /></div>
            </div>
          )}

          {data.scenario === 'ghosted' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Sent brief on:</label><input style={inputStyle} type="text" placeholder="e.g., January 15, 2024" value={data.scenarioDetails.briefSentDate || ''} onChange={(e) => handleDetailChange('briefSentDate', e.target.value)} /></div>
              <div><label style={labelStyle}>Days since:</label><input style={inputStyle} type="text" placeholder="e.g., 5 days" value={data.scenarioDetails.daysSince || ''} onChange={(e) => handleDetailChange('daysSince', e.target.value)} /></div>
              <div><label style={labelStyle}>You want to:</label><input style={inputStyle} type="text" placeholder="e.g., Send follow-up, move on, gentle reminder" value={data.scenarioDetails.wantTo || ''} onChange={(e) => handleDetailChange('wantTo', e.target.value)} /></div>
            </div>
          )}

          {data.scenario === 'multiple' && (
            <div>
              <label style={labelStyle}>Describe the situation:</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g., Creator wants higher rate, reduced scope, and more creative freedom" value={data.scenarioDetails.multiplePoints || ''} onChange={(e) => handleDetailChange('multiplePoints', e.target.value)} rows={4} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
