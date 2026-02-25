// Place at: lib/negotiation-templates.ts
// Copied verbatim from LMG-ICN lib/templates.ts
// Only change: exported as NEGOTIATION_TEMPLATES / getMatchingTemplates (avoids name collision)

import { EmailTemplate, ObjectionType, StrategyType, NegotiationStage } from './negotiation-types';

export const NEGOTIATION_TEMPLATES: EmailTemplate[] = [
  {
    id: "budget-firm-1",
    name: "Budget Constraints - Stand Firm",
    objectionTypes: ["budget-constraints"],
    strategy: "firm",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Rate",
    body: `Hi {{brandName}},

Thank you for getting back to me! I completely understand budget considerations are important.

My rate of {{fairRate}} is based on industry standards for my audience size and engagement rates. This reflects the value I deliver through {{deliverables}}, which consistently drives strong ROI for brands I work with.

I keep my rates competitive and fair, which is why I'm confident this investment will generate measurable results for your campaign.

I'd love to make this partnership work. Are there any other budget areas where you have flexibility, or would you like to discuss the campaign timeline?

Looking forward to hearing from you!

Best,
{{creatorName}}`,
    whenToUse: "When you want to maintain your rate and the brand seems to have more budget",
    pros: ["Maintains your professional worth", "Shows confidence in your value", "Leaves room for them to find budget"],
    cons: ["They might walk away", "Could be seen as inflexible", "May not work with strict budgets"],
  },
  {
    id: "budget-scope-1",
    name: "Budget Constraints - Adjust Scope",
    objectionTypes: ["budget-constraints", "maximum-offer"],
    strategy: "scope",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership - Alternative Options",
    body: `Hi {{brandName}},

I appreciate you sharing your budget constraints with me!

My rate of {{fairRate}} for {{deliverables}} reflects the full scope of work. However, I'm happy to explore options that fit your budget while maintaining my standard rates:

Option 1: Reduce to [X deliverables] for {{brandOffer}}
Option 2: Keep {{deliverables}} but reduce usage rights from {{usageRights}} to 30-day organic only
Option 3: Keep {{deliverables}} but remove the {{exclusivity}} exclusivity period

My per-content rate stays consistent, but we can adjust what's included to meet your budget. Which option sounds most aligned with your goals?

Best,
{{creatorName}}`,
    whenToUse: "When you want to show flexibility without lowering your rates",
    pros: ["Maintains your per-content rate", "Shows you're easy to work with", "Gives brand control over scope"],
    cons: ["Requires negotiating new deliverables", "They might still want original scope", "More back-and-forth needed"],
  },
  {
    id: "budget-compromise-1",
    name: "Budget Constraints - Meet in Middle",
    objectionTypes: ["budget-constraints", "flexibility-request"],
    strategy: "compromise",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Rate - Final Offer",
    body: `Hi {{brandName}},

Thank you for being transparent about your budget. I really want to make this partnership work!

My standard rate for {{deliverables}} is {{fairRate}}, which reflects market rates for my audience and engagement. However, I understand budget considerations.

I can meet you at [COMPROMISE_RATE] as my absolute best price for this campaign. This is below my standard rate, but I'm excited about working with you and think we can create something great together.

This would be my final offer - I hope this works for your budget!

Let me know what you think.

Best,
{{creatorName}}`,
    whenToUse: "When you really want the deal and can afford to compromise",
    pros: ["Shows serious willingness to partner", "Likely to close the deal", "Builds goodwill with brand"],
    cons: ["You earn less than fair rate", "Sets precedent for lower rates", "Brand might push for even lower"],
  },
  {
    id: "comparison-firm-1",
    name: "Other Creators Cheaper - Stand Firm",
    objectionTypes: ["other-creators-cheaper"],
    strategy: "firm",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Rate",
    body: `Hi {{brandName}},

I appreciate you sharing that! Every creator prices differently based on their audience quality, engagement rates, and proven ROI.

My rate of {{fairRate}} reflects several key factors:
- My engagement rate is [X]%, which is above industry average
- My audience demographic aligns perfectly with your target market
- I provide detailed analytics and performance reports
- {{deliverables}} with {{usageRights}} and {{exclusivity}} exclusivity

I focus on quality over quantity, which is why brands see strong conversions when working with me. I'm confident this investment will deliver measurable results.

Happy to discuss if you have any questions about my metrics or past campaign performance!

Best,
{{creatorName}}`,
    whenToUse: "When you know your metrics justify your rate",
    pros: ["Educates brand on value differences", "Positions you as premium option", "Weeds out brands only shopping on price"],
    cons: ["Requires strong metrics to back up", "Brand might still prefer cheaper option", "Could come across defensive"],
  },
  {
    id: "comparison-scope-1",
    name: "Other Creators Cheaper - Adjust Scope",
    objectionTypes: ["other-creators-cheaper"],
    strategy: "scope",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Options",
    body: `Hi {{brandName}},

I totally understand that different creators have different rate structures!

My {{fairRate}} rate for {{deliverables}} includes {{usageRights}} and {{exclusivity}} exclusivity, which adds significant value beyond just content creation.

If you're working with a tighter budget, I can offer:
- Same quality content but 30-day organic-only usage (no paid promotion rights)
- Reduced exclusivity period (14 days instead of {{exclusivity}})
- This would bring the rate to {{brandOffer}}

My per-content rate remains consistent with market standards, but we can adjust rights and terms to fit your budget. Would this work better?

Best,
{{creatorName}}`,
    whenToUse: "When their budget seems real but they found cheaper alternatives",
    pros: ["Explains why rates differ (usage rights)", "Keeps your content rate high", "Educates brand on pricing factors"],
    cons: ["Requires giving up valuable usage rights", "May not close gap enough", "Adds complexity to negotiation"],
  },
  {
    id: "comparison-compromise-1",
    name: "Other Creators Cheaper - Compromise",
    objectionTypes: ["other-creators-cheaper"],
    strategy: "compromise",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Rate - Special Offer",
    body: `Hi {{brandName}},

I understand you've received quotes from other creators, and I respect that you're being thoughtful about your investment.

While other creators may charge less, I'm confident in the unique value I bring through my highly engaged audience and proven track record. That said, I'd love to work with you!

I can offer {{fairRate}} reduced to [COMPROMISE_RATE] for this first partnership. This is below my standard rate but reflects my genuine interest in collaborating with {{brandName}}.

If we see strong results (which I'm confident we will!), we can discuss future campaigns at standard rates. Does this work for you?

Best,
{{creatorName}}`,
    whenToUse: "When you want to prove your value with first partnership",
    pros: ["Frames lower rate as 'first partnership' special", "Sets expectation for higher future rates", "Shows confidence in your results"],
    cons: ["You still earn below market rate", "No guarantee of future work", "Brand might expect same rate always"],
  },
  {
    id: "maximum-firm-1",
    name: "Maximum Offer - Stand Firm",
    objectionTypes: ["maximum-offer", "standard-rate"],
    strategy: "firm",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Discussion",
    body: `Hi {{brandName}},

Thank you for being clear about your maximum offer. I appreciate the transparency!

I understand budget limitations, but my rate of {{fairRate}} for {{deliverables}} is based on the value and ROI I deliver. This includes {{usageRights}} and {{exclusivity}} exclusivity, which extends the value far beyond the initial posts.

I've held this rate consistent because brands consistently see strong returns. I'd hate for us both to miss out on a great partnership over a gap of {{gap}}.

Is there any possibility of revisiting the budget, or would you like to discuss adjusting the scope to meet your {{brandOffer}} maximum?

Best,
{{creatorName}}`,
    whenToUse: "When they claim it's their max but you suspect they have flexibility",
    pros: ["Calls their bluff professionally", "Keeps door open for budget revision", "Maintains your value position"],
    cons: ["If it really is their max, deal dies", "Could seem pushy", "Requires confidence in your value"],
  },
  {
    id: "maximum-scope-1",
    name: "Maximum Offer - Adjust Scope",
    objectionTypes: ["maximum-offer", "standard-rate"],
    strategy: "scope",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership - Budget-Friendly Options",
    body: `Hi {{brandName}},

I appreciate you sharing your maximum budget of {{brandOffer}}. Let me see how we can make this work!

For {{brandOffer}}, I can offer:
- [Reduced number] of posts instead of {{deliverables}}
- Same quality and engagement you'd expect
- Organic usage only (30 days)
- No exclusivity period

This maintains my content rate while fitting your budget exactly. The content quality stays the same—we're just adjusting what's included.

Would this package work for your campaign goals?

Best,
{{creatorName}}`,
    whenToUse: "When you believe their max is real and want to close the deal",
    pros: ["Shows willingness to find solution", "Maintains your per-post rate", "Likely closes the deal quickly"],
    cons: ["Less income for you", "Less comprehensive campaign for them", "May need to reduce deliverables significantly"],
  },
  {
    id: "exposure-firm-1",
    name: "Exposure Offer - Decline Professionally",
    objectionTypes: ["exposure-offer"],
    strategy: "firm",
    stage: ["initial-offer", "after-counter", "objection"],
    subject: "Re: Partnership Opportunity",
    body: `Hi {{brandName}},

Thank you so much for thinking of me for this opportunity! I really appreciate it.

While I love collaborating with brands, I'm not able to create content in exchange for exposure alone. My rate for {{deliverables}} is {{fairRate}}, which reflects the time, equipment, and expertise that goes into creating professional content.

I'm happy to discuss a paid partnership if you have budget available! I'm confident we could create something great together.

Thanks again for reaching out!

Best,
{{creatorName}}`,
    whenToUse: "When brand offers only product/exposure with no payment",
    pros: ["Sets clear professional boundaries", "Educates brand on creator economics", "Leaves door open for paid work"],
    cons: ["Deal ends if they have no budget", "Might seem harsh to small businesses", "Could burn bridge with brand"],
  },
  {
    id: "exposure-scope-1",
    name: "Exposure Offer - Product + Payment",
    objectionTypes: ["exposure-offer"],
    strategy: "scope",
    stage: ["initial-offer", "after-counter"],
    subject: "Re: Partnership Opportunity",
    body: `Hi {{brandName}},

Thank you for the offer! I'd love to collaborate with you.

While I appreciate the product/exposure offer, I do require payment for branded content creation. That said, I'm happy to work with you on a budget-friendly package:

- Product value + cash payment = total value of {{fairRate}}
- For example: If product is worth $500, payment would be {{brandOffer}}
- We can adjust the deliverables to fit your budget

I think your products are great and would love to feature them authentically! Can we discuss a hybrid arrangement?

Best,
{{creatorName}}`,
    whenToUse: "When you like the product but need cash payment too",
    pros: ["Shows flexibility and collaboration", "Acknowledges value of their product", "Creates win-win solution"],
    cons: ["Requires calculating product value", "Still less cash than pure paid deal", "May set precedent for hybrid deals"],
  },
  {
    id: "initial-firm-1",
    name: "Initial Response - Professional Rate Quote",
    objectionTypes: ["no-objection"],
    strategy: "firm",
    stage: ["initial-offer"],
    subject: "Re: Partnership Opportunity",
    body: `Hi {{brandName}},

Thank you so much for reaching out! I'd love to learn more about this partnership opportunity.

For {{deliverables}} with {{usageRights}} and {{exclusivity}} exclusivity, my rate is {{fairRate}}.

This includes:
- Professional content creation and editing
- Multiple rounds of revisions as needed
- Detailed performance analytics after posting
- Full usage rights as specified

I'm excited about the possibility of working together! Let me know if you'd like to discuss further or if you have any questions about my rates or process.

Looking forward to hearing from you!

Best,
{{creatorName}}`,
    whenToUse: "When responding to initial outreach with your fair rate",
    pros: ["Sets clear expectations from start", "Professional and comprehensive", "Establishes your worth immediately"],
    cons: ["May scare off low-budget brands", "No room for negotiation built in", "Could be too formal for some brands"],
  },
  {
    id: "initial-scope-1",
    name: "Initial Response - Tiered Options",
    objectionTypes: ["no-objection"],
    strategy: "scope",
    stage: ["initial-offer"],
    subject: "Re: Partnership Opportunity",
    body: `Hi {{brandName}},

Thank you for thinking of me! I'd be excited to collaborate with you.

I offer a few different partnership packages depending on your campaign goals:

STANDARD PACKAGE: {{fairRate}}
- {{deliverables}}
- {{usageRights}}
- {{exclusivity}} exclusivity

LITE PACKAGE: [REDUCED_RATE]
- [Fewer deliverables]
- 30-day organic usage only
- No exclusivity

PREMIUM PACKAGE: [HIGHER_RATE]
- {{deliverables}}
- Unlimited usage rights
- 60-day exclusivity
- Dedicated campaign report

Let me know which aligns best with your budget and goals! Happy to customize further.

Best,
{{creatorName}}`,
    whenToUse: "When you want to give brand options from the start",
    pros: ["Shows flexibility without looking desperate", "Caters to different budget levels", "Anchors your 'standard' as middle option"],
    cons: ["More complex initial response", "May confuse some brands", "Could lead to race to bottom (cheapest option)"],
  },
  {
    id: "stalled-firm-1",
    name: "Stalled Negotiation - Polite Follow-Up",
    objectionTypes: ["no-objection", "budget-constraints", "flexibility-request"],
    strategy: "firm",
    stage: ["stalled"],
    subject: "Re: Partnership - Following Up",
    body: `Hi {{brandName}},

I wanted to follow up on our partnership discussion! I know things get busy, so no worries if you're still deciding.

Just to recap: My rate for {{deliverables}} is {{fairRate}}, which includes {{usageRights}} and {{exclusivity}} exclusivity.

I'm still very interested in collaborating with you! Let me know if you have any other questions or if there's anything I can clarify.

If the timing or budget isn't right for this campaign, I'd love to stay in touch for future opportunities.

Best,
{{creatorName}}`,
    whenToUse: "When brand hasn't responded in 5-7 days after your last message",
    pros: ["Reopens conversation professionally", "Shows continued interest without desperation", "Provides easy out if they're not interested"],
    cons: ["May not revive dead deal", "Could seem pushy if too soon", "Might get no response again"],
  },
  {
    id: "stalled-compromise-1",
    name: "Stalled Negotiation - Last Chance Offer",
    objectionTypes: ["budget-constraints", "maximum-offer", "flexibility-request"],
    strategy: "compromise",
    stage: ["stalled"],
    subject: "Re: Partnership - Special Offer",
    body: `Hi {{brandName}},

I wanted to reach out one more time before moving forward with other campaigns this month.

I know we were {{gap}} apart on budget (my rate: {{fairRate}}, your offer: {{brandOffer}}). I've been thinking about it, and I really would love to work with you.

I can offer [COMPROMISE_RATE] as my absolute final rate for this campaign. This is below my standard pricing, but I'm genuinely excited about {{brandName}} and think we could create something special.

This offer is available until [DATE - one week from now]. After that, my calendar fills up with other commitments.

Let me know if this works - would love to make this happen!

Best,
{{creatorName}}`,
    whenToUse: "When negotiation has stalled and you're willing to compromise to close",
    pros: ["Creates urgency with deadline", "Shows serious intent to partner", "Likely closes the deal if they respond"],
    cons: ["You earn less than fair rate", "Might seem desperate", "Could damage future rate negotiations"],
  },
  {
    id: "flexibility-firm-1",
    name: "Flexibility Request - Explain Your Rates",
    objectionTypes: ["flexibility-request"],
    strategy: "firm",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Rate",
    body: `Hi {{brandName}},

Thanks for asking! I'm always happy to explain my pricing structure.

My rate of {{fairRate}} for {{deliverables}} is based on:
- Industry benchmarks for my audience size and engagement
- The time invested (creation + editing + revisions + posting)
- Usage rights value ({{usageRights}} extends your campaign ROI)
- Exclusivity cost ({{exclusivity}} prevents me from working with competitors)

I've structured my rates to be competitive and fair while ensuring I can deliver the quality brands expect. The value you receive far exceeds the investment!

I'm confident this partnership will drive real results. Happy to share case studies from past campaigns if helpful!

Best,
{{creatorName}}`,
    whenToUse: "When brand asks if you can be flexible without specific objection",
    pros: ["Educates brand on pricing factors", "Demonstrates professionalism", "Backs up rate with concrete reasoning"],
    cons: ["May not address their real concern", "Could seem unwilling to negotiate", "Might be too detailed for some brands"],
  },
  {
    id: "flexibility-scope-2",
    name: "Flexibility Request - Offer Alternatives",
    objectionTypes: ["flexibility-request", "budget-constraints"],
    strategy: "scope",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Flexibility",
    body: `Hi {{brandName}},

Absolutely! I'm always open to finding solutions that work for both of us.

While my rate for {{deliverables}} with {{usageRights}} and {{exclusivity}} exclusivity is {{fairRate}}, we can adjust the scope to fit your budget:

OPTION A: Reduce deliverables
- [X] posts instead of {{deliverables}} = {{brandOffer}}

OPTION B: Reduce usage rights
- Keep {{deliverables}} but 30-day organic only = {{brandOffer}}

OPTION C: Remove exclusivity
- Keep {{deliverables}} and {{usageRights}} but no exclusivity = [REDUCED_RATE]

My per-content rate stays consistent, but we have flexibility in what's included. Which direction makes most sense for your campaign?

Best,
{{creatorName}}`,
    whenToUse: "When you want to show flexibility while maintaining rate integrity",
    pros: ["Gives brand control over trade-offs", "Maintains your pricing principles", "Shows collaborative problem-solving"],
    cons: ["Requires detailed negotiation", "May confuse some brands", "Could lead to piecemeal negotiations"],
  },
  {
    id: "counter-firm-1",
    name: "Counter After Initial Lowball",
    objectionTypes: ["budget-constraints", "maximum-offer", "other-creators-cheaper"],
    strategy: "firm",
    stage: ["after-counter"],
    subject: "Re: Partnership Discussion",
    body: `Hi {{brandName}},

Thank you for your offer of {{brandOffer}}! I appreciate you taking the time to respond.

After reviewing the scope ({{deliverables}} with {{usageRights}} and {{exclusivity}} exclusivity), my rate is {{fairRate}}. This reflects fair market value for this level of content and usage rights.

I understand there's a gap of {{gap}} ({{gapPercent}}%), but I'm confident the ROI will justify the investment. My audience is highly engaged and converts well for brands in your space.

I'd love to make this work! Is there flexibility in the budget, or would you like to discuss adjusting the campaign scope?

Best,
{{creatorName}}`,
    whenToUse: "When countering a significantly low initial offer",
    pros: ["Addresses the gap directly", "Frames your rate as market value", "Opens door to negotiation"],
    cons: ["May end deal if budget is real", "Could seem inflexible", "Requires confidence in your metrics"],
  },
  {
    id: "urgent-compromise-1",
    name: "Time-Sensitive Campaign - Quick Close",
    objectionTypes: ["budget-constraints", "flexibility-request", "maximum-offer"],
    strategy: "compromise",
    stage: ["after-counter", "objection", "stalled"],
    subject: "Re: Partnership - Let's Make This Happen",
    body: `Hi {{brandName}},

I know you mentioned needing content quickly, so I wanted to circle back!

I can meet you at [COMPROMISE_RATE] (splitting the difference between {{fairRate}} and {{brandOffer}}) if we can confirm by [DATE].

This includes:
- {{deliverables}}
- {{usageRights}}
- {{exclusivity}} exclusivity
- Expedited turnaround to meet your timeline

I'm excited to move forward with this partnership. Let me know if this works!

Best,
{{creatorName}}`,
    whenToUse: "When brand has tight timeline and you can leverage urgency",
    pros: ["Uses urgency as leverage", "Shows willingness to expedite", "Likely closes deal quickly"],
    cons: ["You earn less than fair rate", "Requires fast turnaround work", "Sets precedent for rush pricing"],
  },
  {
    id: "thank-decline-1",
    name: "Decline Low Offer - Thank and Move On",
    objectionTypes: ["budget-constraints", "maximum-offer", "other-creators-cheaper", "standard-rate"],
    strategy: "firm",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership Opportunity",
    body: `Hi {{brandName}},

Thank you so much for considering me for this partnership! I really appreciate you taking the time to discuss this.

After reviewing the offer of {{brandOffer}} against my rate of {{fairRate}}, I don't think I can make this work while delivering the quality you deserve. The gap is just too significant for this scope of work.

I completely understand budget constraints, and I hope we can work together on a future campaign when timing and budget align better!

Wishing you success with your campaign.

Best,
{{creatorName}}`,
    whenToUse: "When offer is severely undervalued and you want to walk away professionally",
    pros: ["Ends negotiation cleanly", "Maintains relationship for future", "Shows confidence in your worth"],
    cons: ["Deal is over", "No income from this opportunity", "May miss out if they come back with more"],
  },
  {
    id: "milestone-payment-1",
    name: "Budget Constraints - Suggest Payment Plan",
    objectionTypes: ["budget-constraints", "maximum-offer"],
    strategy: "scope",
    stage: ["after-counter", "objection"],
    subject: "Re: Partnership - Payment Flexibility",
    body: `Hi {{brandName}},

I understand budget timing can be tricky! I'd still love to work with you.

What if we structured the payment differently? For {{deliverables}} at {{fairRate}}:

- 50% upfront ({{brandOffer}})
- 50% net-30 after content delivery

This spreads the investment across two budget periods while keeping the full scope intact. The deliverables and timeline stay the same—just the payment schedule adjusts.

Would this work better for your budget planning?

Best,
{{creatorName}}`,
    whenToUse: "When brand has budget but needs to spread payments over time",
    pros: ["Maintains your full rate", "Shows creative problem-solving", "May unlock deals with timing issues"],
    cons: ["Delayed partial payment", "More complex contract needed", "Risk of non-payment on second half"],
  },
  {
    id: "relationship-building-1",
    name: "First Partnership - Build Relationship",
    objectionTypes: ["budget-constraints", "other-creators-cheaper", "flexibility-request"],
    strategy: "compromise",
    stage: ["initial-offer", "after-counter"],
    subject: "Re: Partnership Opportunity",
    body: `Hi {{brandName}},

I'm really excited about the possibility of working with {{brandName}}! I've been following your brand and love what you're doing.

While my standard rate for {{deliverables}} is {{fairRate}}, I'd love to start our partnership strong. For this first campaign, I can offer [COMPROMISE_RATE].

This includes:
- {{deliverables}}
- {{usageRights}}
- {{exclusivity}} exclusivity
- Full analytics and performance report

If we both love the results (which I'm confident we will!), we can discuss an ongoing partnership at standard rates. I prefer building long-term relationships over one-off deals.

Does this work for you?

Best,
{{creatorName}}`,
    whenToUse: "When you want to start relationship with brand you're genuinely excited about",
    pros: ["Frames discount as strategic", "Opens door to ongoing work", "Shows genuine interest in brand"],
    cons: ["You earn less initially", "No guarantee of future work", "May not be able to raise rates later"],
  },
  {
    id: "seasonal-scope-1",
    name: "Budget Tight - Suggest Future Partnership",
    objectionTypes: ["budget-constraints", "maximum-offer"],
    strategy: "scope",
    stage: ["after-counter", "objection", "stalled"],
    subject: "Re: Partnership Timing",
    body: `Hi {{brandName}},

I completely understand budget constraints, especially at certain times of year!

While I can't move forward at {{brandOffer}} for the full scope, I have an idea: What if we start with a smaller test campaign now and save the full campaign for when you have more budget?

OPTION 1 (Now): [1-2 deliverables] at {{brandOffer}}
OPTION 2 (Future): Full {{deliverables}} at {{fairRate}} when budget refreshes

This lets us test the partnership and prove ROI at a lower investment, then scale up when timing is better. Plus, you'll have data to justify the larger budget!

Would a phased approach like this work?

Best,
{{creatorName}}`,
    whenToUse: "When you believe budget is temporarily constrained",
    pros: ["Keeps door open for future", "Gets you in the door at lower cost", "Proves your value with small test"],
    cons: ["Less immediate income", "No guarantee they'll scale up", "Requires patience and trust"],
  },
];

export function getMatchingTemplates(
  objectionType: ObjectionType,
  stage: NegotiationStage,
  strategy?: StrategyType
): EmailTemplate[] {
  return NEGOTIATION_TEMPLATES.filter(t => {
    const matchesObjection = t.objectionTypes.includes(objectionType);
    const matchesStage = t.stage.includes(stage);
    const matchesStrategy = strategy ? t.strategy === strategy : true;
    return matchesObjection && matchesStage && matchesStrategy;
  });
}
