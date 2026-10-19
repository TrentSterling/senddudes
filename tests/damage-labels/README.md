# Smart damage-label placement

Run from the repository root:

```
python tools/polish.py versions/senddudes-v0.6.3-chatgpt.html 3
node --test tests/damage-labels/regression.mjs
node tests/damage-labels/browser.mjs
node tools/verify.mjs
```

The regression suite checks repeated ingests, exact admitted values, core/grouped text,
zoom, pan, narrow width, frozen placement, reduced motion, unchanged Overkill/Off, and
preservation of game code outside the label renderer. Its canvas stub is a unit fixture,
not evidence of gameplay or a substitute for the browser check.

The browser suite uses native CDP keyboard/mouse input to start 200,000 DUDES at 1x,
zoom, and cast Rupture twice with its ordinary cooldown. Cases are 1600x900 at three
zoom levels and 390x844. Each case uses a separate temporary Chrome profile and free
debugging port. It never brings a browser to the foreground or kills unrelated processes.
The driver requires installed Chrome and hardware WebGPU.

After each real cast, it saves a live screenshot, freezes the renderer through the
existing manual harness flag, and draws baseline and patched label renderers over the
same battlefield. Both receive identical actual damage labels, clock and camera. This
matched QA replay is not gameplay footage. The baseline comes from the frozen v0.6.2
page. Tests preserve existing patched offsets, compare every admitted value and draw
count, and independently scan sprite alpha pixels to check painted glyph intersections.
Pixels in transparent sprite margins are excluded. Screenshots still need visual review;
these geometry checks do not establish contrast, HUD visibility or smooth animation.

Evidence is written to `tools/out/damage-labels/`. Set `LABEL_QA_OUT` to keep a separate
run. `--quick` runs desktop only; `--narrow` runs narrow only. The JSON report includes
normal inputs, matched values and view state. All gameplay runs at 1x; the comparisons
freeze only after the live input and screenshot.

Placement only consumes the already bounded live label list (Smart cap 160). It uses
screen-space text metrics, persistent offsets, local occupancy, and compact rows for
dense or fragmented space. Row packing sorts only the bounded label list. It does not read soldier buffers, change admission limits,
discard additional labels, change damage, shorten lifetimes or reduce the font. If a
viewport cannot fit all admitted text, it retains totals at their clamped anchors rather
than silently dropping them. Existing HUD layering and offscreen admission rules remain.
