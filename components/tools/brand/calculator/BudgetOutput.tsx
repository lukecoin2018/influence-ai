'use client'

import { DollarSign, TrendingUp, Target, AlertCircle } from 'lucide-react'
import type { BudgetResults, CalculatorInputs } from './types'

interface Props {
  results: BudgetResults
  inputs: CalculatorInputs
}

export default function BudgetOutput({ results, inputs }: Props) {
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

  const getBudgetHealthColor = () => {
    switch (results.budgetHealth) {
      case 'market-rate':  return '#3AAFF4'
      case 'above-market': return '#FFD700'
      case 'below-market': return '#FF6B8A'
    }
  }

  const getBudgetHealthBg = () => {
    switch (results.budgetHealth) {
      case 'market-rate':  return '#EBF7FF'
      case 'above-market': return '#FFF9E0'
      case 'below-market': return '#FFF0F5'
    }
  }

  const getBudgetHealthBorder = () => {
    switch (results.budgetHealth) {
      case 'market-rate':  return '#A3D9FF'
      case 'above-market': return '#FFE44D'
      case 'below-market': return '#FFB3D1'
    }
  }

  const getBudgetHealthText = () => {
    switch (results.budgetHealth) {
      case 'market-rate':  return 'This budget is market rate'
      case 'above-market': return 'This budget is above market rate'
      case 'below-market': return 'This budget is below market rate'
    }
  }

  const dividerStyle = { borderBottom: '1px solid #E5E7EB', paddingBottom: 10, marginBottom: 4 }
  const labelStyle = { fontSize: 13, color: '#6B7280' }
  const valueStyle = { fontSize: 15, fontWeight: 600 as const, color: '#3A3A3A' }
  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}>

      {/* Total Campaign Cost */}
      <div style={{ ...cardStyle, border: '2px solid #FFD700', backgroundColor: '#FFFFF8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <DollarSign style={{ width: 22, height: 22, color: '#FFD700' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Total Campaign Cost</h3>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#3A3A3A', lineHeight: 1.2 }}>
            {formatCurrency(results.breakdown.total.min)} – {formatCurrency(results.breakdown.total.max)}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>
            {formatCurrency(results.breakdown.perCreator.min)} – {formatCurrency(results.breakdown.perCreator.max)} per creator
          </div>
        </div>
      </div>

      {/* Budget Health */}
      <div style={{
        ...cardStyle,
        backgroundColor: getBudgetHealthBg(),
        border: `1px solid ${getBudgetHealthBorder()}`,
        padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle style={{ width: 18, height: 18, color: getBudgetHealthColor(), flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: getBudgetHealthColor(), fontSize: 14 }}>
            {getBudgetHealthText()}
          </span>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div style={cardStyle}>
        <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px 0', fontSize: 15 }}>Budget Breakdown</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          <div style={dividerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Base Creator Fees</span>
              <span style={valueStyle}>
                {formatCurrency(results.breakdown.baseCreatorFees.min)} – {formatCurrency(results.breakdown.baseCreatorFees.max)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {inputs.numberOfCreators} creators × rates
            </div>
          </div>

          {results.breakdown.usageRightsPremiums.max > 0 && (
            <div style={dividerStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelStyle}>Usage Rights</span>
                <span style={{ ...valueStyle, color: '#FFD700' }}>
                  +{formatCurrency(results.breakdown.usageRightsPremiums.min)} – {formatCurrency(results.breakdown.usageRightsPremiums.max)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {inputs.usageRightsDuration.replace('-', ' ')}
              </div>
            </div>
          )}

          {results.breakdown.exclusivityPremiums.max > 0 && (
            <div style={dividerStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelStyle}>Exclusivity</span>
                <span style={{ ...valueStyle, color: '#FFD700' }}>
                  +{formatCurrency(results.breakdown.exclusivityPremiums.min)} – {formatCurrency(results.breakdown.exclusivityPremiums.max)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {inputs.exclusivity.replace('-', ' ')}
              </div>
            </div>
          )}

          {results.breakdown.productionQuality.max > 0 && (
            <div style={dividerStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelStyle}>Production Quality</span>
                <span style={{ ...valueStyle, color: '#FFD700' }}>
                  +{formatCurrency(results.breakdown.productionQuality.min)} – {formatCurrency(results.breakdown.productionQuality.max)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {inputs.contentQuality} quality
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expected Results */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Target style={{ width: 18, height: 18, color: '#3AAFF4' }} />
          <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: 0, fontSize: 15 }}>Expected Results</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Total Potential Reach', value: `${formatNumber(results.expectedResults.reach.min)} – ${formatNumber(results.expectedResults.reach.max)}`, highlight: false },
            { label: 'Estimated Impressions', value: `${formatNumber(results.expectedResults.impressions.min)} – ${formatNumber(results.expectedResults.impressions.max)}`, highlight: false },
            { label: 'Estimated Engagement', value: `${formatNumber(results.expectedResults.engagement.min)} – ${formatNumber(results.expectedResults.engagement.max)}`, highlight: false },
          ].map(item => (
            <div key={item.label}>
              <div style={labelStyle}>{item.label}</div>
              <div style={valueStyle}>{item.value}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
            <div style={labelStyle}>Cost Per Engagement</div>
            <div style={{ ...valueStyle, color: '#FFD700', fontSize: 16 }}>
              {formatCurrency(results.expectedResults.costPerEngagement.min)} – {formatCurrency(results.expectedResults.costPerEngagement.max)}
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Tips */}
      {results.optimizationTips.length > 0 && (
        <div style={{ ...cardStyle, backgroundColor: '#EBF7FF', border: '1px solid #A3D9FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#3AAFF4' }} />
            <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: 0, fontSize: 15 }}>Optimization Tips</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.optimizationTips.map((tip, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                <span>💡</span>
                <span style={{ color: '#3A3A3A' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Red Flags */}
      {results.redFlags.length > 0 && (
        <div style={{ ...cardStyle, backgroundColor: '#FFF0F5', border: '2px solid #FFB3D1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertCircle style={{ width: 18, height: 18, color: '#FF6B8A' }} />
            <h4 style={{ fontWeight: 700, color: '#3A3A3A', margin: 0, fontSize: 15 }}>Red Flags to Avoid</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.redFlags.map((flag, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                <span>🚫</span>
                <span style={{ color: '#3A3A3A' }}>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
