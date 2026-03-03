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
    return <Icon className="w-5 h-5 text-brand-yellow" />
  }

  return (
    <div className="bg-brand-grey rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-6 h-6 text-brand-yellow" />
        <h3 className="text-2xl font-bold text-white">Alternative Scenarios</h3>
      </div>
      <p className="text-gray-400 mb-6">
        Explore different creator strategies to find the best fit for your campaign goals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {results.alternatives.map((scenario, index) => (
          <div key={index} className="bg-black rounded-lg p-5 border-2 border-gray-700 hover:border-brand-blue transition-colors">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              {getScenarioIcon(index)}
              <h4 className="font-bold text-white">{scenario.name}</h4>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-4">{scenario.description}</p>

            {/* Key Metrics */}
            <div className="space-y-3 mb-4 pb-4 border-b border-gray-700">
              <div>
                <div className="text-xs text-gray-500">Cost Range</div>
                <div className="text-lg font-semibold text-brand-yellow">
                  {formatCurrency(scenario.cost.min)} - {formatCurrency(scenario.cost.max)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Estimated Reach</div>
                <div className="text-sm font-semibold text-white">
                  {formatNumber(scenario.reach.min)} - {formatNumber(scenario.reach.max)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Creator Mix</div>
                <div className="text-sm font-semibold text-white">
                  {scenario.creatorCount} × {scenario.creatorTier}
                </div>
              </div>
            </div>

            {/* Pros */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-brand-blue mb-2">PROS</div>
              <ul className="space-y-1">
                {scenario.pros.map((pro, i) => (
                  <li key={i} className="text-xs text-gray-300 flex gap-2">
                    <span className="text-brand-blue">✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <div className="text-xs font-semibold text-brand-pink mb-2">CONS</div>
              <ul className="space-y-1">
                {scenario.cons.map((con, i) => (
                  <li key={i} className="text-xs text-gray-300 flex gap-2">
                    <span className="text-brand-pink">✗</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Insight */}
      <div className="mt-6 p-4 bg-black rounded-lg border-2 border-brand-blue">
        <p className="text-sm text-gray-300">
          <strong className="text-brand-blue">💡 Pro Tip:</strong> Micro creators typically have 2x the engagement rate of macro creators at 1/3 the cost. 
          Consider your priority: maximum reach or authentic engagement?
        </p>
      </div>
    </div>
  )
}