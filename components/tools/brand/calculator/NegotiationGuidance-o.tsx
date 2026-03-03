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

  // Calculate negotiation ranges
  const fairMin = results.breakdown.perCreator.min
  const fairMax = results.breakdown.perCreator.max
  const openingOffer = Math.round(fairMin * 0.85) // 85% of fair minimum
  const dontGoBelowMin = Math.round(fairMin * 0.70) // 70% is lowball territory
  const maxJustified = Math.round(fairMax * 1.15) // 115% if exceptional value

  return (
    <div className="bg-brand-grey rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-brand-yellow" />
        <h3 className="text-2xl font-bold text-white">Negotiation Guidance</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opening Offer Strategy */}
        <div className="bg-black rounded-lg p-5 border-2 border-gray-700">
          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand-blue" />
            Opening Offer Strategy
          </h4>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400">Start at (per creator)</div>
              <div className="text-2xl font-bold text-brand-yellow">{formatCurrency(openingOffer)}</div>
              <div className="text-xs text-gray-500 mt-1">~85% of calculated fair rate</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Fair range</div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(fairMin)} - {formatCurrency(fairMax)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Don't go below</div>
              <div className="text-lg font-semibold text-brand-pink">{formatCurrency(dontGoBelowMin)}</div>
              <div className="text-xs text-gray-500 mt-1">Lowball territory - damages relationships</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Maximum justified</div>
              <div className="text-lg font-semibold text-brand-blue">{formatCurrency(maxJustified)}</div>
              <div className="text-xs text-gray-500 mt-1">If creator proves exceptional value</div>
            </div>
          </div>
        </div>

        {/* What to Negotiate */}
        <div className="bg-black rounded-lg p-5 border-2 border-gray-700">
          <h4 className="font-bold text-white mb-4">What to Negotiate</h4>
          
          <div className="mb-4">
            <div className="text-sm font-semibold text-brand-blue mb-2">GOOD TO NEGOTIATE</div>
            <ul className="space-y-2">
              {[
                'Total deliverable count',
                'Usage rights duration',
                'Exclusivity terms',
                'Posting timeline flexibility',
                'Payment terms (upfront vs. milestone)',
              ].map((item, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-brand-blue">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-brand-pink mb-2">DON'T NEGOTIATE</div>
            <ul className="space-y-2">
              {[
                'Quality expectations without budget increase',
                'Adding usage rights without payment increase',
                'Expecting free revisions beyond 1-2 rounds',
                'Demanding brand exclusivity without premium',
              ].map((item, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-brand-pink">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Response Scripts */}
      <div className="mt-6 space-y-4">
        <h4 className="font-bold text-white">Response Scripts for Common Situations</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black rounded-lg p-4 border-2 border-brand-blue">
            <div className="font-semibold text-brand-blue mb-2">If creator counters higher:</div>
            <p className="text-sm text-gray-300 italic">
              "I appreciate your work! Our budget is {formatCurrency(fairMax)} per creator. 
              Could we explore reducing deliverables or usage rights to meet in the middle?"
            </p>
          </div>

          <div className="bg-black rounded-lg p-4 border-2 border-brand-blue">
            <div className="font-semibold text-brand-blue mb-2">If creator says rate is too low:</div>
            <p className="text-sm text-gray-300 italic">
              "I want to ensure fair compensation. This rate is based on market data for {inputs.creatorTier} creators. 
              What rate would work for you, and can you share recent campaign results to support it?"
            </p>
          </div>

          <div className="bg-black rounded-lg p-4 border-2 border-brand-blue">
            <div className="font-semibold text-brand-blue mb-2">If you need to stay under budget:</div>
            <p className="text-sm text-gray-300 italic">
              "I'd love to work together, but we're at our max budget of {formatCurrency(fairMin)}. 
              Could we reduce scope to one post instead of two, or shorten usage rights to 30 days?"
            </p>
          </div>

          <div className="bg-black rounded-lg p-4 border-2 border-brand-blue">
            <div className="font-semibold text-brand-blue mb-2">If discussing long-term partnership:</div>
            <p className="text-sm text-gray-300 italic">
              "We'd love to make you a brand ambassador! For ongoing partnership (6-12 months), 
              we can offer {formatCurrency(Math.round(fairMin * 1.1))} per post with guaranteed monthly content."
            </p>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="mt-6 p-4 bg-black rounded-lg border-2 border-brand-yellow">
        <div className="font-semibold text-brand-yellow mb-2">🌟 Negotiation Pro Tips</div>
        <ul className="space-y-1 text-sm text-gray-300">
          <li>• Always be respectful - creators talk to each other about brands</li>
          <li>• Show you've done research - reference their engagement rates and content quality</li>
          <li>• Offer product/service value on top of payment when possible</li>
          <li>• Be transparent about your budget constraints</li>
          <li>• Build relationships, not just transactions - think long-term</li>
        </ul>
      </div>
    </div>
  )
}