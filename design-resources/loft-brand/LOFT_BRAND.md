# Loft — Brand Kit (Retro Sunset)

Brand spec for implementing the Loft visual identity in the app. A 70s-inspired, warm look: a striped setting sun on a horizon line, paired with a chunky retro script wordmark.

## Files

| File | Use |
|---|---|
| `loft-logo.svg` / `.png` | Primary horizontal logo, for light backgrounds (headers, splash, marketing) |
| `loft-logo-on-dark.svg` / `.png` | Horizontal logo for dark backgrounds |
| `loft-logo-stacked.svg` / `.png` | Stacked logo (sun above name), for light backgrounds (onboarding, about screen) |
| `loft-logo-stacked-on-dark.svg` / `.png` | Stacked logo for dark backgrounds |
| `loft-mark.svg` / `.png` | Sun mark only, light backgrounds (favicon, small spaces, loading indicator) |
| `loft-mark-on-dark.svg` | Sun mark only, dark backgrounds |
| `loft-app-icon.svg` / `.png` | App icon, 1024×1024, espresso background (primary icon) |
| `loft-app-icon-light.svg` / `.png` | Alternate app icon, cream background |
| `fonts/shrikhand-latin-400-normal.woff2` | Display font used in the wordmark |

The logo SVGs have the wordmark converted to outlines, so they render without the font installed. The app icons are full-bleed squares; iOS/Android apply the rounded mask themselves. PNGs are 3× the SVG size.

## Color palette

| Token | Hex | Role |
|---|---|---|
| `mustard` | `#E9A23B` | Sun top band, highlight, wordmark shadow on light |
| `orange` | `#E2711D` | Sun middle band, primary accent, buttons |
| `rust` | `#C4471B` | Sun bottom band, pressed states, wordmark shadow on dark |
| `brown` | `#7A3B1E` | Wordmark, primary text on light |
| `espresso` | `#4A2412` | Dark background, strongest text |
| `cream` | `#F6E6C8` | Main light background, text on dark |
| `cream-soft` | `#FBF1DE` | Secondary surface / cards on cream |

### Contrast (WCAG)

| Pair | Ratio | OK for |
|---|---|---|
| espresso on cream | 11.0 : 1 | All text |
| brown on cream | 6.9 : 1 | All text |
| mustard on espresso | 6.3 : 1 | All text |
| orange on espresso | 4.3 : 1 | Large text / icons only |
| rust on cream | 4.0 : 1 | Large text (≥ 24px) / icons only |
| orange on cream | 2.6 : 1 | Decoration only, never text |
| espresso on mustard | 6.3 : 1 | Button label on mustard |

Rule of thumb: body text is `espresso` or `brown` on light, `cream` on dark. Orange and mustard are fills and accents; on an orange button use `espresso` text, not white.

## Design tokens

### CSS

```css
:root {
  --loft-mustard: #E9A23B;
  --loft-orange: #E2711D;
  --loft-rust: #C4471B;
  --loft-brown: #7A3B1E;
  --loft-espresso: #4A2412;
  --loft-cream: #F6E6C8;
  --loft-cream-soft: #FBF1DE;

  /* semantic, light theme */
  --color-bg: var(--loft-cream);
  --color-surface: var(--loft-cream-soft);
  --color-text: var(--loft-espresso);
  --color-text-muted: var(--loft-brown);
  --color-accent: var(--loft-orange);
  --color-accent-strong: var(--loft-rust);
  --color-highlight: var(--loft-mustard);
  --color-on-accent: var(--loft-espresso);
}

[data-theme="dark"] {
  --color-bg: var(--loft-espresso);
  --color-surface: #5C2E18;
  --color-text: var(--loft-cream);
  --color-text-muted: #E8CFA8;
  --color-accent: var(--loft-mustard);
  --color-accent-strong: var(--loft-orange);
  --color-highlight: var(--loft-rust);
  --color-on-accent: var(--loft-espresso);
}
```

### JSON

```json
{
  "color": {
    "mustard": "#E9A23B",
    "orange": "#E2711D",
    "rust": "#C4471B",
    "brown": "#7A3B1E",
    "espresso": "#4A2412",
    "cream": "#F6E6C8",
    "creamSoft": "#FBF1DE"
  }
}
```

## Typography

- **Display / wordmark:** Shrikhand (Google Fonts, SIL Open Font License). Use only for the logo and big headlines, never body text. Signature retro touch: a solid offset shadow, e.g. `text-shadow: 4px 4px 0 var(--loft-mustard);` on light, `var(--loft-rust)` on dark.
- **UI / body:** Outfit (Google Fonts), weights 400 and 600. Clean geometric sans that keeps the UI readable next to the loud display font.

```html
<link href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Outfit:wght@400;600&display=swap" rel="stylesheet">
```

## Logo usage

- Keep clear space around the logo equal to the height of the sun's top band (about ⅓ of the sun's height).
- Minimum size: horizontal logo 96px wide; sun mark 20px wide.
- Use the `-on-dark` versions on espresso or brown backgrounds; the regular versions on cream or white.
- Don't recolor the sun bands, rotate, stretch, or remove the horizon line.
- The sun mark alone works as favicon, avatar, and loading indicator (bands can animate in from bottom to top).

## Logo construction (for inline SVG)

The sun mark, viewBox `0 0 96 60`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 60" aria-label="Loft">
  <clipPath id="loft-sun"><path d="M8 56 A40 40 0 0 1 88 56 Z"/></clipPath>
  <g clip-path="url(#loft-sun)">
    <rect x="0" y="0"  width="96" height="29" fill="#E9A23B"/>
    <rect x="0" y="32" width="96" height="9"  fill="#E2711D"/>
    <rect x="0" y="45" width="96" height="11" fill="#C4471B"/>
  </g>
  <!-- horizon: #7A3B1E on light, #F6E6C8 on dark -->
  <rect x="4" y="55" width="88" height="5" rx="2.5" fill="#7A3B1E"/>
</svg>
```

If you inline it multiple times on one page, give each `clipPath` a unique id.

## Tool icons (`tools/`)

Icons for the three tools: `whiteboard`, `task-board`, `relationship-map`. Each comes in four forms:

| File pattern | Use |
|---|---|
| `<tool>-tile-dark.svg` / `.png` | Rounded espresso tile, 160×160 (PNG 512px). Tool launcher cards, home grid |
| `<tool>-tile-light.svg` / `.png` | Rounded cream tile, same sizes |
| `<tool>-icon-on-dark.svg` / `-on-light.svg` | Colored icon without a tile, 64×64. Place on your own background |
| `<tool>-glyph.svg` | Single-color outline, 24×24, `stroke="currentColor"`. Buttons, tabs, menus, sidebar |

The glyphs inherit the surrounding text color, so set `color` on the parent (e.g. `var(--color-text)` or `var(--color-accent)`). Keep them at 16–48px; use the tiles or colored icons for anything larger. Color logic in the colored icons: mustard → orange → rust mirrors the logo's sun bands.
