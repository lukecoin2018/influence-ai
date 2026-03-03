'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, CompensationType, PaymentStructure, UsageRightsDuration, ExclusivityType, ContentOwnership } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign } from '@/lib/brand-storage';

export default function CompensationPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  
  const [compensationType, setCompensationType] = useState<CompensationType>('fixed-rate');
  const [fixedAmount, setFixedAmount] = useState('');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [productValue, setProductValue] = useState('');
  const [additionalPerks, setAdditionalPerks] = useState('');
  
  const [paymentStructure, setPaymentStructure] = useState<PaymentStructure>('on-completion');
  const [paymentTimeline, setPaymentTimeline] = useState('30 days');
  const [paymentMethod, setPaymentMethod] = useState('PayPal');
  
  const [usageRightsDuration, setUsageRightsDuration] = useState<UsageRightsDuration>('90');
  const [usageTypes, setUsageTypes] = useState<string[]>([]);
  
  const [exclusivity, setExclusivity] = useState<ExclusivityType>('none');
  const [exclusivityDuration, setExclusivityDuration] = useState('');
  const [exclusivityCategories, setExclusivityCategories] = useState('');
  
  const [contentOwnership, setContentOwnership] = useState<ContentOwnership>('creator-retains');

  const usageTypeOptions = [
    'Organic social media posts only',
    'Paid advertising allowed',
    'Website/marketing materials',
    'Print materials',
    'Retail/in-store displays',
    'Email marketing'
  ];

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
    setCampaign(existing);
    setCompensationType(existing.compensation.type);
    setFixedAmount(existing.compensation.fixedAmount?.toString() || '');
    setRangeMin(existing.compensation.rangeMin?.toString() || '');
    setRangeMax(existing.compensation.rangeMax?.toString() || '');
    setProductValue(existing.compensation.productValue?.toString() || '');
    setAdditionalPerks(existing.compensation.additionalPerks || '');
    setPaymentStructure(existing.compensation.paymentStructure);
    setPaymentTimeline(existing.compensation.paymentTimeline);
    setPaymentMethod(existing.compensation.paymentMethod);
    setUsageRightsDuration(existing.compensation.usageRightsDuration);
    setUsageTypes(existing.compensation.usageTypes);
    setExclusivity(existing.compensation.exclusivity);
    setExclusivityDuration(existing.compensation.exclusivityDuration || '');
    setExclusivityCategories(existing.compensation.exclusivityCategories || '');
    setContentOwnership(existing.compensation.contentOwnership);
  }, [router]);

  const toggleUsageType = (type: string) => {
    setUsageTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const canProceed = true; // All fields are optional with defaults

  const handleSave = () => {
    if (!campaign) return;

    campaign.compensation = {
      type: compensationType,
      fixedAmount: compensationType === 'fixed-rate' && fixedAmount ? parseFloat(fixedAmount) : undefined,
      rangeMin: (compensationType === 'fixed-rate' || compensationType === 'negotiable') && rangeMin ? parseFloat(rangeMin) : undefined,
      rangeMax: (compensationType === 'fixed-rate' || compensationType === 'negotiable') && rangeMax ? parseFloat(rangeMax) : undefined,
      productValue: compensationType === 'product-only' && productValue ? parseFloat(productValue) : undefined,
      additionalPerks,
      paymentStructure,
      paymentTimeline,
      paymentMethod,
      usageRightsDuration,
      usageTypes,
      exclusivity,
      exclusivityDuration: exclusivity !== 'none' ? exclusivityDuration : undefined,
      exclusivityCategories: exclusivity === 'category' ? exclusivityCategories : undefined,
      contentOwnership
    };
    campaign.currentStep = 6;
    campaign.updatedAt = new Date().toISOString();
    
    saveCampaign(campaign);
  };

  const handleContinue = () => {
    handleSave();
    router.push('/builder/review');
  };

  if (!campaign) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={6} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Compensation & Terms</h1>
            <p className="text-gray-400">Define payment, usage rights, and partnership terms</p>
          </div>

          {/* Compensation Type */}
          <FormSection 
            title="Budget & Compensation" 
            description="How will you compensate creators?"
          >
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => setCompensationType('fixed-rate')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${compensationType === 'fixed-rate'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Fixed Rate</div>
                <div className="text-sm opacity-80">Set payment amount</div>
              </button>

              <button
                onClick={() => setCompensationType('negotiable')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${compensationType === 'negotiable'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Negotiable</div>
                <div className="text-sm opacity-80">Budget range to discuss</div>
              </button>

              <button
                onClick={() => setCompensationType('product-only')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${compensationType === 'product-only'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Product Gifting</div>
                <div className="text-sm opacity-80">Product exchange only</div>
              </button>
            </div>

            {compensationType === 'fixed-rate' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={fixedAmount}
                      onChange={(e) => setFixedAmount(e.target.value)}
                      placeholder="500"
                      className="w-full pl-8 pr-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Or Budget Range (Optional)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={rangeMin}
                        onChange={(e) => setRangeMin(e.target.value)}
                        placeholder="Min"
                        className="w-full pl-7 pr-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                      />
                    </div>
                    <span className="text-gray-400 self-center">-</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={rangeMax}
                        onChange={(e) => setRangeMax(e.target.value)}
                        placeholder="Max"
                        className="w-full pl-7 pr-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {compensationType === 'negotiable' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Budget Range
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={rangeMin}
                      onChange={(e) => setRangeMin(e.target.value)}
                      placeholder="Minimum"
                      className="w-full pl-8 pr-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                  <span className="text-gray-400 self-center">to</span>
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={rangeMax}
                      onChange={(e) => setRangeMax(e.target.value)}
                      placeholder="Maximum"
                      className="w-full pl-8 pr-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {compensationType === 'product-only' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Retail Value
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={productValue}
                    onChange={(e) => setProductValue(e.target.value)}
                    placeholder="150"
                    className="w-full pl-8 pr-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Perks (Optional)
              </label>
              <textarea
                value={additionalPerks}
                onChange={(e) => setAdditionalPerks(e.target.value)}
                placeholder="e.g., Affiliate commission, exclusive discount code, future partnership opportunities..."
                rows={3}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>
          </FormSection>

          {/* Payment Terms */}
          <FormSection 
            title="Payment Terms" 
            description="When and how will payment be made?"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Payment Structure
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentStructure('upfront-100')}
                  className={`
                    p-3 rounded-lg text-left transition-all
                    ${paymentStructure === 'upfront-100'
                      ? 'bg-brand-blue text-white'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  100% Upfront
                </button>

                <button
                  onClick={() => setPaymentStructure('split-50-50')}
                  className={`
                    p-3 rounded-lg text-left transition-all
                    ${paymentStructure === 'split-50-50'
                      ? 'bg-brand-blue text-white'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  50% Upfront, 50% on Delivery
                </button>

                <button
                  onClick={() => setPaymentStructure('on-completion')}
                  className={`
                    p-3 rounded-lg text-left transition-all
                    ${paymentStructure === 'on-completion'
                      ? 'bg-brand-blue text-white'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  100% on Completion
                </button>

                <button
                  onClick={() => setPaymentStructure('custom')}
                  className={`
                    p-3 rounded-lg text-left transition-all
                    ${paymentStructure === 'custom'
                      ? 'bg-brand-blue text-white'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  Custom Structure
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Timeline
                </label>
                <input
                  type="text"
                  value={paymentTimeline}
                  onChange={(e) => setPaymentTimeline(e.target.value)}
                  placeholder="e.g., 30 days of content going live"
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g., PayPal, Bank Transfer, Venmo"
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
              </div>
            </div>
          </FormSection>

          {/* Usage Rights */}
          <FormSection 
            title="Usage Rights" 
            description="How can you use the creator's content?"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Duration
              </label>
              <div className="flex flex-wrap gap-3">
                {(['30', '60', '90', '180', '365', 'perpetual'] as UsageRightsDuration[]).map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setUsageRightsDuration(duration)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all
                      ${usageRightsDuration === duration
                        ? 'bg-brand-pink text-white'
                        : 'bg-black text-gray-400 hover:text-white'
                      }
                    `}
                  >
                    {duration === 'perpetual' ? 'Perpetual' : `${duration} days`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Usage Types (select all that apply)
              </label>
              <div className="space-y-3">
                {usageTypeOptions.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 p-4 bg-black rounded-lg cursor-pointer hover:bg-opacity-80 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={usageTypes.includes(type)}
                      onChange={() => toggleUsageType(type)}
                      className="flex-shrink-0"
                    />
                    <span className="text-white">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          {/* Exclusivity */}
          <FormSection 
            title="Exclusivity" 
            description="Can creators work with competitors?"
          >
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => setExclusivity('none')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${exclusivity === 'none'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">No Exclusivity</div>
                <div className="text-sm opacity-80">Can work with anyone</div>
              </button>

              <button
                onClick={() => setExclusivity('category')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${exclusivity === 'category'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Category Exclusivity</div>
                <div className="text-sm opacity-80">No competing brands</div>
              </button>

              <button
                onClick={() => setExclusivity('full')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${exclusivity === 'full'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Full Exclusivity</div>
                <div className="text-sm opacity-80">No other brands at all</div>
              </button>
            </div>

            {exclusivity !== 'none' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Exclusivity Duration
                  </label>
                  <input
                    type="text"
                    value={exclusivityDuration}
                    onChange={(e) => setExclusivityDuration(e.target.value)}
                    placeholder="e.g., 90 days, 6 months"
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                  />
                </div>

                {exclusivity === 'category' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Excluded Categories
                    </label>
                    <input
                      type="text"
                      value={exclusivityCategories}
                      onChange={(e) => setExclusivityCategories(e.target.value)}
                      placeholder="e.g., other skincare brands, beauty products"
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* Content Ownership */}
          <FormSection 
            title="Content Ownership" 
            description="Who owns the created content?"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setContentOwnership('creator-retains')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${contentOwnership === 'creator-retains'
                    ? 'bg-brand-blue text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Creator Retains</div>
                <div className="text-sm opacity-80">Brand has license only</div>
              </button>

              <button
                onClick={() => setContentOwnership('shared')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${contentOwnership === 'shared'
                    ? 'bg-brand-blue text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Shared Ownership</div>
                <div className="text-sm opacity-80">Both can use freely</div>
              </button>

              <button
                onClick={() => setContentOwnership('brand-owns')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${contentOwnership === 'brand-owns'
                    ? 'bg-brand-blue text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Brand Owns</div>
                <div className="text-sm opacity-80">Full rights transfer</div>
              </button>

              <button
                onClick={() => setContentOwnership('custom')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${contentOwnership === 'custom'
                    ? 'bg-brand-blue text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Custom</div>
                <div className="text-sm opacity-80">Special arrangement</div>
              </button>
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation
        currentStep={6}
        totalSteps={9}
        nextHref="/builder/review"
        prevHref="/builder/timeline"
        onSave={handleSave}
        canProceed={canProceed}
      />
    </div>
  );
}