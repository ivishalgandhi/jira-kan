# Linear visual language (inbox + board)

Cited spec for restyling pipe-kan. Visual language only: tokens, density, chrome. Not a product-feature list.

**Investigated client:** Linear web `BUILD_REVISION` 76467, `CLIENT_VERSION_HASH` `06134fed1d11979422a7`, `DEPLOYED_AT` `2026-09-05T01:24:10+0000` (inline `__RELEASE_INFO` on `https://linear.app/work-product/inbox` and `…/projects/all`).

**How to read this file.** Hex and px values are copied from Linear-published CSS/JS. Qualitative rules come from Linear’s own design posts and docs. Marketing homepage illustrations are Linear’s official product chrome drawings; they are labeled as such because they are not the authenticated React tree.

## Sources

| Kind | URL |
| --- | --- |
| Brand | https://linear.app/brand |
| App shell CSS (login-walled pages still emit splash tokens) | https://linear.app/work-product/inbox, https://linear.app/work-product/projects/all |
| App stylesheet | https://static.linear.app/client/assets/style-m7Mn9Vo9.css |
| App theme token names | https://static.linear.app/client/assets/ThemeProvider.zwNMEYVL.js |
| Marketing tokens + product mocks | https://linear.app/ (`index.DF8NERDv.css`, `IssueCard.0Mp9aHeV.css`, `IssueListView.BH55qTC9.css`, `HeroIllustration.Bvfe7oWz.css`, `Button.dcAi4KbO.css`) |
| 2024 redesign | https://linear.app/now/how-we-redesigned-the-linear-ui |
| 2026 refresh | https://linear.app/now/behind-the-latest-design-refresh |
| StyleX / generated themes | https://linear.app/now/styling-linear-for-the-future-stylex |
| Preferences / Inbox / Board / Display | https://linear.app/docs/account-preferences, https://linear.app/docs/inbox, https://linear.app/docs/board-layout, https://linear.app/docs/display-options, https://linear.app/docs/projects |
| Priority Inbox | https://linear.app/changelog/2026-09-03-priority-inbox |

No public Linear UI-kit Figma or published design-token JSON was found on linear.app. Internal tokens are generated at runtime (base + accent + contrast → LCH aliases) and injected by `ThemeProvider`. The splash CSS and marketing CSS are the published snapshots.

---

## 1. Color tokens

### 1.1 Brand (wordmark / marketing, not app chrome)

From https://linear.app/brand:

| Name | RGB | Hex | Use |
| --- | --- | --- | --- |
| Mercury White | 244, 245, 248 | `#F4F5F8` | Monochrome wordmark on dark |
| Nordic Gray | 35, 35, 38 | `#222326` | Monochrome wordmark on light |
| Brand | “subtle desaturated blue” | not hexed on the brand page | Backgrounds; not UI chrome |

Brand page: “Comfortable against light and dark backgrounds… light and dark accents are preferred for monochrome wordmark usage, while the brand color is typically reserved for backgrounds.”

### 1.2 App default light / dark (splash, live product)

Copied from `:root` / `html` / `html.dark` on the inbox and projects pages. These are the colors the app paints before React hydrates.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg-sidebar-*` | `#efeff0` | `#09090a` | Left nav / page canvas |
| `--bg-base-color-*` | `#f9f9fa` | `#121213` | Main pane surface |
| `--bg-border-color-*` | `#e2e2e2` | `#212224` | Pane hairline |
| `--content-color-*` | `#b0b5c0` | `#6b6f76` | Secondary / muted |
| `--content-highlight-color-*` | `#23252a` | `#ffffff` | Primary text |
| `meta[name=theme-color]` fallback | `#EFEFF0` | `#09090A` | Browser chrome |

Splash also ships loading-error aliases (secondary button / hover):

| Token | Light | Dark |
| --- | --- | --- |
| `--loading-error-muted-color-*` | `#5b5b5d` | `#97979a` |
| `--loading-error-secondary-bg-*` | `#fefeff` | `#1c1c1d` |
| `--loading-error-secondary-border-*` | `#00000016` | `#ffffff22` |
| `--loading-error-secondary-hover-bg-*` | `#f7f7f7` | `#252627` |
| `--loading-error-secondary-label-*` | `#2f2f31` | `#e2e3e5` |
| `--loading-error-secondary-shadow-*` | `0 3px 6px -2px #00000005, 0 1px 1px #0000000a` | `0 4px 4px -1px #0000000a, 0 1px 1px 0 #00000014` |

Accent in the splash sheet (selection, links, primary button):

| Use | Value |
| --- | --- |
| `::selection` / focus outline / links | `#7180ff` |
| Primary button bg / border | `#6d78d5` / `#656fc7` |
| Primary button hover | `#6c78e6` |

### 1.3 App theme *names* (generated, not hard-coded hex)

`ThemeProvider.zwNMEYVL.js` exports the StyleX color group. Implement against these roles; hex is derived:

**Surfaces:** `bgSub`, `bgSubHover`, `bgBase`, `bgBaseHover`, `bgShade`, `bgShadeHover`, `bgSelected`, `bgSelectedHover`, `bgFocus`, `bgModalOverlay`

**Borders:** `bgBorder` / `Hover` / `Thin`, `bgBorderFaint*`, `bgBorderSolid*`, `bgBorderStrong*`, `bgBorderAlpha*`, `bgSelectedBorder*`

**Text:** `labelTitle`, `labelTitleHover`, `labelBase`, `labelBaseHover`, `labelMuted`, `labelMutedHover`, `labelFaint`, `labelLink`

**Controls:** `controlPrimary` + `Label` + `Hover`; `controlSecondary` + `Label` + `Hover` + `Selected`; `controlTertiary` + `Label` + `Hover` + `Selected`

**Semantic (each has Bg / Base / BaseHover / Mid / Text / Foreground / Tint):** `teal`, `green`, `yellow`, `orange`, `red`, `blue`, `purple`

**Chrome:** `focusColor`, `shadowColor`, `sidebarLinkBg`, `sidebarLinkBgActive`, `scrollbarBg`, `scrollbarBgHover`, `scrollbarBgActive`, `chromeTabBg`, `chromeTabBgHover`, `chromeTabBgActive`, `scrollBackground`

Linear (2024, 2026) generates these from **three inputs**: base color, accent color, contrast, in **LCH**. 2026 refresh: default light/dark moved from a cool blue-ish hue toward a **warmer gray**, still crisp; sidebar is “a few notches dimmer” than the work surface. Selected rows **regenerate the whole theme** with the selected background as the new base (StyleX post, 2026-08-26).

### 1.4 Marketing site tokens (homepage / brand pages)

Marketing `index.DF8NERDv.css` is a complete published palette. Use for marketing-faithful dark/light; do not mix blindly with splash (values differ).

**Dark (`[data-theme=dark]`, homepage default `data-theme="dark"`):**

| Token | Hex |
| --- | --- |
| `--color-bg-primary` / level-0 | `#08090a` |
| `--color-bg-panel` / level-1 | `#0f1011` |
| `--color-bg-level-2` | `#141516` |
| `--color-bg-secondary` | `#1c1c1f` |
| `--color-bg-tertiary` | `#232326` |
| `--color-bg-quaternary` / quinary | `#28282c` / `#282828` |
| `--color-bg-translucent` | `#ffffff0d` |
| `--color-border-primary` | `#23252a` |
| `--color-border-translucent` | `#ffffff0d` |
| `--color-border-translucent-strong` | `#ffffff14` |
| `--color-text-primary` / fg | `#f7f8f8` |
| `--color-text-secondary` | `#d0d6e0` |
| `--color-text-tertiary` | `#8a8f98` |
| `--color-text-quaternary` | `#62666d` |
| `--color-link-primary` / `--color-accent-hover` | `#828fff` |
| `--color-accent` | `#7170ff` |
| `--color-brand-bg` | `#5e6ad2` |
| `--color-indigo` | `#5e6ad2` |
| `--focus-ring-color` | `var(--color-indigo)` |
| `--shadow-low` | `0 2px 4px #0000001a` |
| `--shadow-medium` | `0 4px 24px #0003` |
| `--shadow-high` | `0 7px 32px #00000059` |

**Light (`[data-theme=light]`):**

| Token | Hex |
| --- | --- |
| `--color-bg-primary` | `#fff` |
| `--color-bg-secondary` | `#f9f8f9` |
| `--color-bg-tertiary` | `#f4f2f4` |
| `--color-bg-quaternary` | `#eeedef` |
| `--color-bg-translucent` | `#00000005` |
| `--color-border-primary` | `#e9e8ea` |
| `--color-border-translucent` | `#0000000d` |
| `--color-border-translucent-strong` | `#00000014` |
| `--color-text-primary` | `#282a30` |
| `--color-text-secondary` | `#3c4149` |
| `--color-text-tertiary` | `#6f6e77` |
| `--color-text-quaternary` | `#86848d` |
| `--color-link-primary` / `--color-brand-bg` | `#7070ff` |
| `--color-accent` | `#7170ff` |
| `--color-accent-hover` | `#8989f0` |
| `--shadow-low` | `0 1px 4px -1px #00000017` |
| `--shadow-medium` | `0 3px 12px #00000017` |

Hero illustration (homepage product frame) uses a tighter dark recipe: frame `#090a0b`, pane `#101112`, `--bg-base:#0f1011`, `--bg-shade:#191d20`, `--hero-line:#2e2e32`, `--label-base:#e2e4e7`, `--label-faint:#585a5c`.

### 1.5 Hover / selected (implement these, don’t invent others)

| Surface | Rule | Source |
| --- | --- | --- |
| List row hover | `#ffffff08` overlay, 8px radius | Marketing issue list `.bVIB3G_row:before` |
| List row selected (app) | `--row-applied-bg`; consecutive selected rows lose inner corner radius | App `._rowShared_*` |
| Keyboard active row | `box-shadow: 0 0 0 1px var(--row-keyboard-border) inset` | App `._rowShared_*` |
| Inbox row hover | `#ffffff04` | Hero `._8qPNDW_inboxItem:hover` |
| Inbox row active | `#ffffff08`, `--row-bg:#18191a` | Hero `[data-active=true]` |
| Sidebar nav hover | `#ffffff05` | Hero `.Mmx1Wq_navItem:hover` |
| Workspace switcher hover | `#ffffff08` | Hero `.Mmx1Wq_switchWorkspaceButton:hover` |
| Ghost / icon button hover | `var(--color-bg-quaternary)` (marketing) or `#ffffff0d` | Button + list header CSS |
| Primary button hover | `filter: brightness(115%)`; active `brightness(98%)` + `scale(.97)` | Marketing `.S36ykG_variant-primary` |

---

## 2. Typography

### 2.1 Families

App stylesheet `:root` and `@font-face` (same files hosted at `https://static.linear.app/fonts/`):

```
--font-regular: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue",
  "Linear Thai", sans-serif;
--font-monospace: "Berkeley Mono", "SFMono Regular", Consolas, "Liberation Mono",
  Menlo, Courier, monospace;
```

- Inter Variable woff2 `?v=4.1`, weight axis 100–900, roman + italic.
- Berkeley Mono Variable `?v=3.2`.
- `Linear Thai` local fallback for `U+E00-E7F` at weight 450.

2024 redesign post: “We started using **Inter Display** to add more expression to our headings while maintaining their readability and kept using regular Inter for the rest of the text elements.” Current app `Text` component still has a `fontFamily: "display"` path: weight **550**, `font-feature-settings: "calt"`, `font-variation-settings: "opsz" 28`. The compiled CSS does **not** contain the string `Inter Display`; it points at a hashed family var. Treat display as Inter Variable at optical size 28 / weight 550 unless Linear ships a separate face.

Marketing site adds `--font-serif-display: "Tiempos Headline", …` for marketing headlines only. Do not use Tiempos in the product chrome.

### 2.2 App type scale (`:root` + `ThemeProvider` `v` map)

| Token | rem | px @ 16 | Weight companion |
| --- | --- | --- | --- |
| `micro` / `microPlus` | `.6875rem` | 11 | 450 / 500 |
| `mini` / `miniPlus` | `.75rem` | 12 | 450 / 500 |
| `small` / `smallPlus` | `.8125rem` | 13 | 450 / 500 |
| `regular` / `regularPlus` | `.9375rem` | 15 | 450 / 500; regular line-height `1.4375rem` (23px) |
| `large` / `largePlus` | `1.125rem` | 18 | 450 / 500 |
| `title3` | `1.25rem` | 20 | 500 |
| `title2` | `1.5rem` | 24 | 500 |
| `title1` | `2.25rem` | 36 | 550 (display) |

App weights (`:root`):

```
--font-weight-light: 300;
--font-weight-normal: 450;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

**450 is the product body weight.** Marketing site uses a different axis (`normal 400`, `medium 510`, `semibold 590`, `bold 680`). Match the **app** numbers for pipe-kan.

Splash loading UI: `"Inter Variable"`, `font-size: .75rem` (12) / `13px` status, `font-weight: 500`, `line-height: 1.5`, `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`. Error title: 20/28 weight 500; error body: 14/22 weight **450**.

### 2.3 Letter-spacing / numerals

- App body: no extra tracking in the Text default (`font-style: normal`, `line-height: normal` except `regular` = 1.4375rem).
- Marketing titles: `-0.012em` (title 1–3) to `-0.022em` (title 4+). Product chrome does not use that compression.
- Tabular lining nums on identifiers, counts, breadcrumbs (`font-variant-numeric: lining-nums tabular-nums` on inbox/board mocks and `slashedZero` util).
- Display face: `"calt"` + `"opsz" 28`. Do not enable third-party claims of `"cv01"` / `"ss03"` — those strings are **absent** from Linear’s published CSS.

---

## 3. Layout chrome

### 3.1 App shell (splash CSS on inbox + projects)

Inverted-L: sidebar is the page background; the work surface is a **floating rounded pane**.

```
--sidebar-width: 244px;
--desktop-tabs-height: 40px;
--agent-toolbar-height: 0px;
--scrollbar-width: 12px;
--control-border-radius: 4px;
--radius-rounded: 9999px;
```

`#appBorders` (main pane):

- `margin: 8px`
- `margin-left: var(--sidebar-width)` (244px)
- `margin-bottom: calc(8px + var(--agent-toolbar-height))`
- `border: 1px solid var(--bg-border-color)` — **0.5px** on `min-device-pixel-ratio: 2`
- `border-radius: 12px`
- `background-color: var(--bg-base-color)`
- Electron desktop: `margin-top: var(--desktop-tabs-height)` (40px)
- Viewport `max-width: 1023px`: pane margins collapse to `-1px` (edge-to-edge)

ThemeProvider radius constants: `controls: 8px`, `rounded: 9999px`. Thin hairline helper: `0.5px` on retina, else `1px`.

### 3.2 Marketing product frame (homepage hero)

Stylized but official drawing of the same chrome:

```
--width: 1320px;
--height: 720px;
--app-radius: 12px;
--frame-padding: 8px;
--sidebar-width: 232px;   /* illustration; live splash is 244px */
```

Grid: `grid-template-columns: var(--sidebar-width) 1fr`. Inner view: `background:#ffffff03; border:1px solid #ffffff0d; border-radius:8px`.

**Implement 244px sidebar + 8px gutter + 12px pane radius** from the live splash. Use 232px only if matching the marketing screenshot 1:1.

### 3.3 Headers / gutters

| Element | Size | Source |
| --- | --- | --- |
| Desktop tab bar | 40px | `--desktop-tabs-height` |
| View / location bar | 44px; padding `8px 12px` | `IssueListView` `._1uFtza_header`, `._1uFtza_viewBar` |
| List location bar | padding `8px 12px` | `._1uFtza_locationBar` |
| Breadcrumb chip | height 28px, radius 8px, padding-inline 10px | Hero inbox / board |
| Inbox left pane | `grid-template-columns: 320fr minmax(0,752fr)` | Hero `._8qPNDW_panel` |
| Inbox list gutter | `padding-inline: 12px`, row gap `2px` | Hero `._8qPNDW_notificationList` |
| Board columns | `column-gap: 12px`, `padding-inline: 16px` | Hero `.cozU0q_board` |
| Details sidebar (marketing list) | 320px / 280px under 1280px | `._1uFtza_wrapperWithSidebar` |
| Group header (list) | 36px, radius 8px, margin-inline 8px, bg `#ffffff05` | `.bVIB3G_groupHeader` |
| List row (issue list mock) | **40px**, margin-inline 8px | `.bVIB3G_row` |
| App list/grid row chrome | radius **8px**; hover fill inset `8px` | `._rowShared_*` |

2026 refresh: sidebar recedes; desktop tabs are compact, rounded, smaller icons/text, not full-bleed. Icons smaller; no colored team-icon backgrounds. Borders rounded and lower contrast — “structure should be felt not seen.”

---

## 4. Inbox

Docs: Inbox is the notification center (`G` then `I`). List + “special Inbox view” of the issue. **Board layout is not available** in Inbox (`https://linear.app/docs/board-layout`). Priority tab (2026-09-03) sits in display options / a tab; Linear selects Priority by default.

2024 redesign: notifications centered on **notification type** and **teammate faces**; simpler headers/filters.

### 4.1 Anatomy (homepage inbox mock, `HeroIllustration`)

Split: left notification list, right issue pane.

```
._8qPNDW_panel { grid-template-columns: 320fr minmax(0, 752fr); }
._8qPNDW_leftPane { border-right: hairline var(--color-border-translucent); }
._8qPNDW_notificationList { flex-direction: column; gap: 2px; padding-inline: 12px; }
```

**Row (`._8qPNDW_inboxItem`):**

| Part | Spec |
| --- | --- |
| Height | 56px |
| Padding | 12px |
| Radius | 8px |
| Layout | `space-between` / `align-center` |
| Default surface | `--row-bg: #111213` (dark mock) |
| Hover | `#ffffff04` (not when `[data-active]`) |
| Selected / active | `#ffffff08`, `--row-bg: #18191a` |
| Inner cluster | avatar + text, gap **12px** |
| Text stack | column, gap **4px**, width 188px in the mock |
| Title row | title + unread, gap **5px** |
| Unread | 8×8 circle `#5e69d1` (indigo / brand) |
| Meta column | right-aligned, height 32px, `space-between` (time + type) |

Avatar is a face (2024 post), not a status glyph. Identifier is not the primary line.

### 4.2 Inbox chrome

- Location / breadcrumb: 28×8 radius, tabular nums.
- Quick search: `Cmd/Ctrl F` overlay; `Esc` clears (`docs/inbox`). Visual of that overlay is not in the public CSS.
- Display options: unread-first, snoozed, Priority filter — same 28px pill language as other views (see §6).
- Detail pane top padding 19px; content column centered (`56fr minmax(0,640fr) 56fr`).

### 4.3 App list-row engine (shared with issues)

Even if Inbox rows are 56px in the mock, selected/hover chrome is the shared row primitive:

- Radius 8px; consecutive selected rows square the shared edge.
- Background on a `::before` inset `0 8px` (not full-bleed).
- Keyboard: 1px inset `--row-keyboard-border`.
- Transition `.15s` on `box-shadow`, `0s` on `background-color`.

---

## 5. Board / projects

Docs: nearly all views can be board or list (`Cmd/Ctrl B`). Inbox/Triage cannot. Cards **do not show descriptions**. Not every property fits; peek with `Space`. Column header shows **count or estimate** (toggle). Empty columns hide unless “Show empty groups.” Hidden columns park at the far right. Default grouping is Status.

`/projects/all` is the workspace **projects** page: list, board, or timeline of projects (`docs/projects`). Issue boards use the same chrome.

### 5.1 Column chrome (hero board mock)

```
.cozU0q_board { grid-template-columns: repeat(3, minmax(0,1fr)); column-gap: 12px; padding-inline: 16px; }
.cozU0q_columnHeader { gap: 8px; padding: 13px 12px 20px; }
.cozU0q_columnIcon { 14×14 }
.cozU0q_columnButton { 14×14; color quaternary; hover tertiary }
.cozU0q_cards { gap: 8px }
```

Header is not a card: status mark + name + count + quiet `+` / `…`. Homepage copy shows `Backlog 8`, `Todo 71`, `In Progress 3`, `Done 53`.

### 5.2 Card (marketing `IssueCard.0Mp9aHeV.css` — official product drawing)

```
border: var(--border-hairline) solid var(--color-border-translucent-strong);
background: linear-gradient(#ffffff05, #ffffff05), var(--color-bg-panel);
border-radius: 9px;
height: 96px;
padding: 8px 10px 12px 12px;
```

| Part | Spec |
| --- | --- |
| Hover | `::after` `#ffffff08` over the card |
| Header | 22px, space-between, gap 8px |
| Title row | 18px, gap 6px; status slot 14×14 |
| Title | ellipsis, nowrap |
| Tags | `margin-top: auto`, gap 4px |
| Priority pill | 24×24, hairline, `--radius-rounded`, tertiary text |
| Label pill | height 24, padding-inline 6 / 8, hairline, rounded |
| Label dot | 7×7 circle, `margin-inline: 3px` |

No drop shadow on the card. Separation is hairline + 5% white wash.

Homepage HTML cards also show issue key (`ENG-2085`), one-line title, optional label chips (Bug / Design / AI), optional avatar, optional PR number. Docs: ID, status, assignee, priority, labels, links, dates are **display-option** properties — hide by default if they don’t fit.

Triage / composer cards in the same hero use radius **9px**, padding `12px 16px 16px`, `box-shadow: 0 0 0 1px #0003` (dark inset ring), same hairline.

### 5.3 Project overview chrome (hero)

Pills: 24px height, rounded-full, padding-inline 6/8, hairline, hover `#ffffff0d`. Avatars 16px, stacked `-4px`. Metadata rows 24px. Project icon 32×32, radius 6px.

---

## 6. Chrome: buttons, search, pills, empty, scrollbars

### 6.1 Buttons (marketing `Button.dcAi4KbO.css`; splash error buttons match small/primary)

| Size | Height | Font | Icon | Padding | Gap |
| --- | --- | --- | --- | --- | --- |
| mini | 24 | 12 | 12 | 0 10 | 4 |
| small | 32 | 13 | 16 | 0 12 | 8 |
| medium | 40 | 13 | 16 | 0 14 | 8 |
| default | 40 | 15 | 18 | 0 16 | 6 |
| large | 44 | 16 | 18 | 0 20 | 6 |

- Corner: `--radius-rounded` (pill). Square variant: `--radius-4` (4px).
- Weight: `--font-weight-medium`.
- Transition: `.16s var(--ease-out-quad)` on border / bg / color / shadow / opacity / filter / transform.
- Press: `scale(.97)`.
- Primary: `--color-brand-bg` / `--color-brand-text`; hover brightness 115%.
- Secondary: translucent + inset highlight (dark) or `--shadow-low` (light).
- Ghost: transparent, hover `--color-bg-quaternary`.
- Splash primary (logged-out error): 32px, pill, `#6d78d5`, 13/500, min-width 92px; focus `outline: 2px solid #7180ff; outline-offset: 3px`.

KBD chips inside buttons: 16–20px, radius 5px, padding 0 4px.

### 6.2 Search / filters / pills

| Control | Spec | Source |
| --- | --- | --- |
| Sidebar search | muted (`--label-muted`), text-only button | Hero `.Mmx1Wq_searchButton` |
| New-issue | 28×28 circle, hairline, `#ffffff05` | Hero `.Mmx1Wq_newIssueButton` |
| Filter tab | 28px, 12/14 medium, inset hairline, idle `#ffffff08` / tertiary; active `#ffffff14` / primary; hover `#ffffff0d` | `._1uFtza_filterTab` |
| Pill button | 28px, `#ffffff05` + inset `#ffffff0d` | `._1uFtza_pillButton` |
| Nav icon button | 30×28, hover `#ffffff0d` | `._1uFtza_navButton` |
| Label / property pill | 24px, rounded-full, hairline, 12/14 | list + hero |
| Agent/user badge | 24px (small 22 / 10px type), avatar 16 (14), stacked −4px | `.-VOcTG_badge` |
| Sidebar nav item | **28px**, radius 8, gap 8, padding-inline 7, miniPlus / medium | Hero `.Mmx1Wq_navItem` |
| Sidebar icon well | 20×20, radius 2; optional 8% tint of `--color` | `.Mmx1Wq_navIconWrapper` |
| Sidebar stack gap | 2px | `.Mmx1Wq_navItems` |
| Sidebar padding | `8px 16px 16px 8px` | `.Mmx1Wq_sidebar` |
| Collapsible section label | micro, muted, padding `4px 0 4px 6px`, line-height 14 | `.Mmx1Wq_collapsible` |
| Menu | 210px, radius 8, padding 4 0, border strong translucent, bg `#171718` | `.Mmx1Wq_menu` |
| Menu item | 32px, 13 medium, padding 0 12; hover wash `#ffffff08` inset 4px, radius 6 | `.Mmx1Wq_menuItem` |
| Context menu (marketing) | min 220, radius 8, padding 4, border `--color-line-tertiary` | `.WinFxq_content` |
| Context item | min-height 32, radius 6, padding 0 14, 13/32; highlight `--color-bg-tertiary` | `.WinFxq_item` |

Inbox quick search is a command-style bar (`docs/inbox`), not a persistent field. Header Search in pipe-kan should read as a **28px muted control**, not a large outlined input.

### 6.3 Empty states

No dedicated empty-state component CSS was published on the fetched pages. Closest published empties:

- Splash “Loading…” / network error: centered 440×64, title 20/28/500 highlight, body 14/22/450 muted, actions gap 10, buttons 32×pill.
- Board docs: too-many-issues is an **error**, not an empty illustration.
- Hide empty columns unless the display option is on.

Do not invent a large illustration. Keep empty copy at regular/small, muted, centered in the pane.

### 6.4 Scrollbars

**App (obtrusive / Windows-style):**

```
--scrollbar-width: 12px;          /* splash */
--scrollbar-min-size: 32px;
scrollbar-width: thin;
scrollbar-color: var(--app-scrollbar-bg) transparent;
```

WebKit thumb: `background-color: var(--scrollbar-color); border-radius: var(--scrollbar-width); background-clip: content-box; border: 3px solid transparent;` hover/active swap `--app-scrollbar-bg-hover` / `-active`. Track transparent.

**Marketing:**

```
--scrollbar-size: 6px;
--scrollbar-size-active: 10px;
--scrollbar-gap: 4px;
--scrollbar-color: #ffffff1a;          /* light: #0000001a */
--scrollbar-color-hover: #fff3;        /* light: #0003 */
--scrollbar-color-active: #fff6;       /* light: #0000004d */
```

Theme token names: `scrollbarBg`, `scrollbarBgHover`, `scrollbarBgActive`.

Some product surfaces (`hideScrollbars` mixin) hide the bar entirely (`scrollbar-width: none`). Board horizontal scroll: Shift+wheel or grab empty space (`docs/board-layout`).

### 6.5 Motion / easing

App `:root`:

```
--speed-highlightFadeIn: 0s;
--speed-highlightFadeOut: .15s;
--speed-quickTransition: .1s;
--speed-regularTransition: .25s;
--speed-slowTransition: .35s;
--ease-out-quad: cubic-bezier(.25, .46, .45, .94);
```

Chrome hover uses `.16s var(--ease-out-quad)`. `#appBorders` pane: `.45s cubic-bezier(.45, 0, .55, 1)`.

`highlightMixin` (StyleX post): `:hover` on pointer, `:active` on touch.

---

## 7. Dark vs light default

| Surface | Default | Source |
| --- | --- | --- |
| Authenticated app | **`prefers-color-scheme`** unless `splashScreenConfig.darkMode` / user preference | Splash IIFE on inbox/projects |
| User setting | Light, Dark, or **system preference** | `docs/account-preferences` |
| Marketing site | **`data-theme="dark"`** on `<html>` | https://linear.app/ |
| Custom themes | Community `linear.style` (linked from official prefs) | `docs/account-preferences` |

Splash: `document.documentElement.classList.toggle("dark", e)` where `e` starts as `matchMedia("(prefers-color-scheme: dark)").matches`.

2026 default themes are warmer gray, not the old cool blue. Accent stays indigo (`#5e6ad2` / `#7180ff` family). Limit blue in chrome; put contrast in content (2024: “limiting how much chrome (blue) was used”; text/icons darker in light, lighter in dark).

---

## 8. Implementable recipe for pipe-kan

Map Linear chrome onto existing pipe-kan surfaces (Epic pane / Board / Open). Do not copy Linear features.

| pipe-kan | Linear analog |
| --- | --- |
| Page | Sidebar color as canvas; Board as `#appBorders` (8px inset, 12px radius, hairline) |
| Epic list | Inbox list: 56px rows **or** 40px issue rows; 8px radius fill hover; 8px unread indigo dot; faces/status left, title, meta right |
| Columns | No column card; 12px gap; header 13/12/20 padding; 14px status icon; count as muted tabular |
| Cards | 9px radius, hairline, no shadow, ~8–12 padding, 8px stack gap; key muted, title 13/450, pills 24px |
| Header Search | 28px muted pill, not a large field |
| Open pane | Hairline left border; 320px-class width |

**App-faithful tokens (prefer these over marketing):**

```
light: sidebar #EFEFF0 / #efeff0, surface #f9f9fa, border #e2e2e2, text #23252a, muted #b0b5c0
dark:  sidebar #09090A / #09090a, surface #121213, border #212224, text #ffffff, muted #6b6f76
accent: #7180ff (focus/selection), brand fill #5e6ad2 / #6d78d5
type: Inter Variable, body 13px/450, UI medium 500, titles 550 + opsz 28
```

---

## 9. Caveats

- `/inbox` and `/projects/all` do not render the logged-in tree without auth. Splash CSS + official homepage mocks + docs are the primary published surfaces.
- Theme hex is a **snapshot** of generated LCH (client 76467, 2026-09-05). Custom themes and selected-row subtrees re-derive the set.
- Marketing vs app disagree on sidebar width (232 vs 244), type weights (510/590 vs 450/500), and some grays. Prefer splash + `style-m7Mn9Vo9.css` for the product.
- No official public token JSON / UI kit. `linear.style` is community themes, not Linear’s system.
- Do not ship Linear wordmark/logomark in pipe-kan (`linear.app/brand` IP rules).
- Inbox row height 56px is from the marketing mock; the shared app row primitive does not hard-code that height in the published stylesheet.
- Empty-state art is unpublished.
- Third-party “Linear design system” pages that claim `cv01`/`ss03` and weight 510 as product-wide rules are **not** corroborated by Linear’s current CSS.
