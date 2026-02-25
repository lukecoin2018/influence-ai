// Place at: lib/negotiation-template-matcher.ts
// Copied verbatim from LMG-ICN lib/templateMatcher.ts

import {
  NegotiationInput,
  ResponseOption,
  StrategyType,
  EmailTemplate,
} from './negotiation-types';
import { NEGOTIATION_TEMPLATES, getMatchingTemplates } from './negotiation-templates';
import { calculateCompromiseRate, formatCurrency } from './negotiation-calculations';

function personalizeTemplate(
  template: string,
  input: NegotiationInput,
  compromiseRate?: number
): string {
  let p = template;
  p = p.replace(/\{\{brandName\}\}/g, input.brandName || '[Brand name]');
  p = p.replace(/\{\{creatorName\}\}/g, input.creatorName || '[Your name]');
  p = p.replace(/\{\{fairRate\}\}/g, formatCurrency(input.fairRate));
  p = p.replace(/\{\{brandOffer\}\}/g, formatCurrency(input.brandOffer));
  p = p.replace(/\{\{deliverables\}\}/g, input.deliverables);
  p = p.replace(/\{\{usageRights\}\}/g, input.usageRights);
  p = p.replace(/\{\{exclusivity\}\}/g, input.exclusivity);

  const gap = input.fairRate - input.brandOffer;
  const gapPercent = Math.round((gap / input.fairRate) * 100);
  p = p.replace(/\{\{gap\}\}/g, formatCurrency(gap));
  p = p.replace(/\{\{gapPercent\}\}/g, `${gapPercent}`);

  if (compromiseRate) {
    p = p.replace(/\[COMPROMISE_RATE\]/g, formatCurrency(compromiseRate));
  }
  return p;
}

export function generateResponseOptions(input: NegotiationInput): ResponseOption[] {
  const strategies: StrategyType[] = ['firm', 'scope', 'compromise'];
  const options: ResponseOption[] = [];
  const compromiseRate = calculateCompromiseRate(input.fairRate, input.brandOffer);

  for (const strategy of strategies) {
    const matchingTemplates = getMatchingTemplates(
      input.objectionType,
      input.stage,
      strategy
    );
    const template = matchingTemplates[0];

    if (template) {
      options.push({
        strategy: template.strategy,
        title: getOptionTitle(template.strategy),
        subtitle: getOptionSubtitle(template.strategy),
        email: {
          subject: personalizeTemplate(template.subject, input, compromiseRate),
          body: personalizeTemplate(template.body, input, compromiseRate),
        },
        whenToUse: template.whenToUse,
        pros: template.pros,
        cons: template.cons,
      });
    } else {
      options.push(getFallbackOption(strategy, input, compromiseRate));
    }
  }

  return options;
}

function getOptionTitle(strategy: StrategyType): string {
  switch (strategy) {
    case 'firm': return 'Option A: Stand Your Ground';
    case 'scope': return 'Option B: Adjust Scope';
    case 'compromise': return 'Option C: Meet in Middle';
  }
}

function getOptionSubtitle(strategy: StrategyType): string {
  switch (strategy) {
    case 'firm': return 'Maintain your rate professionally';
    case 'scope': return 'Keep rate, adjust deliverables';
    case 'compromise': return 'Show flexibility, close the deal';
  }
}

function getFallbackOption(
  strategy: StrategyType,
  input: NegotiationInput,
  compromiseRate: number
): ResponseOption {
  const fallbacks: Record<StrategyType, string> = {
    firm: 'budget-firm-1',
    scope: 'budget-scope-1',
    compromise: 'budget-compromise-1',
  };
  const template = NEGOTIATION_TEMPLATES.find(t => t.id === fallbacks[strategy])!;
  return {
    strategy,
    title: getOptionTitle(strategy),
    subtitle: getOptionSubtitle(strategy),
    email: {
      subject: personalizeTemplate(template.subject, input, compromiseRate),
      body: personalizeTemplate(template.body, input, compromiseRate),
    },
    whenToUse: template.whenToUse,
    pros: template.pros,
    cons: template.cons,
  };
}
