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

  return (
    <div className="bg-brand-grey rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
        <DollarSign className="w-6 h-6 text-brand-yellow" />
        <h2 className="text-2xl font-bold text-white">Usage Rights & Exclusivity</h2>
      </div>

      {/* Usage Rights Duration */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Usage Rights Duration
        </label>
        <select
          value={inputs.usageRightsDuration}
          onChange={(e) => updateInputs({ usageRightsDuration: e.target.value as any })}
          className="w-full px-4 py-3 bg-black text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
        >
          <option value="organic-only">Organic posts only (30 days) - Base rate</option>
          <option value="30-days">30 days (organic + paid ads) - +20-30%</option>
          <option value="60-days">60 days (organic + paid ads) - +40-50%</option>
          <option value="90-days">90 days (organic + paid ads) - +60-80%</option>
          <option value="6-months">6 months - +100-120%</option>
          <option value="1-year">1 year - +150-200%</option>
          <option value="perpetual">Perpetual/unlimited - +200-300%</option>
        </select>
      </div>

      {/* Usage Rights Types */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Usage Rights Types
        </label>
        <div className="space-y-2">
          {[
            { key: 'organicOnly', label: 'Organic social media only', premium: 'Base rate' },
            { key: 'paidAds', label: 'Paid social ads', premium: '+20-40%' },
            { key: 'whitelisting', label: 'Whitelisting (ads from creator account)', premium: '+30-50%' },
            { key: 'websiteEmail', label: 'Website/email marketing', premium: '+15-25%' },
            { key: 'print', label: 'Print materials', premium: '+25-40%' },
            { key: 'retail', label: 'Retail/in-store displays', premium: '+40-60%' },
            { key: 'commercial', label: 'Commercial/TV', premium: '+100-200%' },
          ].map(option => (
            <label
              key={option.key}
              className="flex items-center gap-3 p-3 bg-black border-2 border-gray-700 rounded-lg hover:border-brand-blue cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={inputs.usageRightsTypes[option.key as keyof typeof inputs.usageRightsTypes]}
                onChange={(e) => updateUsageType(option.key as any, e.target.checked)}
              />
              <span className="flex-1 text-white">{option.label}</span>
              <span className="text-sm text-brand-yellow">{option.premium}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Exclusivity */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Exclusivity Requirements
        </label>
        <select
          value={inputs.exclusivity}
          onChange={(e) => updateInputs({ exclusivity: e.target.value as any })}
          className="w-full px-4 py-3 bg-black text-white border-2 border-gray-700 rounded-lg focus:outline-none focus:border-brand-yellow transition-colors"
        >
          <option value="none">No exclusivity - Base rate</option>
          <option value="category-30">Category exclusivity (30 days) - +10-20%</option>
          <option value="category-60">Category exclusivity (60 days) - +20-30%</option>
          <option value="category-90">Category exclusivity (90 days) - +30-40%</option>
          <option value="full-30">Full exclusivity (30 days) - +30-50%</option>
          <option value="full-60">Full exclusivity (60 days) - +50-80%</option>
          <option value="full-90">Full exclusivity (90 days) - +80-120%</option>
        </select>
        <div className="mt-3 p-3 bg-black rounded-lg border-2 border-brand-blue">
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-brand-blue flex-shrink-0" />
            <p className="text-sm text-gray-300">
              <strong>Category exclusivity:</strong> Creator can't promote competing brands in your category.
              <br />
              <strong>Full exclusivity:</strong> Creator can't promote any other brands.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}