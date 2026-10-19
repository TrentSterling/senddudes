# About discovery integration

The game code, layout, original About prose, project descriptions, links and structured data are preserved. The four source-contract tests pin those bytes and the approved shared component. The component is embedded to retain single-file deployment where the game uses it.

Run `node --test tests/about-discovery/contract.cjs` and `node tests/about-discovery/browser.cjs` from this repository. The browser suite requires Playwright 1.62.0 and its Chrome channel. Voxel Heroes also requires `npm ci && npm run build` first. The suite exercises desktop, touch, reduced motion, Save-Data, disclosure controls, source release, keyboard input, fullscreen retention and the native game after closing. Screenshots and the machine-readable report go to `.about-evidence/`.

Set `ABOUT_LIVE_URL` to the full deployed game URL to repeat against production. Local tests request the actual published discovery media; `ABOUT_MEDIA_DIR` optionally selects an existing copy of those same media files. No synthetic posters are used.

The scoped panel adapter consumes neither a gameplay row nor canvas space. Existing title/menu visibility rules remain intact. It does not request or exit pointer lock, suspend game audio, or change fullscreen state. A visual-viewport adjustment keeps the control reachable on legacy pages whose game surface is wider than a phone.

The approved shared revision is `fcda637550b9237140c89f9e42465ddd1cb07bf0`. Three cards contain CraftMine, poster-only SMEAR and one session-stable additional game. Visible previews autoplay muted only after opening; closing or hiding releases their sources. Reduced motion and Save-Data retain posters. Pages with a continuously running game use compact poster mode to conserve gameplay resources. The manifest identifies each page's policy.

The manifest records the source commit and original repository baseline. A shared-component update must refresh its pinned hashes and rerun both suites before release.

The game snapshot was refreshed for the reviewed Smart damage-label change at
`2fdd2d28f84a9297bafb888f59521285d4f2617a`, recorded as `gameBaseline`. The original
About prose and shared CSS/JS hashes remain unchanged. The separate damage-label
regression suite verifies preservation outside label presentation against v0.6.2.
