export function Methodology({ lastIndexRun }: { lastIndexRun: string }) {
  return (
    <section className="method" id="method">
      <div className="wrap">
        <div className="method-rule"></div>
        <div className="method-grid">
          <div>
            <div className="m-k">01 — Measured, not claimed</div>
            <p>Engagement is the median post&apos;s likes and comments against followers — not an average, so one viral hit can&apos;t game the list. Instagram is ranked by median-post engagement, TikTok by median views — because that&apos;s what each platform sells.</p>
          </div>
          <div>
            <div className="m-k">02 — Deals, detected</div>
            <p>We scan captions and tags for #ad, #collaboration, and brand mentions, so you see who a creator already works with before you reach out.</p>
          </div>
          <div>
            <div className="m-k">03 — One source of truth</div>
            <p>Every number on this page — the hero card, the ticker, the leaderboard — is read from the same index, recalculated {lastIndexRun}.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
