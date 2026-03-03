'use client'

import { useState, useEffect } from 'react'
import { NegotiationData } from '../NegotiationAssistant'
import { Sparkles, Copy, Check, RotateCcw, Loader2, History, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  data: NegotiationData
  resetForm: () => void
}

interface ResponseOption {
  strategy: string
  approach: string
  response: string
  whenToUse: string
}

interface SavedResponse {
  id: string
  timestamp: number
  scenario: string
  responses: ResponseOption[]
  scenarioDetails: any
}

export default function Step4Responses({ data, resetForm }: Props) {
  const [responses, setResponses] = useState<ResponseOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('savedResponses')
    if (saved) {
      try { setSavedResponses(JSON.parse(saved)) } catch (e) {}
    }
  }, [])

  const generateResponses = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/generate-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (!response.ok) throw new Error('Failed to generate responses')
      const result = await response.json()
      setResponses(result.responses)
      saveResponse(result.responses)
    } catch (err) {
      setError('Failed to generate responses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveResponse = (responsesToSave: ResponseOption[]) => {
    const newSaved: SavedResponse = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      scenario: data.scenario,
      responses: responsesToSave,
      scenarioDetails: data.scenarioDetails,
    }
    const updated = [newSaved, ...savedResponses]
    setSavedResponses(updated)
    localStorage.setItem('savedResponses', JSON.stringify(updated))
  }

  const loadSavedResponse = (saved: SavedResponse) => {
    setResponses(saved.responses)
    setShowHistory(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteSavedResponse = (id: string) => {
    const updated = savedResponses.filter(r => r.id !== id)
    setSavedResponses(updated)
    localStorage.setItem('savedResponses', JSON.stringify(updated))
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {}
  }

  const getScenarioLabel = (scenario: string) => {
    const labels: Record<string, string> = {
      'higher-rate': 'Higher Rate', 'reduced-scope': 'Reduced Scope',
      'creative-freedom': 'Creative Freedom', 'usage-rights': 'Usage Rights',
      'exclusivity': 'Exclusivity', 'timeline': 'Timeline',
      'declined': 'Declined Campaign', 'ghosted': 'Ghosted/No Response', 'multiple': 'Multiple Terms',
    }
    return labels[scenario] || scenario
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  useEffect(() => { generateResponses() }, [])

  const optionColors = ['#FFD700', '#3AAFF4', '#FF6B8A']

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Your Response Options</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
              color: '#3A3A3A', fontSize: 13, cursor: 'pointer',
            }}
          >
            <History style={{ width: 14, height: 14 }} />
            Saved ({savedResponses.length})
            {showHistory ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
          <button
            onClick={resetForm}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
              color: '#3A3A3A', fontSize: 13, cursor: 'pointer',
            }}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
            Start Over
          </button>
        </div>
      </div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>Three professional approaches tailored to your situation</p>

      {/* Saved History */}
      {showHistory && savedResponses.length > 0 && (
        <div style={{
          marginBottom: 28, backgroundColor: '#EBF7FF',
          border: '1px solid #A3D9FF', borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#3A3A3A', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History style={{ width: 16, height: 16, color: '#3AAFF4' }} />
            Saved Response History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
            {savedResponses.map((saved) => (
              <div key={saved.id} style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
                borderRadius: 8, padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#FFD700' }}>{getScenarioLabel(saved.scenario)}</span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(saved.timestamp)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{saved.responses.length} response options</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => loadSavedResponse(saved)} style={{
                      padding: '6px 12px', borderRadius: 6,
                      backgroundColor: '#3AAFF4', border: 'none',
                      color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>Load</button>
                    <button onClick={() => deleteSavedResponse(saved.id)} style={{
                      padding: '6px 8px', borderRadius: 6,
                      backgroundColor: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer',
                    }}>
                      <Trash2 style={{ width: 13, height: 13, color: '#DC2626' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0' }}>
          <Loader2 style={{ width: 40, height: 40, color: '#FFD700', marginBottom: 16 }} className="animate-spin" />
          <p style={{ color: '#6B7280', fontSize: 14 }}>Generating your personalized responses...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <p style={{ color: '#DC2626', marginBottom: 12, fontSize: 14 }}>{error}</p>
          <button onClick={generateResponses} style={{
            padding: '8px 18px', borderRadius: 8,
            backgroundColor: '#FFD700', border: 'none',
            color: '#3A3A3A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Try Again</button>
        </div>
      )}

      {/* Response Cards */}
      {!loading && !error && responses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {responses.map((response, index) => {
            const accent = optionColors[index] || '#FFD700'
            return (
              <div key={index} style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid #E5E7EB`,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {/* Card header strip */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: `3px solid ${accent}`,
                  backgroundColor: accent === '#FFD700' ? '#FFFFF8' : accent === '#3AAFF4' ? '#EBF7FF' : '#FFF0F5',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#3A3A3A', margin: '0 0 4px' }}>
                      Option {String.fromCharCode(65 + index)}: {response.strategy}
                    </h3>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{response.approach}</p>
                  </div>
                  <Sparkles style={{ width: 18, height: 18, color: accent, flexShrink: 0 }} />
                </div>

                <div style={{ padding: 20 }}>
                  {/* Response text */}
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8, padding: 14,
                    marginBottom: 14,
                    fontSize: 13, fontFamily: 'monospace',
                    lineHeight: 1.7, color: '#3A3A3A',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {response.response}
                  </div>

                  {/* When to use */}
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: '#3AAFF4', margin: '0 0 6px' }}>When to use this approach:</h4>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{response.whenToUse}</p>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => copyToClipboard(response.response, index)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8,
                      backgroundColor: '#FFD700', border: 'none',
                      color: '#3A3A3A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {copiedIndex === index
                      ? <><Check style={{ width: 14, height: 14 }} />Copied!</>
                      : <><Copy style={{ width: 14, height: 14 }} />Copy Response</>
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Regenerate */}
      {!loading && !error && responses.length > 0 && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <button onClick={generateResponses} style={{
            padding: '10px 24px', borderRadius: 8,
            border: '2px solid #FF6B8A', backgroundColor: 'transparent',
            color: '#FF6B8A', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Regenerate Responses
          </button>
        </div>
      )}
    </div>
  )
}
