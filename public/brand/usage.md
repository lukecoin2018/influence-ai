# InfluenceIT logo kit

## Colours
- Yellow #FFD700: symbol tile, avatar disc, yellow mark on the dark tile
- Pink #FF4D94: the wordmark "IT" only, flat, on every background
- Near-black #111111: mark on yellow, "Influence" on light, dark tile
- White #FFFFFF: "Influence" on dark, white mark on dark

## Symbol
Two overlapping circles; the overlap is a true cut-out that shows the background. All SVGs are outlined paths with no font references.
- Clear space: one lens width (18 units on the 100 grid, about 22% of the mark width) on all sides. The tile files already include it.
- Minimum sizes: tile 16px (favicon), mark alone 20px wide, avatar 40px (DM inbox).
- Do not fill the lens, rotate the mark, or add gradients, outlines or shadows.

## Wordmark
"Influence" in General Sans Bold (outlined) with the brush "IT" in #FF4D94. IT is 1.8x the cap height, centred on the cap midline, so it overshoots the line above and below.
- Regular files: rough brush ends, for the wordmark set at 24px and above.
- -small files: smoothed brush ends, for the wordmark set below 24px (the 18px header lockup).
- On light backgrounds the wordmark is used only where IT renders at 22px or taller, i.e. the wordmark set at 18px or larger. Below that use the symbol alone: #FF4D94 on white is 3.0:1 and only passes as large text.
- On dark backgrounds the wordmark works down to the 16px lockup (#FF4D94 on #111111 is 6.9:1).

## Lockups
Symbol tile 28px + 12px gap + wordmark at 18px, wordmark box centred on the tile centre. Height 28px; centre the lockup vertically in the header.
- Dark site header: lockup-dark-bg-small.svg, or lockup-dark-bg@1x.png / @2x.png.
- Light dashboard header: symbol-tile-yellow.svg alone by default; lockup-light-bg-small.svg only where the wordmark can be 18px or larger.
- Regular (rough) lockups are for print and large hero use.

## Which file where
- Site header (dark): lockup-dark-bg-small.svg
- Dashboard header (light): symbol-tile-yellow.svg
- Favicon: favicon.svg, favicon-32.png, favicon-16.png
- iOS / Android icon: app-icon-180.png, app-icon-512.png
- Instagram and DM avatars: instagram-avatar-320.png (mark inside the central 70%)
- Dark tile on dark UI: symbol-tile-dark.svg
- Mark without a tile: symbol-mark-dark.svg (on yellow or light), symbol-mark-white.svg (on dark)
- Hero, print, decks: wordmark-dark-bg.svg / wordmark-light-bg.svg, lockup-dark-bg.svg / lockup-light-bg.svg
