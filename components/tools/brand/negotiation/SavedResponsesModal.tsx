'use client'

import { useState, useEffect } from 'react'
import { X, History, Trash2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

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

interface Props {
  onClose: () => void
}

export default function SavedResponsesModal({ onClose }: Props) {
  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('savedResponses')
    if (saved) {
      try {
        setSavedResponses(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved responses:', e)
      }
    }
  }, [])

  const deleteSavedResponse = (id: string) => {
    const updated = savedResponses.filter(r => r.id !== id)
    setSavedResponses(updated)
    localStorage.setItem('savedResponses', JSON.stringify(updated))
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(id)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getScenarioLabel = (scenario: string): string => {
    const labels: Record<string, string> = {
      'higher-rate': 'Higher Rate',
      'reduced-scope': 'Reduced Scope',
      'creative-freedom': 'Creative Freedom',
      'usage-rights': 'Usage Rights',
      'exclusivity': 'Exclusivity',
      'timeline': 'Timeline',
      'declined': 'Declined Campaign',
      'ghosted': 'Ghosted/No Response',
      'multiple': 'Multiple Terms',
    }
    return labels[scenario] || scenario
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 16,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        maxWidth: 800, width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid #E5E7EB',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <History style={{ width: 22, height: 22, color: '#3AAFF4' }} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3A3A3A', margin: 0 }}>Saved Responses</h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                {savedResponses.length} saved response{savedResponses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }}
          >
            <X style={{ width: 20, height: 20, color: '#6B7280' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {savedResponses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <History style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 8px' }}>No saved responses yet</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Generate responses in Step 4 to save them here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {savedResponses.map((saved) => (
                <div key={saved.id} style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                }}>
                  {/* Row header */}
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#FFD700' }}>
                          {getScenarioLabel(saved.scenario)}
                        </span>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(saved.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                        {saved.responses.length} response option{saved.responses.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setExpandedId(expandedId === saved.id ? null : saved.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 7,
                          backgroundColor: '#EBF7FF', border: '1px solid #A3D9FF',
                          color: '#3AAFF4', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {expandedId === saved.id ? (
                          <><span>Hide</span><ChevronUp style={{ width: 14, height: 14 }} /></>
                        ) : (
                          <><span>View</span><ChevronDown style={{ width: 14, height: 14 }} /></>
                        )}
                      </button>
                      <button
                        onClick={() => deleteSavedResponse(saved.id)}
                        style={{
                          padding: '6px 8px', borderRadius: 7,
                          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 style={{ width: 14, height: 14, color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {expandedId === saved.id && (
                    <div style={{ borderTop: '1px solid #E5E7EB', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {saved.responses.map((response, index) => (
                        <div key={index} style={{
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: 8, padding: 16,
                        }}>
                          <div style={{ marginBottom: 10 }}>
                            <h4 style={{ fontWeight: 700, color: '#FF6B8A', margin: '0 0 4px', fontSize: 14 }}>
                              Option {String.fromCharCode(65 + index)}: {response.strategy}
                            </h4>
                            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{response.approach}</p>
                          </div>

                          <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: 6, padding: 12,
                            marginBottom: 10,
                            fontSize: 13, fontFamily: 'monospace',
                            lineHeight: 1.6, color: '#3A3A3A',
                            whiteSpace: 'pre-wrap',
                          }}>
                            {response.response}
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <h5 style={{ fontSize: 12, fontWeight: 700, color: '#3AAFF4', margin: '0 0 4px' }}>When to use:</h5>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{response.whenToUse}</p>
                          </div>

                          <button
                            onClick={() => copyToClipboard(response.response, `${saved.id}-${index}`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 14px', borderRadius: 7,
                              backgroundColor: '#FFD700', border: 'none',
                              color: '#3A3A3A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {copiedIndex === `${saved.id}-${index}` ? (
                              <><Check style={{ width: 13, height: 13 }} />Copied!</>
                            ) : (
                              <><Copy style={{ width: 13, height: 13 }} />Copy Response</>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px',
              borderRadius: 8, border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF', fontSize: 14,
              color: '#3A3A3A', cursor: 'pointer', fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
