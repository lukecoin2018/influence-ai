'use client'

import { MessageSquare, AlertCircle } from 'lucide-react'
import type { BudgetResults, CalculatorInputs } from './types'

interface Props {
  results: BudgetResults
  inputs: CalculatorInputs
}

export default function NegotiationGuidance({ results, inputs }: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const fairMin = results.breakdown.perCreator.min
  const fairMax = results.breakdown.perCreator.max
  const openingOffer = Math.round(fairMin * 0.85)
  const dontGoBelowMin = Math.round(fairMin * 0.70)
  const maxJustified = Math.round(fairMax * 1.15)

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const innerCardStyle = {
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: 18,
  }

  const metricLabelStyle = { fontSize: 12, color: '#6B7280', marginBottom: 2 }
  const metricHintStyle = { fontSize: 11, color: '#9CA3AF', marginTop: 2 }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <MessageSquare style={{ width: 22, height: 22, color: '#FFD700' }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Negotiation Guidance</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Opening Offer Strategy */}
        <div style={innerCardStyle}>
          <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px 0', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#3AAFF4' }} />
            Opening Offer Strategy
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={metricLabelStyle}>Start at (per creator)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3A3A3A' }}>{formatCurrency(openingOffer)}</div>
              <div style={metricHintStyle}>~85% of calculated fair rate</div>
            </div>
            <div>
              <div style={metricLabelStyle}>Fair range</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#3A3A3A' }}>
                {formatCurrency(fairMin)} – {formatCurrency(fairMax)}
              </div>
            </div>
            <div>
              <div style={metricLabelStyle}>Don't go below</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#FF6B8A' }}>{formatCurrency(dontGoBelowMin)}</div>
              <div style={metricHintStyle}>Lowball territory — damages relationships</div>
            </div>
            <div>
              <div style={metricLabelStyle}>Maximum justified</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#3AAFF4' }}>{formatCurrency(maxJustified)}</div>
              <div style={metricHintStyle}>If creator proves exceptional value</div>
            </div>
          </div>
        </div>

        {/* What to Negotiate */}
        <div style={innerCardStyle}>
          <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px 0', fontSize: 15 }}>What to Negotiate</h4>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3AAFF4', marginBottom: 8 }}>GOOD TO NEGOTIATE</div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Total deliverable count',
                'Usage rights duration',
                'Exclusivity terms',
                'Posting timeline flexibility',
                'Payment terms (upfront vs. milestone)',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#3A3A3A' }}>
                  <span style={{ color: '#3AAFF4', fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B8A', marginBottom: 8 }}>DON'T NEGOTIATE</div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Quality expectations without budget increase',
                'Adding usage rights without payment increase',
                'Expecting free revisions beyond 1-2 rounds',
                'Demanding brand exclusivity without premium',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#3A3A3A' }}>
                  <span style={{ color: '#FF6B8A', fontWeight: 700 }}>✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Response Scripts */}
      <div style={{ marginTop: 20 }}>
        <h4 style={{ fontWeight: 700, color: '#3A3A3A', marginBottom: 14, fontSize: 15 }}>Response Scripts for Common Situations</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            {
              title: 'If creator counters higher:',
              text: `"I appreciate your work! Our budget is ${formatCurrency(fairMax)} per creator. Could we explore reducing deliverables or usage rights to meet in the middle?"`,
            },
            {
              title: "If creator says rate is too low:",
              text: `"I want to ensure fair compensation. This rate is based on market data for ${inputs.creatorTier} creators. What rate would work for you, and can you share recent campaign results to support it?"`,
            },
            {
              title: 'If you need to stay under budget:',
              text: `"I'd love to work together, but we're at our max budget of ${formatCurrency(fairMin)}. Could we reduce scope to one post instead of two, or shorten usage rights to 30 days?"`,
            },
            {
              title: 'If discussing long-term partnership:',
              text: `"We'd love to make you a brand ambassador! For ongoing partnership (6–12 months), we can offer ${formatCurrency(Math.round(fairMin * 1.1))} per post with guaranteed monthly content."`,
            },
          ].map((script, i) => (
            <div key={i} style={{
              backgroundColor: '#EBF7FF',
              border: '1px solid #A3D9FF',
              borderRadius: 8,
              padding: 14,
            }}>
              <div style={{ fontWeight: 600, color: '#3AAFF4', fontSize: 13, marginBottom: 8 }}>{script.title}</div>
              <p style={{ fontSize: 13, color: '#3A3A3A', fontStyle: 'italic', margin: 0 }}>{script.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tips */}
      <div style={{
        marginTop: 20,
        padding: 16,
        backgroundColor: '#FFF9E0',
        borderRadius: 8,
        border: '2px solid #FFD700',
      }}>
        <div style={{ fontWeight: 700, color: '#3A3A3A', marginBottom: 10, fontSize: 14 }}>🌟 Negotiation Pro Tips</div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Always be respectful — creators talk to each other about brands',
            'Show you\'ve done research — reference their engagement rates and content quality',
            'Offer product/service value on top of payment when possible',
            'Be transparent about your budget constraints',
            'Build relationships, not just transactions — think long-term',
          ].map((tip, i) => (
            <li key={i} style={{ fontSize: 13, color: '#3A3A3A', display: 'flex', gap: 8 }}>
              <span>•</span><span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
