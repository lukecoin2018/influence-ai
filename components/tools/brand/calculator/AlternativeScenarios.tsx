'use client'

import { Lightbulb, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import type { BudgetResults, CalculatorInputs } from './types'

interface Props {
  results: BudgetResults
  inputs: CalculatorInputs
}

export default function AlternativeScenarios({ results, inputs }: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getScenarioIcon = (index: number) => {
    const icons = [TrendingUp, TrendingDown, BarChart3]
    const Icon = icons[index] || Lightbulb
    return <Icon style={{ width: 18, height: 18, color: '#FFD700' }} />
  }

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Lightbulb style={{ width: 22, height: 22, color: '#FFD700' }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Alternative Scenarios</h3>
      </div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
        Explore different creator strategies to find the best fit for your campaign goals.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {results.alternatives.map((scenario, index) => (
          <div key={index} style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: 18,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {getScenarioIcon(index)}
              <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: 0, fontSize: 15 }}>{scenario.name}</h4>
            </div>

            {/* Description */}
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>{scenario.description}</p>

            {/* Key Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Cost Range</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFD700' }}>
                  {formatCurrency(scenario.cost.min)} – {formatCurrency(scenario.cost.max)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Estimated Reach</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3A' }}>
                  {formatNumber(scenario.reach.min)} – {formatNumber(scenario.reach.max)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Creator Mix</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3A' }}>
                  {scenario.creatorCount} × {scenario.creatorTier}
                </div>
              </div>
            </div>

            {/* Pros */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3AAFF4', marginBottom: 6 }}>PROS</div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
                {scenario.pros.map((pro, i) => (
                  <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#3A3A3A' }}>
                    <span style={{ color: '#3AAFF4', fontWeight: 700 }}>✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B8A', marginBottom: 6 }}>CONS</div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
                {scenario.cons.map((con, i) => (
                  <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#3A3A3A' }}>
                    <span style={{ color: '#FF6B8A', fontWeight: 700 }}>✗</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Insight */}
      <div style={{
        marginTop: 20,
        padding: 14,
        backgroundColor: '#EBF7FF',
        borderRadius: 8,
        border: '1px solid #A3D9FF',
      }}>
        <p style={{ fontSize: 13, color: '#3A3A3A', margin: 0 }}>
          <strong style={{ color: '#3AAFF4' }}>💡 Pro Tip:</strong> Micro creators typically have 2× the engagement rate of macro creators at 1/3 the cost.
          Consider your priority: maximum reach or authentic engagement?
        </p>
      </div>
    </div>
  )
}
