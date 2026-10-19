# Smart damage-label placement

Run from the repository root:

```
python tools/polish.py versions/senddudes-v0.6.3-chatgpt.html 3
node --test tests/damage-labels/regression.mjs
node tests/damage-labels/layout-work.mjs --base
node tests/damage-labels/layout-work.mjs
node tests/damage-labels/browser-work.mjs
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

Impossible area or oversized text bypasses collision search in O(n). Failed dense
packing also goes directly to retained anchors. Local search shares a frame-wide
budget of 2,048 candidates and 8,192 rectangle comparisons, then uses packed rows or
anchors. No failed search is repeated once per remaining label.

`layout-work.mjs` evaluates the exact layout class directly in Node, without VM or
canvas overhead. It asserts deterministic work limits and retention of all 160 fixture
totals, including physically overfull geometry, failed row packing, and cases that
independently exhaust the candidate and rectangle-comparison budgets. Its
timings are synthetic diagnostics, not game FPS. `browser-work.mjs` starts a real
200,000-unit battle with normal controls, casts Rupture, resizes to 390x240, and only
then freezes for diagnosis. It compares both exact layouts on copies of the real
eligible label inputs. Separate synthetic browser fixtures cover the exact reviewer
case (160 boxes of 85x24 in 390x844), its fitting 70x24 control, and a short window.
Reports and screenshots are in `tools/out/layout-browser-work/`; set `LABEL_WORK_OUT`
to preserve another run. A reported zero duration is below the browser timer's
resolution, not zero work. The normal-input resize samples tested during review
retained 45-46 eligible labels and did not reach physically overfull geometry. These
fixtures demonstrate a valid layout input, not proven normal-play frequency.
