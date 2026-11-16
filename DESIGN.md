# NSH Todo: design notes

Port of the Exact Todo app. Warm Paper palette lives in `theme.json` (light and dark); presentation code uses
tokens only. Controls live in `ui/` (button, chip, card, checkbox, field, sheet, ring, icon); pages in `pages/`.

## Motion inventory

| Change | Tool and tokens | Reduced motion |
|---|---|---|
| Press on buttons, chips, checkbox, swatches | `transition-transform` + `active:scale-95`, 150ms ease-out (`ui/motion.ts`) | instant, no scale |
| Chip selected (glass to accent) | `transition-colors`, 150ms | instant |
| Checkbox checked | indicator colour transition, 150ms | instant |
| Text-only controls, row open | opacity wash, 150ms | instant |
| Sheets (task, category, pickers, row menu) | native sheet presentation of `nsh/base` | system's |
| Tab change | the system tab bar; page swap is instant (no motion: a content swap, not a place change) | n/a |
| Progress ring, counters | no motion: values change a few times a day | n/a |
| Row removed / added | no motion: `List` updates in place (LayoutAnimation is future work) | n/a |
| Splash (`ui/splash.tsx`) | `createMotion` per layer in one `Animated.parallel`: tile scale 0.6 -> 1.06 -> 1 and fade (450 ms), two lines `scaleX` (250 ms), check mark as a canvas stroke with an animated `lineDashOffset` (300 ms), name rise and fade (300 ms), then a 250 ms fade out; about 1.5 s | logo at rest at once, 400 ms hold, 200 ms plain fade |
| Onboarding step change | `Carousel` scrolls natively (swipe, Next, dots); `LayoutAnimation.easeInEaseOut` for the page dot's width | carousel scrolls at once; no layout animation |
| Appearance | `setColorScheme`; colours are tokens, so views repaint with the scheme | n/a |
