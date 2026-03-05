'use client'

import { useState, useEffect } from 'react'
import { Calculator, TrendingUp, Users, FileText, DollarSign, Save, Download, Mail, Share2, FolderOpen, X, Trash2 } from 'lucide-react'
import CampaignScope from './CampaignScope'
import ContentRequirements from './ContentRequirements'
import UsageRights from './UsageRights'
import CreatorCharacteristics from './CreatorCharacteristics'
import BudgetOutput from './BudgetOutput'
import AlternativeScenarios from './AlternativeScenarios'
import NegotiationGuidance from './NegotiationGuidance'
import { calculateBudget } from './calculations'
import type { CalculatorInputs, BudgetResults } from './types'
import { useTokenGate } from '@/hooks/useTokenGate'
import { TokenGateModal } from '@/components/shared/TokenGateModal'

interface SavedCalculation {
  id: string
  inputs: CalculatorInputs
  results: BudgetResults
  timestamp: string
  name?: string
}

export default function BudgetCalculator() {
  const { checking, blocked, balance, needed, checkAndCharge, dismiss } = useTokenGate()

  const [inputs, setInputs] = useState<CalculatorInputs>({
    numberOfCreators: 5,
    creatorTier: 'micro',
    customFollowerCount: null,
    engagementLevel: 'good',
    platforms: {
      instagram: { selected: true, feedPosts: 1, reels: 1, stories: 1 },
      tiktok: { selected: false, videos: 0 },
      youtube: { selected: false, dedicatedVideos: 0, integrations: 0, shorts: 0 },
      blog: { selected: false, posts: 0 },
    },
    usageRightsDuration: 'organic-only',
    usageRightsTypes: {
      organicOnly: true, paidAds: false, whitelisting: false,
      websiteEmail: false, print: false, retail: false, commercial: false,
    },
    exclusivity: 'none',
    niche: 'lifestyle',
    location: 'us',
    contentQuality: 'ugc',
  })

  const [results, setResults] = useState<BudgetResults | null>(null)
  const [activeSection, setActiveSection] = useState(1)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([])

  useEffect(() => { setResults(calculateBudget(inputs)) }, [inputs])
  useEffect(() => { loadSavedCalculations() }, [])

  const updateInputs = (updates: Partial<CalculatorInputs>) =>
    setInputs(prev => ({ ...prev, ...updates }))

  const loadSavedCalculations = () => {
    try {
      const saved = localStorage.getItem('savedBudgetCalculations')
      if (saved) setSavedCalculations(JSON.parse(saved))
    } catch {}
  }

  const saveCalculation = () => {
    const name = prompt('Give this calculation a name (optional):')
    const newCalc: SavedCalculation = {
      id: Date.now().toString(), inputs, results: results!,
      timestamp: new Date().toISOString(), name: name || undefined,
    }
    try {
      const existing = localStorage.getItem('savedBudgetCalculations')
      const calcs = existing ? JSON.parse(existing) : []
      const limited = [newCalc, ...calcs].slice(0, 10)
      localStorage.setItem('savedBudgetCalculations', JSON.stringify(limited))
      setSavedCalculations(limited)
      alert('Calculation saved!')
    } catch {}
  }

  const loadCalculation = (calc: SavedCalculation) => {
    setInputs(calc.inputs)
    setShowSavedModal(false)
    setActiveSection(1)
  }

  const deleteCalculation = (id: string) => {
    if (!confirm('Delete this calculation?')) return
    const updated = savedCalculations.filter(c => c.id !== id)
    localStorage.setItem('savedBudgetCalculations', JSON.stringify(updated))
    setSavedCalculations(updated)
  }

  const exportTXT = () => {
    if (!results) return
    const blob = new Blob([`Budget Calculator Export\n${new Date().toLocaleString()}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `budget-${new Date().toISOString().split('T')[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const emailResults = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent('Campaign Budget')}&body=${encodeURIComponent('See attached budget calculation from InfluenceIT.')}`
  }

  const shareLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); alert('Link copied!') }
    catch { alert('Could not copy: ' + window.location.href) }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  // ── Token gate: charge once when leaving section 1 ────────────────────────
  const handleNext = async () => {
    if (activeSection === 1) {
      const allowed = await checkAndCharge('budget_calculator')
      if (!allowed) return
    }
    setActiveSection(prev => Math.min(4, prev + 1))
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>

      {blocked && (
        <TokenGateModal balance={balance} needed={needed} toolName="Budget Calculator" onDismiss={dismiss} />
      )}

      {/* Header */}
      <div style={{ padding: '32px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calculator size={24} color="#3A3A3A" />
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#3A3A3A', margin: 0 }}>Brand Budget Calculator</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Load Saved', icon: <FolderOpen size={14} />, onClick: () => setShowSavedModal(true) },
              { label: 'Save', icon: <Save size={14} />, onClick: saveCalculation },
              { label: 'Download', icon: <Download size={14} />, onClick: exportTXT },
              { label: 'Email', icon: <Mail size={14} />, onClick: emailResults },
            ].map(({ label, icon, onClick }) => (
              <button key={label} onClick={onClick} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#fff',
                fontSize: '13px', fontWeight: 500, color: '#3A3A3A', cursor: 'pointer',
              }}>{icon}{label}</button>
            ))}
            <button onClick={shareLink} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              borderRadius: '8px', border: 'none', backgroundColor: '#FFD700',
              fontSize: '13px', fontWeight: 600, color: '#3A3A3A', cursor: 'pointer',
            }}><Share2 size={14} />Share</button>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>
          Calculate fair, market-rate costs for influencer campaigns based on real industry data.
        </p>
        <div style={{ height: '1px', backgroundColor: '#E5E7EB' }} />
      </div>

      {/* Saved modal */}
      {showSavedModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', maxWidth: '800px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Saved Calculations</h2>
              <button onClick={() => setShowSavedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#6B7280" /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {savedCalculations.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>No saved calculations yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {savedCalculations.map((calc) => (
                    <div key={calc.id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#3A3A3A' }}>{calc.name || 'Untitled'}</div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(calc.timestamp)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => loadCalculation(calc)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#FFD700', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Load</button>
                          <button onClick={() => deleteCalculation(calc.id)} style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#FEE2E2', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color="#DC2626" /></button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                        <div><div style={{ fontSize: '11px', color: '#9CA3AF' }}>Creators</div><div style={{ fontSize: '13px', fontWeight: 600 }}>{calc.inputs.numberOfCreators} × {calc.inputs.creatorTier}</div></div>
                        <div><div style={{ fontSize: '11px', color: '#9CA3AF' }}>Total</div><div style={{ fontSize: '13px', fontWeight: 600, color: '#D97706' }}>{formatCurrency(calc.results.breakdown.total.min)}–{formatCurrency(calc.results.breakdown.total.max)}</div></div>
                        <div><div style={{ fontSize: '11px', color: '#9CA3AF' }}>Niche</div><div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{calc.inputs.niche}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB' }}>
              <button onClick={() => setShowSavedModal(false)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontSize: '14px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Section tabs */}
            <div className="card" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { num: 1, label: 'Campaign Scope', icon: Users },
                  { num: 2, label: 'Content', icon: FileText },
                  { num: 3, label: 'Usage Rights', icon: DollarSign },
                  { num: 4, label: 'Creator Details', icon: TrendingUp },
                ].map(section => (
                  <button key={section.num} onClick={() => setActiveSection(section.num)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                    borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: activeSection === section.num ? 600 : 500,
                    backgroundColor: activeSection === section.num ? '#FFD700' : 'transparent',
                    color: activeSection === section.num ? '#3A3A3A' : '#6B7280',
                  }}>
                    <section.icon size={14} />
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {activeSection === 1 && <CampaignScope inputs={inputs} updateInputs={updateInputs} />}
            {activeSection === 2 && <ContentRequirements inputs={inputs} updateInputs={updateInputs} />}
            {activeSection === 3 && <UsageRights inputs={inputs} updateInputs={updateInputs} />}
            {activeSection === 4 && <CreatorCharacteristics inputs={inputs} updateInputs={updateInputs} />}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setActiveSection(Math.max(1, activeSection - 1))}
                disabled={activeSection === 1}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontSize: '13px', cursor: activeSection === 1 ? 'not-allowed' : 'pointer', opacity: activeSection === 1 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={activeSection === 4 || checking}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: checking ? '#F3F4F6' : '#FFD700', fontSize: '13px', fontWeight: 600, cursor: activeSection === 4 ? 'not-allowed' : 'pointer', opacity: activeSection === 4 ? 0.4 : 1, color: checking ? '#9CA3AF' : '#3A3A3A' }}
              >
                {checking ? 'Checking...' : 'Next'}
              </button>
            </div>
          </div>

          <div>{results && <BudgetOutput results={results} inputs={inputs} />}</div>
        </div>

        {results && (
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AlternativeScenarios results={results} inputs={inputs} />
            <NegotiationGuidance results={results} inputs={inputs} />
          </div>
        )}
      </div>
    </div>
  )
}
