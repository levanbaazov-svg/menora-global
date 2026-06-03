// Generate PWA / app icons from a brand SVG (gold Chabad straight-arm menorah
// on the deep brand background). Outputs PNGs into /public. Run: node scripts/gen-icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GOLD = '#C99B43';
const DEEP = '#14181F';
const OUT = path.join(__dirname, '..', 'public');

// Straight-arm menorah (Chabad tradition) centered in a 512 box.
function menorah(scale = 1) {
  // candle x positions (center + 3 each side), tops level
  const cx = 256;
  const xs = [cx - 168, cx - 112, cx - 56, cx, cx + 56, cx + 112, cx + 168];
  const topY = 168;        // candle base line
  const flameY = 150;      // flame centre
  const apex = 360;        // where arms + shaft meet
  const arms = xs
    .filter((x) => x !== cx)
    .map((x) => `M256 ${apex} L ${x} ${topY}`)
    .join(' ');
  const candles = xs.map((x) => `M${x} ${topY} L ${x} 138`).join(' ');
  const flames = xs
    .map((x) => `<circle cx="${x}" cy="${flameY}" r="11" fill="${GOLD}" />`)
    .join('');
  const inner = `
    <g stroke="${GOLD}" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${arms}" />
      <path d="${candles}" />
      <path d="M256 ${topY} L 256 ${apex}" />
      <path d="M196 392 H316" />
      <path d="M226 360 L 196 392 M286 360 L 316 392" />
    </g>
    ${flames}`;
  // scale around centre (for maskable padding)
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g>`;
}

function svg(scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${DEEP}"/>
    ${menorah(scale)}
  </svg>`;
}

async function main() {
  // canonical SVG (full size) for browsers that accept SVG icons
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg(1));

  const jobs = [
    ['icon-192.png', svg(1), 192],
    ['icon-512.png', svg(1), 512],
    ['icon-maskable-512.png', svg(0.72), 512], // safe-zone padding for maskable
    ['apple-icon-180.png', svg(1), 180],
    ['favicon-32.png', svg(1), 32],
  ];
  for (const [name, src, size] of jobs) {
    await sharp(Buffer.from(src)).resize(size, size).png().toFile(path.join(OUT, name));
    console.log('wrote', name);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
