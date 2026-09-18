# CLAUDE.md - SEND DUDES

Single-HTML WebGPU mass-battle game by Trent Sterling. Drafted with ChatGPT (drops land in `~/Downloads/senddudes-vX.html`), hosted from this repo at https://tront.xyz/senddudes/ (public `TrentSterling/senddudes`, Pages from `main` root, https enforced).

## Deploy loop

1. Copy the new drop over `index.html`; freeze the previous one in `versions/`.
2. Sweep em dashes (`grep -c "—" index.html` must be 0), keep Discord links on `tront.xyz/discord/`.
3. `node tools/verify.mjs` must be 20/20. Look at `tools/out/qa-*.png`.
4. Re-render `og-image.png` with `tools/og-campaign.mjs` only if the look changed; bump `?v=` on the og:image meta when you do.
5. Commit, push. Then `node tools/verify.mjs https://tront.xyz/senddudes/` once Pages rebuilds.

## Hooks the harness uses

`window.SendDudes` = `window.Arena`: `report()`, `step(n)` (deterministic manual ticks, pauses after), `launchSector(sector, ask, practice)`, `recruit(role, automatic)`, `cast(x, y)` (rupture; set `gpu.cooldown = 0` first), `applyCheats`, `getRun()`, `progress`, `view` (`s` zoom, `x`/`y` world offset), `settings`, `setSpeed`. URL hash: `#demo-200k`, `#elite-200k`, `#ranged-20k`, `#practice`, `#campaign`, `#benchmark`.

Headless Chrome needs `--enable-unsafe-webgpu --enable-features=Vulkan` and the RTX; there is no CPU fallback in the game.

## Rules

- One file, no external scripts, no analytics. Keep it that way.
- Do not put the version string in more than the places it already is (`<title>` block, `.build`, about panel, `BUILD`, JSON-LD `softwareVersion`, the version comment above the demo controls).
- Games page card lives in `C:\Github\trentsterling.github.io\games\index.html` and reads `/senddudes/og-image.png`.
