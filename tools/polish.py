"""Build index.html from a ChatGPT drop: em dash sweep, og:image cache-bust, and the SEO
About block carried over verbatim from the current index.html. Aborts without writing if
an anchor is missing. Run from the repo root:
    python tools/polish.py versions/senddudes-v0.6.2-chatgpt.html 3
(second arg = og-image ?v= number; bump it whenever og-image.png changes)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / sys.argv[1]
OGV = sys.argv[2]
DST = ROOT / 'index.html'
html = SRC.read_text(encoding='utf-8')
live = DST.read_text(encoding='utf-8')

# em dashes (house rule: none on Tront pages); a spaced hyphen keeps the pause
html = html.replace(' — ', ' - ').replace('—', '-')

# og/twitter image cache-bust
n = html.count('/senddudes/og-image.png"')
if n < 1:
    sys.exit('ABORT: og-image meta not found')
html = re.sub(r'/senddudes/og-image\.png(\?v=\d+)?"', f'/senddudes/og-image.png?v={OGV}"', html)

m = re.search(r'<!-- tront-about:start -->.*?<!-- tront-about:end -->\n', live, re.S)
if not m:
    sys.exit('ABORT: no tront-about block in current index.html')
if 'tront-about:start' in html or html.count('</body>') != 1:
    sys.exit('ABORT: drop already has an About block or not exactly one </body>')
about = m.group(0)
# v0.6 campaign dock (salvage/supply + recruit cards) owns the bottom-left corner; step aside while it is up
HIDE = 'body:has(#recruitment:not([hidden])) .tront-about{display:none}'
if HIDE not in about:
    about = about.replace('</style>', HIDE + '</style>', 1)
html = html.replace('</body>', about + '</body>')

DST.write_text(html, encoding='utf-8', newline='')
print(f'wrote {DST} ({len(html)} chars, og meta hits {n}, em dashes left {html.count(chr(0x2014))})')
