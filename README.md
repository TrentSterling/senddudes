# SEND DUDES

Massive GPU army battles in one HTML file. Defend the core through three escalating sieges, recruit reinforcements, unlock Titans, or take 200,000 dudes straight to the sandbox.

**Play:** https://tront.xyz/senddudes/

- Single file, no build, no external scripts, no runtime downloads.
- WebGPU compute drives movement, targeting, contacts, projectiles and damage. A WebGPU-capable desktop browser is required (Chrome, Edge, Firefox with WebGPU on).
- Campaign: three sectors, four waves each, research tree, Titan license after Timberline. Progress is stored in this browser; export a save from Upgrades.
- Sandbox: presets up to 200,000 fighters, elites, ranged mixes, a timed benchmark.
- Persistent blood stamped into a fixed terrain layer.

Built on the crowd experiments from [BIOMASS](https://tront.xyz/biomass/). Inspired by mass-horde defense games such as Crown Siege and Sir, We Have an Orc Problem; no affiliation, no assets from those games.

## Repo layout

| Path | What |
|---|---|
| `index.html` | The game, v0.4.3. Edit this one. |
| `og-image.png` | Social card (1200x630), rendered from the real game by `tools/og-campaign.mjs`. |
| `versions/` | Frozen earlier drops (v0.3 through v0.4.2) for reference. |
| `tools/` | Headless harness (see below). Output lands in `tools/out/` (ignored). |

## Tools

All tools drive real Chrome over the DevTools Protocol on the real GPU. Node 20+, zero npm deps.

```
node tools/verify.mjs                            # 20 checks against index.html
node tools/verify.mjs https://tront.xyz/senddudes/   # same checks against the live site
node tools/probe.mjs index.html '#demo-200k'     # boot + report dump + screenshot
node tools/og-campaign.mjs og-image.png          # render the social card (see env knobs in the file)
node tools/og-shot.mjs tools/out/x.png           # sandbox frontline shot variant
```

OG recipe that shipped: `SECTOR=2 WAVE=3 STEPS=3000 S=48 X=8 Y=-4 TITANS=10 TITLE=1 CASTAT="6,-2;-5,4"` (Black Orchard, Marshal wave, practice run, guard immortal, wordmark overlay).

## License

MIT. Copyright (c) 2026 Trent Sterling (Tront).
