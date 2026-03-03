import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()

    const prompt = buildPrompt(data)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const responses = parseResponses(responseText)

    return NextResponse.json({ responses })
  } catch (error) {
    console.error('Error generating responses:', error)
    return NextResponse.json(
      { error: 'Failed to generate responses' },
      { status: 500 }
    )
  }
}

function buildPrompt(data: any): string {
  const scenarioDescriptions: Record<string, string> = {
    'higher-rate': `Creator wants higher rate. You offered ${data.scenarioDetails.yourOffer}, creator countered with ${data.scenarioDetails.creatorCounter}, your max budget is ${data.scenarioDetails.maxBudget}.`,
    'reduced-scope': `Creator wants reduced scope. You requested: ${data.scenarioDetails.requestedDeliverables}. Creator proposed: ${data.scenarioDetails.proposedDeliverables}. Reason: ${data.scenarioDetails.reason}`,
    'creative-freedom': `Creator wants more creative freedom. Your requirements: ${data.scenarioDetails.yourRequirements}. Creator's concern: ${data.scenarioDetails.creatorConcern}`,
    'usage-rights': `Creator wants different usage rights. You requested: ${data.scenarioDetails.requestedRights}. Creator proposed: ${data.scenarioDetails.proposedRights}. Reasoning: ${data.scenarioDetails.reason}`,
    'exclusivity': `Creator wants less exclusivity. You requested: ${data.scenarioDetails.requestedExclusivity}. Creator concerned about: ${data.scenarioDetails.creatorExclusivityConcern}`,
    'timeline': `Creator wants longer timeline. You need content by ${data.scenarioDetails.yourDeadline}, creator requested ${data.scenarioDetails.requestedDate}. Reason: ${data.scenarioDetails.reason}`,
    'declined': `Creator declined campaign. Reason: ${data.scenarioDetails.declineReason}. You want to: ${data.scenarioDetails.wantTo}`,
    'ghosted': `Creator ghosted. Brief sent ${data.scenarioDetails.briefSentDate}, ${data.scenarioDetails.daysSince} days ago. You want to: ${data.scenarioDetails.wantTo}`,
    'multiple': `Creator negotiating multiple terms: ${data.scenarioDetails.multiplePoints}`
  }

  return `You are a professional influencer marketing negotiation expert. Generate 3 different response options for a brand dealing with this creator negotiation scenario.

SCENARIO:
${scenarioDescriptions[data.scenario] || 'Custom negotiation situation'}

CREATOR CONTEXT:
- Follower count: ${data.followerCount}
- Engagement rate: ${data.engagementRate || 'Unknown'}
- Niche: ${data.niche}
- Past work quality: ${data.pastWorkQuality || 'Unknown'}
- Professionalism: ${data.professionalism || 'Unknown'}
- Importance: ${data.creatorImportance}

FLEXIBILITY:
- Budget: ${data.budgetFlexibility}
- Scope: ${data.scopeFlexibility}
- Timeline: ${data.timelineFlexibility}
- Requirements: ${data.requirementsFlexibility}

BRAND'S PRIORITIES:
${data.priorities.join(', ')}

WILLING TO:
${data.willingTo.join(', ')}

Generate 3 DIFFERENT strategic response options. Each should have a distinct approach (e.g., hold firm with data, find middle ground, walk away gracefully, etc.).

Format your response EXACTLY like this:

RESPONSE A
STRATEGY: [One-line strategy name]
APPROACH: [One-line description of approach]
RESPONSE:
[The actual email/message response]

WHEN TO USE: [When this approach works best]

---

RESPONSE B
STRATEGY: [One-line strategy name]
APPROACH: [One-line description of approach]
RESPONSE:
[The actual email/message response]

WHEN TO USE: [When this approach works best]

---

RESPONSE C
STRATEGY: [One-line strategy name]
APPROACH: [One-line description of approach]
RESPONSE:
[The actual email/message response]

WHEN TO USE: [When this approach works best]

Make each response professional, warm but firm, and tailored to the specific context. The responses should be ready to copy/paste.`
}

function parseResponses(text: string): any[] {
  const responses: any[] = []
  const sections = text.split('---').map(s => s.trim())

  sections.forEach(section => {
    const strategyMatch = section.match(/STRATEGY:\s*(.+)/)
    const approachMatch = section.match(/APPROACH:\s*(.+)/)
    const responseMatch = section.match(/RESPONSE:\s*([\s\S]+?)(?=WHEN TO USE:|$)/)
    const whenToUseMatch = section.match(/WHEN TO USE:\s*(.+)/)

    if (strategyMatch && approachMatch && responseMatch && whenToUseMatch) {
      responses.push({
        strategy: strategyMatch[1].trim(),
        approach: approachMatch[1].trim(),
        response: responseMatch[1].trim(),
        whenToUse: whenToUseMatch[1].trim()
      })
    }
  })

  return responses.slice(0, 3) // Ensure only 3 responses
}