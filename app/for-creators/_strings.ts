import type { Locale } from '@/app/claim/[handle]/_strings';
import type { DemoCategory } from './_demo';

/**
 * Copy for /for-creators, the creator landing page.
 *
 * Same shape and reason as app/claim/[handle]/_strings.ts: one interface for
 * every locale, so a missing key is a compile error rather than a silent
 * English fallback. English only for now. To add Spanish, widen
 * `ForCreatorsLocale` to `Locale` and the compiler asks for an `es` table.
 *
 * The copy is final. It comes from the approved design
 * (docs/for-creators-reference.html) and was checked against what the product
 * does, so don't add claims here. The example creator's numbers and brand
 * names are fixed demo content and live in ./_demo.ts; the functions below
 * take them as arguments so a number can't disagree with itself across the
 * page.
 */

export type ForCreatorsLocale = Extract<Locale, 'en'>;

/** Text with an email link inside it. A plain string is one segment. */
export type RichText = ReadonlyArray<string | { email: string }>;

export interface ForCreatorsStrings {
  meta: {
    /** Without " | InfluenceIT": the root layout's title template adds it. */
    title: string;
    /** The full title, for Open Graph, which the template does not reach. */
    ogTitle: string;
    description: string;
  };
  header: {
    logoLabel: string;
    cta: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    lede: string;
    form: {
      label: string;
      placeholder: string;
      submit: string;
      note: string;
      emptyError: string;
      /** The existence check failed (network or server), so no page was chosen. */
      checkError: string;
    };
  };
  heroCard: {
    brandsHiring: (n: number) => string;
    example: (followers: string) => string;
    hiresYourSize: string;
    followerRange: (lo: string, hi: string) => string;
    you: (followers: string) => string;
    creatorsHiredLine1: string;
    creatorsHiredLine2: string;
    hiringNow: string;
    region: (country: string) => string;
    draftIntro: (brand: string) => string;
    contact: (brand: string) => string;
  };
  badges: {
    program: string;
    repeatHirer: string;
    sighting: string;
    free: string;
    tokens: string;
    claimed: string;
  };
  features: {
    titleLine1: string;
    titleLine2: string;
    intro: string;
    brands: {
      title: string;
      body: string;
      all: (n: number) => string;
      morePills: (n: number) => string;
      creatorsHired: (category: string, n: number) => string;
      range: (lo: string, hi: string) => string;
      moreBrands: (n: number) => string;
      claimToSeeAll: (n: number) => string;
    };
    timing: {
      title: string;
      body: string;
      program: string;
      repeatHirer: string;
      sighting: string;
      hiringNow: string;
    };
    tools: {
      title: string;
      body: string;
      outreach: { name: string; detail: string };
      rate: { name: string; detail: string };
      negotiation: { name: string; detail: string };
      contract: { name: string; detail: string };
    };
    profile: {
      title: string;
      body: string;
      handleLine: (handle: string, platform: string, followers: string) => string;
      availability: string;
      open: string;
      mediaKit: string;
    };
  };
  /** Category labels for the demo pills and rows, keyed as in ./_demo.ts. */
  categories: Record<DemoCategory, string>;
  method: {
    titleLine1: string;
    titleLine2: string;
    body: string;
    sponsoredPosts: string;
    postsAnalyzed: string;
    creatorsIndexed: string;
  };
  faq: {
    title: string;
    intro: RichText;
    items: ReadonlyArray<{ q: string; a: RichText }>;
  };
  closing: {
    titleLine1: string;
    titleLine2: string;
    body: string;
    cta: string;
  };
  footer: {
    brandQuestion: string;
    brandCta: string;
    navLabel: string;
    forBrands: string;
    privacy: string;
    terms: string;
    copyright: (year: number) => string;
  };
}

const CONTACT_EMAIL = 'hello@influenceit.app';

const en: ForCreatorsStrings = {
  meta: {
    title: 'See which brands hire creators your size',
    ogTitle: 'See which brands hire creators your size | InfluenceIT',
    description:
      'InfluenceIT tracks sponsored posts to learn which brands hire creators, and at what size. Enter your handle to see the brands whose typical hire is close to your follower count.',
  },
  header: {
    logoLabel: 'InfluenceIT',
    cta: "See who's hiring",
  },
  hero: {
    eyebrow: 'For creators',
    titleLine1: 'Stop pitching blind.',
    titleLine2: "See who's hiring.",
    lede:
      'InfluenceIT tracks sponsored posts to learn which brands hire creators, and at what size. Enter your handle to see the brands whose typical hire is close to your follower count.',
    form: {
      label: 'Your Instagram or TikTok handle',
      placeholder: 'yourhandle',
      submit: "See who's hiring",
      note: 'Free to claim — takes less than 2 minutes.',
      emptyError: 'Enter your Instagram or TikTok handle.',
      checkError: 'Something went wrong. Please try again.',
    },
  },
  heroCard: {
    brandsHiring: (n) => `${n} brands hiring creators your size`,
    example: (followers) => `Example: a creator with ${followers} followers`,
    hiresYourSize: 'Hires creators your size',
    followerRange: (lo, hi) => `${lo} – ${hi} followers`,
    you: (followers) => `You · ${followers}`,
    creatorsHiredLine1: 'creators hired',
    creatorsHiredLine2: 'by this brand',
    hiringNow: 'Hiring right now — last detected 1 week ago',
    region: (country) => `Hiring in your region — ${country}`,
    draftIntro: (brand) => `We'll draft your first message to ${brand}, using your detected numbers:`,
    contact: (brand) => `Contact ${brand}`,
  },
  badges: {
    program: 'Program',
    repeatHirer: 'Repeat hirer',
    sighting: 'Sighting',
    free: 'Free',
    tokens: 'Tokens',
    claimed: 'Claimed',
  },
  features: {
    titleLine1: 'Who to pitch, when,',
    titleLine2: 'and how to close it.',
    intro:
      'Claiming your profile is free. So are the brand list, category filters, your media kit and Instagram DM drafts. The rate, negotiation and contract tools use tokens.',
    brands: {
      title: 'Brands that hire your size',
      body:
        "Not brands that only book mega-influencers. These are brands whose typical hire is close to your follower count, on your platform. Sort them, filter by category and see who's hiring in your region.",
      all: (n) => `All ${n}`,
      morePills: (n) => `+ ${n} more`,
      creatorsHired: (category, n) => `${category} · ${n} creators hired`,
      range: (lo, hi) => `${lo} – ${hi}`,
      moreBrands: (n) => `+ ${n} more brands hiring creators your size`,
      claimToSeeAll: (n) => `Claim to see all ${n}`,
    },
    timing: {
      title: 'Know when to reach out',
      body:
        'Each brand shows when we last saw it hire, how many creators it works with and how often it comes back to the same ones. Pitch the ones hiring right now.',
      program: 'Hires multiple creators your size, ongoing.',
      repeatHirer: 'Works with creators repeatedly, often ambassador-style.',
      sighting: 'Spotted hiring your size at least once.',
      hiringNow: 'Hiring right now — last detected 1 week ago',
    },
    tools: {
      title: 'Pitch it, price it, sign it',
      body:
        'Hit Contact on any brand and we’ll draft your first message using your detected numbers, plus two follow-ups spread over about two weeks — in English or Spanish, ready to send in Instagram. When a brand replies, the rate calculator, negotiation scripts and contract builder help you agree on a price and put it in writing.',
      outreach: { name: 'Outreach', detail: 'First DM plus two follow-ups, from your numbers' },
      rate: { name: 'Rate calculator', detail: 'Work out what to charge' },
      negotiation: { name: 'Negotiation scripts', detail: 'Replies for when a brand gets in touch' },
      contract: { name: 'Contract builder', detail: 'A draft agreement, downloaded as a PDF' },
    },
    profile: {
      title: 'Look ready when brands check you out',
      body:
        'A claimed profile gets a Claimed badge. Set your availability — Open, Limited, Booked or Closed — and upload your media kit so brands can download it straight from your profile.',
      handleLine: (handle, platform, followers) => `@${handle} · ${platform} · ${followers} followers`,
      availability: 'Availability',
      open: 'Open',
      mediaKit: 'Download media kit',
    },
  },
  categories: {
    beauty: 'Beauty',
    fashion: 'Fashion',
    fitness: 'Fitness & Wellness',
    retail: 'Retail',
    food: 'Food',
    tech: 'Tech & Electronics',
  },
  method: {
    titleLine1: "We don't guess who's hiring.",
    titleLine2: 'We watch.',
    body:
      "We detect sponsored posts — #ad and #collaboration tags — on public Instagram and TikTok accounts, and record which brand is behind each one and how big the creator was. That's how we know which brands hire your size.",
    sponsoredPosts: 'sponsored posts detected',
    postsAnalyzed: 'posts analyzed',
    creatorsIndexed: 'creators indexed',
  },
  faq: {
    title: 'Fair questions.',
    intro: ["Something we didn't cover? Email ", { email: CONTACT_EMAIL }],
    items: [
      {
        q: 'Is it free?',
        a: [
          'Claiming your profile is free, and so are the brand list, category filters, your media kit and Instagram DM drafts. The rate calculator, negotiation scripts and contract builder use tokens.',
        ],
      },
      {
        q: 'How do you know a brand is hiring?',
        a: [
          "We detect sponsored posts — #ad and #collaboration tags — on public Instagram and TikTok accounts, and record which brand is behind each one. A brand shows up on your list once we've seen it hire creators around your size.",
        ],
      },
      {
        q: 'What does "creators your size" mean?',
        a: [
          'Brands whose typical hire is close to your follower count, on the same platform. For a creator with 120K followers, that could be a brand whose hires mostly sit between 60K and 275K.',
        ],
      },
      {
        q: 'How do I prove the profile is mine?',
        a: [
          "We give you a short code to add to your Instagram or TikTok bio. Once we've seen it there, your profile is verified and you can take the code out again.",
        ],
      },
      {
        q: "Why can't I see every brand straight away?",
        a: [
          "Your preview shows your strongest match in full. Claim your profile — it's free — to see every brand and filter the list by category.",
        ],
      },
      {
        q: 'Can I remove my profile?',
        a: ['Yes. Email ', { email: CONTACT_EMAIL }, " from the address on your account and we'll remove it."],
      },
    ],
  },
  closing: {
    titleLine1: 'Brands hire creators at every size.',
    titleLine2: 'How many hire yours?',
    body: 'Enter your handle to find out. Free to claim.',
    cta: "See who's hiring",
  },
  footer: {
    brandQuestion: 'Here as a brand?',
    brandCta: 'Explore the database',
    navLabel: 'Footer',
    forBrands: 'For brands',
    privacy: 'Privacy',
    terms: 'Terms',
    copyright: (year) => `© ${year} InfluenceIT · an LMG Media platform`,
  },
};

const TABLE: Record<ForCreatorsLocale, ForCreatorsStrings> = { en };

export function getForCreatorsStrings(locale: ForCreatorsLocale): ForCreatorsStrings {
  return TABLE[locale];
}
