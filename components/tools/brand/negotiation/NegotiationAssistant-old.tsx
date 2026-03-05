'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Sparkles, History } from 'lucide-react'
import Step1Scenario from './steps/Step1Scenario'
import Step2Context from './steps/Step2Context'
import Step3Goals from './steps/Step3Goals'
import Step4Responses from './steps/Step4Responses'
import SavedResponsesModal from './SavedResponsesModal'

export interface NegotiationData {
  scenario: string
  scenarioDetails: {
    yourOffer?: string
    creatorCounter?: string
    maxBudget?: string
    requestedDeliverables?: string
    proposedDeliverables?: string
    reason?: string
    yourRequirements?: string
    creatorConcern?: string
    requestedRights?: string
    proposedRights?: string
    requestedExclusivity?: string
    creatorExclusivityConcern?: string
    yourDeadline?: string
    requestedDate?: string
    declineReason?: string
    wantTo?: string
    briefSentDate?: string
    daysSince?: string
    multiplePoints?: string
  }
  followerCount: string
  engagementRate: string
  niche: string
  pastWorkQuality: string
  professionalism: string
  creatorImportance: string
  budgetFlexibility: string
  scopeFlexibility: string
  timelineFlexibility: string
  requirementsFlexibility: string
  priorities: string[]
  willingTo: string[]
}

export interface SavedResponse {
  id: string
  timestamp: number
  scenario: string
  responses: ResponseOption[]
  scenarioDetails: any
}

export interface ResponseOption {
  strategy: string
  approach: string
  response: string
  whenToUse: string
}

export default function NegotiationAssistant() {
  const [currentStep, setCurrentStep] = useState(1)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [data, setData] = useState<NegotiationData>({
    scenario: '',
    scenarioDetails: {},
    followerCount: '',
    engagementRate: '',
    niche: '',
    pastWorkQuality: '',
    professionalism: '',
    creatorImportance: '',
    budgetFlexibility: '',
    scopeFlexibility: '',
    timelineFlexibility: '',
    requirementsFlexibility: '',
    priorities: [],
    willingTo: [],
  })

  useEffect(() => {
    const saved = localStorage.getItem('negotiationData')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setData(parsed.data || data)
        setCurrentStep(parsed.step || 1)
      } catch (e) {
        console.error('Failed to load saved data:', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('negotiationData', JSON.stringify({ data, step: currentStep }))
  }, [data, currentStep])

  const updateData = (updates: Partial<NegotiationData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.scenario !== '' &&
               (data.scenario === 'multiple' ?
                 data.scenarioDetails.multiplePoints?.trim() :
                 Object.keys(data.scenarioDetails).length > 0)
      case 2:
        return data.followerCount !== '' &&
               data.niche !== '' &&
               data.creatorImportance !== '' &&
               data.budgetFlexibility !== '' &&
               data.scopeFlexibility !== '' &&
               data.timelineFlexibility !== '' &&
               data.requirementsFlexibility !== ''
      case 3:
        return data.priorities.length > 0 && data.willingTo.length > 0
      default:
        return true
    }
  }

  const resetForm = () => {
    const emptyData: NegotiationData = {
      scenario: '',
      scenarioDetails: {},
      followerCount: '',
      engagementRate: '',
      niche: '',
      pastWorkQuality: '',
      professionalism: '',
      creatorImportance: '',
      budgetFlexibility: '',
      scopeFlexibility: '',
      timelineFlexibility: '',
      requirementsFlexibility: '',
      priorities: [],
      willingTo: [],
    }
    setData(emptyData)
    setCurrentStep(1)
    localStorage.removeItem('negotiationData')
  }

  const steps = [
    { num: 1, label: 'Scenario' },
    { num: 2, label: 'Context' },
    { num: 3, label: 'Goals' },
    { num: 4, label: 'Responses' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>

      {/* Header */}
      <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '20px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkles style={{ width: 26, height: 26, color: '#FFD700' }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Negotiation Assistant for Brands</h1>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Navigate creator negotiations with professional, strategic responses</p>
            </div>
          </div>
          <button
            onClick={() => setShowSavedModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              border: '1px solid #3AAFF4',
              backgroundColor: '#EBF7FF',
              color: '#3AAFF4',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <History style={{ width: 16, height: 16 }} />
            Saved Responses
          </button>
        </div>
      </header>

      {/* Progress Steps */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '16px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  backgroundColor: currentStep === step.num ? '#FFD700' : currentStep > step.num ? '#3AAFF4' : '#F3F4F6',
                  color: currentStep === step.num ? '#3A3A3A' : currentStep > step.num ? '#FFFFFF' : '#9CA3AF',
                }}>
                  {step.num}
                </div>
                <span style={{
                  fontSize: 14, fontWeight: currentStep === step.num ? 600 : 400,
                  color: currentStep >= step.num ? '#3A3A3A' : '#9CA3AF',
                }}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 16px',
                  backgroundColor: currentStep > step.num ? '#3AAFF4' : '#E5E7EB',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
        {currentStep === 1 && <Step1Scenario data={data} updateData={updateData} />}
        {currentStep === 2 && <Step2Context data={data} updateData={updateData} />}
        {currentStep === 3 && <Step3Goals data={data} updateData={updateData} />}
        {currentStep === 4 && <Step4Responses data={data} resetForm={resetForm} />}
      </div>

      {/* Bottom Navigation */}
      {currentStep < 4 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          padding: '14px 32px',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                color: currentStep === 1 ? '#9CA3AF' : '#3A3A3A',
                fontSize: 14, fontWeight: 600,
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                opacity: currentStep === 1 ? 0.4 : 1,
              }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
              Back
            </button>

            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 8,
                border: 'none',
                backgroundColor: '#FFD700',
                color: '#3A3A3A',
                fontSize: 14, fontWeight: 700,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                opacity: canProceed() ? 1 : 0.35,
              }}
            >
              {currentStep === 3 ? 'Generate Responses' : 'Continue'}
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {showSavedModal && (
        <SavedResponsesModal onClose={() => setShowSavedModal(false)} />
      )}
    </div>
  )
}
