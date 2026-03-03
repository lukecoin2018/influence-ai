'use client'

import { TrendingUp } from 'lucide-react'
import type { CalculatorInputs } from './types'

interface Props {
  inputs: CalculatorInputs
  updateInputs: (updates: Partial<CalculatorInputs>) => void
}

export default function CreatorCharacteristics({ inputs, updateInputs }: Props) {
  return (
    <div className="bg-brand-grey rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
        <TrendingUp className="w-6 h-6 text-brand-yellow" />
        <h2 className="text-2xl font-bold text-white">Creator Characteristics</h2>
      </div>

      {/* Niche/Category */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Niche/Category
        </label>
        <select
          value={inputs.niche}
          onChange={(e) => updateInputs({ niche: e.target.value as any })}
          className="w-full px-4 py-3 bg-black text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
        >
          <option value="beauty">Beauty/Skincare - Premium rates</option>
          <option value="fashion">Fashion - Premium rates</option>
          <option value="fitness">Fitness/Health - High rates</option>
          <option value="tech">Tech/Gaming - High rates</option>
          <option value="food">Food/Cooking - Medium rates</option>
          <option value="lifestyle">Lifestyle - Medium rates</option>
          <option value="travel">Travel - Medium rates</option>
          <option value="parenting">Parenting - Medium-high rates</option>
          <option value="finance">Finance - Premium rates</option>
          <option value="b2b">B2B/Business - Premium rates</option>
          <option value="other">Other - Medium rates</option>
        </select>
        <p className="mt-2 text-sm text-gray-400">
          Different niches have different rate standards based on typical brand budgets in those industries.
        </p>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Creator Location
        </label>
        <select
          value={inputs.location}
          onChange={(e) => updateInputs({ location: e.target.value as any })}
          className="w-full px-4 py-3 bg-black text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
        >
          <option value="us">United States - Base rates (highest)</option>
          <option value="uk">United Kingdom - 80-90% of US rates</option>
          <option value="canada">Canada - 85-95% of US rates</option>
          <option value="australia">Australia - 85-95% of US rates</option>
          <option value="europe">Europe - 70-90% of US rates</option>
          <option value="other">Other regions - 50-80% of US rates</option>
        </select>
      </div>

      {/* Content Quality */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Content Quality Expectations
        </label>
        <div className="space-y-3">
          {[
            { value: 'ugc', label: 'UGC Style (casual, authentic)', premium: 'Base rate' },
            { value: 'professional', label: 'Professional (polished, high production)', premium: '+20-40%' },
            { value: 'studio', label: 'Studio Quality (professional shoot)', premium: '+50-100%' },
          ].map(option => (
            <label
              key={option.value}
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                inputs.contentQuality === option.value
                  ? 'border-brand-yellow bg-black'
                  : 'border-gray-700 bg-black hover:border-brand-blue'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="contentQuality"
                    value={option.value}
                    checked={inputs.contentQuality === option.value}
                    onChange={(e) => updateInputs({ contentQuality: e.target.value as any })}
                  />
                  <span className="text-white">{option.label}</span>
                </div>
                <span className="text-sm text-brand-yellow">{option.premium}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}