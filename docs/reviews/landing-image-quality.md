# Landing image quality · 14 October 2026

Following the founder's report of soft photos, code and the running page confirmed the Next.js default `q=75`. Existing source portraits are already WebP, so optimization recompresses resized copies. For Zuri, a 640px-wide quality-75 response was 64,514 bytes, compared with the original 1086×1448 image at 274,212 bytes. This confirms compression, not that it explains every perceived source-image issue.

The founder approved increasing photo quality to 90 and correcting responsive sizing. `LandingPhoto` now requires a placement-specific `sizes` value and sets quality 90. The Next configuration allows both 75 and 90, retaining default quality for unrelated components. Hero images, cast cards, full-width marketing photos, and the 42px avatar use separate size hints. Source assets and visual composition are preserved.

The running landing page now emits `q=90`, and the optimized Zuri endpoint returns HTTP 200. At 640px, its quality-90 response is 130,368 bytes. The larger transfer is the tradeoff for less compression. Optimization and responsive image selection remain enabled.

TypeScript and targeted ESLint passed. Existing landing keyboard/navigation and failed-photo recovery browser checks passed. Higher encoding quality cannot repair artifacts already present in generated source photos.
