# Colour scheme

Pari chose this scheme on 14 November 2026, from an example design she shared: warm sand and tan on soft grey and
white, a charcoal accent, and four pastel tints. It replaces the forest and mint scheme everywhere: the app, the
prototype, the admin page, reports, spreadsheets and documents. Fonts, spacing, radii and layout stay as they are; this
is a colour change only.

## Tokens

| Token | Hex | Use |
| --- | --- | --- |
| `--ground` | `#F6F6F6` | Page and screen background |
| `--paper` | `#FFFFFF` | Cards, sheets, inputs, tab bar |
| `--line` | `#ECE7E2` | Borders and dividers |
| `--ink` | `#1E1A17` | Main text, headings |
| `--muted` | `#6B6560` | Secondary text (4.5:1 or better on `--ground` and `--paper`) |
| `--faint` | `#A8A29C` | Placeholders and decoration only, never for text that must be read |
| `--sand` | `#DCBA9F` | Primary buttons and main actions (text on it: `--ink`) |
| `--sand-2` | `#CFA888` | Pressed or hover state of `--sand` |
| `--sand-soft` | `#EDD0B2` | Secondary buttons, chips, selected states, progress rings |
| `--sand-tint` | `#FAF1E8` | Soft highlight areas, notes, empty states |
| `--bronze` | `#B88E67` | Stars, small icons, chart highlight. Not for text |
| `--bronze-ink` | `#7A5A40` | Links and accent text (5:1 or better on white) |
| `--charcoal` | `#3A3A3A` | Strong accents: scan button, active tab icon, dark headers (text on it: white) |
| `--peach` / `--peach-ink` | `#FAE6D1` / `#6B4A2E` | Pastel tag or tile |
| `--mint` / `--mint-ink` | `#D8F9D9` / `#1F5A2E` | Good or positive states ("rarely breaks out") |
| `--rose` / `--rose-ink` | `#F6D1D1` / `#8E2C1C` | Cautions and errors |
| `--lilac` / `--lilac-ink` | `#E4CDFA` / `#4E3A6B` | Information, "similar formula" |

The four pastels are also the skin-type tiles: normal = peach, oily = mint, dry = rose, sensitive = lilac.

## Mapping from the old scheme

| Old | New |
| --- | --- |
| `--forest` `#1F4D3A` (buttons, active states) | `--sand` with `--ink` text; dark surfaces and headers become `--charcoal` |
| `--forest-2` `#2B6650` | `--sand-2` (or `#2A2A2A` next to `--charcoal`) |
| `--forest-ink` (white on forest) | `--ink` on sand, white on charcoal |
| `--mint` `#CDEBD8`, `--mint-soft` `#E9F6EE`, `--mint-line` | `--sand-soft`, `--sand-tint`, `--line` |
| `--sky` / `--sky-ink` | `--lilac` / `--lilac-ink` |
| `--butter` / `--butter-ink` | `--peach` / `--peach-ink` |
| `--rose` / `--rose-ink` | new `--rose` / `--rose-ink` |
| good or positive green | `--mint` / `--mint-ink` |
| `--ground` `#F4F8F5`, `--ink` `#15241C`, `--muted`, `--faint`, `--line` | the new values above |
| `--desk` (behind the phone frame on desktop) | `#EFEAE5` |

## Charts

Highlighted bars or the series that matters: `--bronze`. Other bars: `#D9D4CF`. Stacked parts in order: `--sand`,
`--sand-soft`, `#EFEAE5`, `#D9D4CF`. Never colour alone to carry meaning; keep labels and numbers on the bars.

## Rules that don't change

Text keeps at least 4.5:1 contrast (3:1 for large text and icons). No brand logos. No colour suggests a medical claim.
