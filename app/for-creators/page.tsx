import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getForCreatorsStrings } from './_strings';
import {
  BRAND_ROWS,
  CATEGORY_PILLS,
  EXAMPLE_CREATOR,
  HERO_BRAND,
  INDEX_FIGURES,
  MORE_CATEGORY_COUNT,
  formatK,
  markerPosition,
} from './_demo';
import { HandleForm } from './_HandleForm';
import { ScrollToForm } from './_ScrollToForm';
import { Faq } from './_Faq';
import { Rich } from './_Rich';
import { Icon } from './_icons';
import s from './for-creators.module.css';

/**
 * /for-creators — the creator landing page, built from the approved design in
 * docs/for-creators-reference.html.
 *
 * Fully static, with no database call anywhere on the page: every number on it
 * is fixed content from ./_demo.ts. That is what keeps it clear of the
 * render-time timeouts the homepage had. force-static makes it a build error
 * rather than a silent switch to dynamic rendering if anything here ever
 * reads cookies, headers or search params.
 *
 * It ships its own dark header and footer, so components/SiteShell.tsx leaves
 * this path out of the shared light chrome. English only for now; the copy
 * lives in ./_strings.ts so Spanish can be added there.
 */
export const dynamic = 'force-static';

const t = getForCreatorsStrings('en');
const PATH = '/for-creators';

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.description,
    url: PATH,
    siteName: 'InfluenceIT',
    type: 'website',
    locale: 'en_US',
  },
};

function Logo({ eager = false }: { eager?: boolean }) {
  return (
    <a href="#top" className={s.logo}>
      {/* unoptimized: an SVG is served as is, which is all <img> did. */}
      <Image
        src="/brand/lockup-dark-bg-small.svg"
        alt={t.header.logoLabel}
        width={158}
        height={28}
        unoptimized
        loading={eager ? 'eager' : 'lazy'}
      />
    </a>
  );
}

function HeroCard() {
  const c = t.heroCard;
  const you = formatK(EXAMPLE_CREATOR.followers);
  const pos = markerPosition(EXAMPLE_CREATOR.followers, HERO_BRAND.low, HERO_BRAND.high);
  return (
    <div className={s.stack}>
      <div aria-hidden="true" className={s.ghost} />
      <figure className={s.heroCard}>
        <div className={s.cardHead}>
          <span className={s.cardHeadLabel}>{c.brandsHiring(EXAMPLE_CREATOR.brandCount)}</span>
          <span className={s.examplePill}>{c.example(you)}</span>
        </div>

        <div className={s.brandHead}>
          <div className={s.brandWho}>
            <span aria-hidden="true" className={`${s.avatar} ${s.avatarLg}`}>
              {HERO_BRAND.initial}
            </span>
            <div className={s.nameStack}>
              <span className={s.brandName}>{HERO_BRAND.name}</span>
              <span className={s.brandCategory}>{t.categories[HERO_BRAND.category]}</span>
            </div>
          </div>
          <span className={`${s.badge} ${s.badgeLg} ${s.badgeOutline}`}>{t.badges.program}</span>
        </div>

        <div className={s.rangeBox}>
          <div className={s.rangeHead}>
            <strong>{c.hiresYourSize}</strong>
            <span>{c.followerRange(formatK(HERO_BRAND.low), formatK(HERO_BRAND.high))}</span>
          </div>
          <div aria-hidden="true" className={s.track}>
            <span className={s.youTag} style={{ left: pos }}>
              {c.you(you)}
            </span>
            <span className={s.bar} />
            <span className={s.marker} style={{ left: pos }} />
          </div>
        </div>

        <div className={s.statLine}>
          <span className={s.statBig}>{HERO_BRAND.creatorsHired}</span>
          <span className={s.statSmall}>
            {c.creatorsHiredLine1}
            <br />
            {c.creatorsHiredLine2}
          </span>
        </div>
        <div className={s.hiringLine}>
          <span>{c.hiringNow}</span>
        </div>
        <div className={s.regionLine}>
          <Icon name="pin" size={15} className={s.icon} />
          {c.region(HERO_BRAND.region)}
        </div>

        <div className={s.draft}>
          <span className={s.draftIntro}>{c.draftIntro(HERO_BRAND.name)}</span>
          <span className={s.contactLook}>
            <Icon name="pen" size={15} />
            {c.contact(HERO_BRAND.name)}
          </span>
        </div>
      </figure>
    </div>
  );
}

function FreeBadge() {
  return <span className={`${s.badge} ${s.badgeFree}`}>{t.badges.free}</span>;
}

function BrandsPanel() {
  const b = t.features.brands;
  // The design's "+ 960 more" leaves out all four brands named on the page:
  // the hero card's and the three rows here.
  const shown = 1 + BRAND_ROWS.length;
  return (
    <div className={s.panel}>
      <div className={s.pills}>
        <span className={`${s.pill} ${s.pillActive}`}>{b.all(EXAMPLE_CREATOR.brandCount)}</span>
        {CATEGORY_PILLS.map((p) => (
          <span key={p.key} className={s.pill}>
            {t.categories[p.key]} {p.count}
          </span>
        ))}
        <span className={s.pillMore}>{b.morePills(MORE_CATEGORY_COUNT)}</span>
      </div>
      {BRAND_ROWS.map((row) => (
        <div key={row.name} className={s.row}>
          <div className={s.rowHead}>
            <span aria-hidden="true" className={`${s.avatar} ${s.avatarSm}`}>
              {row.initial}
            </span>
            <div className={s.rowWho}>
              <span className={s.rowName}>{row.name}</span>
              <span className={s.rowMeta}>{b.creatorsHired(t.categories[row.category], row.creatorsHired)}</span>
            </div>
            {row.badge === 'repeatHirer' ? (
              <span className={`${s.badge} ${s.badgeYellow}`}>{t.badges.repeatHirer}</span>
            ) : (
              <span className={`${s.badge} ${s.badgeOutline}`}>{t.badges.program}</span>
            )}
          </div>
          <div className={s.rowRange}>
            <div aria-hidden="true" className={s.miniTrack}>
              <span className={s.bar} />
              <span className={s.marker} style={{ left: markerPosition(EXAMPLE_CREATOR.followers, row.low, row.high) }} />
            </div>
            <span className={s.rowRangeLabel}>{b.range(formatK(row.low), formatK(row.high))}</span>
          </div>
        </div>
      ))}
      <div className={s.panelFoot}>
        <span>{b.moreBrands(EXAMPLE_CREATOR.brandCount - shown)}</span>
        <strong>{b.claimToSeeAll(EXAMPLE_CREATOR.brandCount)}</strong>
      </div>
    </div>
  );
}

function TimingPanel() {
  const m = t.features.timing;
  return (
    <div className={`${s.panel} ${s.panelPadded}`}>
      <div className={s.legendRow}>
        <span className={`${s.badge} ${s.badgeOutline} ${s.legendBadge}`}>{t.badges.program}</span>
        <span className={s.legendText}>{m.program}</span>
      </div>
      <div className={s.legendRow}>
        <span className={`${s.badge} ${s.badgeYellow} ${s.legendBadge}`}>{t.badges.repeatHirer}</span>
        <span className={s.legendText}>{m.repeatHirer}</span>
      </div>
      <div className={s.legendRow}>
        <span className={`${s.badge} ${s.badgeGrey} ${s.legendBadge}`}>{t.badges.sighting}</span>
        <span className={s.legendText}>{m.sighting}</span>
      </div>
      <div className={s.hiringBox}>
        <Icon name="clock" className={s.icon} />
        <span>{m.hiringNow}</span>
      </div>
    </div>
  );
}

function ToolsPanel() {
  const tools = t.features.tools;
  const rows = [
    { tool: tools.outreach, icon: 'send', free: true },
    { tool: tools.rate, icon: 'calculator', free: false },
    { tool: tools.negotiation, icon: 'chat', free: false },
    { tool: tools.contract, icon: 'file', free: false },
  ] as const;
  return (
    <div className={s.panel}>
      {rows.map(({ tool, icon, free }) => (
        <div key={tool.name} className={s.toolRow}>
          <span aria-hidden="true" className={`${s.toolIcon} ${free ? s.toolIconDark : ''}`}>
            <Icon name={icon} />
          </span>
          <div className={s.rowWho}>
            <span className={s.rowName}>{tool.name}</span>
            <span className={s.toolDetail}>{tool.detail}</span>
          </div>
          {free ? <FreeBadge /> : <span className={`${s.badge} ${s.badgeTokens}`}>{t.badges.tokens}</span>}
        </div>
      ))}
    </div>
  );
}

function ProfilePanel() {
  const p = t.features.profile;
  return (
    <div className={`${s.panel} ${s.panelPadded} ${s.panelProfile}`}>
      <div className={s.profileHead}>
        <span aria-hidden="true" className={`${s.avatar} ${s.avatarXl}`}>
          {EXAMPLE_CREATOR.name.charAt(0)}
        </span>
        <div className={s.nameStack}>
          <div className={s.profileNameRow}>
            <span className={s.profileName}>{EXAMPLE_CREATOR.name}</span>
            <span className={s.claimed}>
              <Icon name="check" size={11} strokeWidth={3} />
              {t.badges.claimed}
            </span>
          </div>
          <span className={s.brandCategory}>
            {p.handleLine(EXAMPLE_CREATOR.handle, EXAMPLE_CREATOR.platform, formatK(EXAMPLE_CREATOR.followers))}
          </span>
        </div>
      </div>
      <div className={s.availability}>
        <span className={s.availabilityLabel}>{p.availability}</span>
        <span className={s.openBadge}>{p.open}</span>
      </div>
      <span className={s.mediaKitLook}>
        <Icon name="download" />
        {p.mediaKit}
      </span>
    </div>
  );
}

function Feature({ title, body, free, children }: { title: string; body: string; free: boolean; children: React.ReactNode }) {
  return (
    <div className={s.feature}>
      <div className={s.featureText}>
        <div className={s.featureTitleRow}>
          <h3 className={s.h3}>{title}</h3>
          {free && <FreeBadge />}
        </div>
        <p className={s.featureBody}>{body}</p>
      </div>
      {children}
    </div>
  );
}

export default function ForCreatorsPage() {
  const f = t.features;
  return (
    <div id="top" className={s.page}>
      <header className={`${s.dark} ${s.header}`}>
        <div className={`${s.wrap} ${s.headerIn}`}>
          <Logo eager />
          <ScrollToForm className={`${s.btn} ${s.btnHeader}`}>{t.header.cta}</ScrollToForm>
        </div>
      </header>

      <main>
        <section className={s.dark}>
          <div className={`${s.wrap} ${s.heroIn}`}>
            <div className={s.heroText}>
              <span className={s.eyebrow}>{t.hero.eyebrow}</span>
              <h1 className={s.h1}>
                <span className={s.line}>{t.hero.titleLine1}</span>
                <span className={`${s.line} ${s.yellowText}`}>{t.hero.titleLine2}</span>
              </h1>
              <p className={s.lede}>{t.hero.lede}</p>
              <HandleForm t={t.hero.form} />
            </div>
            <div className={s.heroVisual}>
              <HeroCard />
            </div>
          </div>
        </section>

        <section className={s.light}>
          <div className={`${s.wrap} ${s.featuresIn}`}>
            <div className={s.featuresHead}>
              <h2 className={`${s.h2} ${s.featuresTitle}`}>
                <span className={s.line}>{f.titleLine1}</span>
                <span className={s.highlight}>{f.titleLine2}</span>
              </h2>
              <p className={s.featuresIntro}>{f.intro}</p>
            </div>

            <div className={s.featureList}>
              <Feature title={f.brands.title} body={f.brands.body} free>
                <BrandsPanel />
              </Feature>
              <Feature title={f.timing.title} body={f.timing.body} free>
                <TimingPanel />
              </Feature>
              <Feature title={f.tools.title} body={f.tools.body} free={false}>
                <ToolsPanel />
              </Feature>
              <Feature title={f.profile.title} body={f.profile.body} free>
                <ProfilePanel />
              </Feature>
            </div>
          </div>
        </section>

        <section className={s.dark}>
          <div className={`${s.wrap} ${s.methodIn}`}>
            <div className={s.methodText}>
              <h2 className={s.h2}>
                <span className={s.line}>{t.method.titleLine1}</span>
                <span className={`${s.line} ${s.yellowText}`}>{t.method.titleLine2}</span>
              </h2>
              <p className={s.methodBody}>{t.method.body}</p>
            </div>
            <dl className={s.figures}>
              <div className={s.figure}>
                <dt>{t.method.sponsoredPosts}</dt>
                <dd>{INDEX_FIGURES.sponsoredPosts}</dd>
              </div>
              <div className={s.figure}>
                <dt>{t.method.postsAnalyzed}</dt>
                <dd>{INDEX_FIGURES.postsAnalyzed}</dd>
              </div>
              <div className={s.figure}>
                <dt>{t.method.creatorsIndexed}</dt>
                <dd>{INDEX_FIGURES.creatorsIndexed}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="faq" className={s.light}>
          <div className={`${s.wrap} ${s.faqIn}`}>
            <div className={s.faqIntro}>
              <h2 className={s.h2}>{t.faq.title}</h2>
              <p>
                <Rich text={t.faq.intro} />
              </p>
            </div>
            <Faq items={t.faq.items} />
          </div>
        </section>

        <section className={s.closing}>
          <div className={`${s.wrap} ${s.closingIn}`}>
            <div className={s.closingText}>
              <h2 className={s.closingTitle}>
                <span className={s.line}>{t.closing.titleLine1}</span>
                <span className={s.line}>{t.closing.titleLine2}</span>
              </h2>
              <p className={s.closingBody}>{t.closing.body}</p>
            </div>
            <ScrollToForm className={`${s.btn} ${s.btnDark}`}>{t.closing.cta}</ScrollToForm>
          </div>
        </section>
      </main>

      <footer className={s.dark}>
        <div className={s.brandStrip}>
          <div className={`${s.wrap} ${s.brandStripIn}`}>
            <span className={s.brandQuestion}>{t.footer.brandQuestion}</span>
            <Link href="/" className={`${s.btn} ${s.btnGhost}`}>
              {t.footer.brandCta}
            </Link>
          </div>
        </div>
        <div className={`${s.wrap} ${s.footerIn}`}>
          <Logo />
          <nav aria-label={t.footer.navLabel} className={s.footerNav}>
            <Link href="/">{t.footer.forBrands}</Link>
            <Link href="/privacy">{t.footer.privacy}</Link>
            <Link href="/terms">{t.footer.terms}</Link>
          </nav>
          <span>{t.footer.copyright(new Date().getFullYear())}</span>
        </div>
      </footer>
    </div>
  );
}
