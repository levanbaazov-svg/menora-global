// Generate PWA / app icons from a brand SVG — a Chabad menorah (straight
// diagonal arms, cups + teardrop flames on top, proportional base) in gold on
// the deep brand background. Outputs PNGs into /public. Run: node scripts/gen-icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GOLD = '#C99B43';
const DEEP = '#14181F';
const OUT = path.join(__dirname, '..', 'public');

const cx = 256;
const XS = [cx - 150, cx - 100, cx - 50, cx, cx + 50, cx + 100, cx + 150];
const ARM_JOIN = [cx, 338]; // straight Chabad arms fan from one point on the shaft
const CUP_Y = 196;          // top of arm / base of cup
const FLAME_Y = 166;        // flame centre
const ARM_W = 16;           // arm/shaft stroke weight

function flame(x) {
  const h = 30;
  // teardrop: pointed top, rounded bottom
  return `<path d="M ${x} ${FLAME_Y - h}
    C ${x + 16} ${FLAME_Y - h * 0.4}, ${x + 14} ${FLAME_Y + h * 0.25}, ${x} ${FLAME_Y + h * 0.3}
    C ${x - 14} ${FLAME_Y + h * 0.25}, ${x - 16} ${FLAME_Y - h * 0.4}, ${x} ${FLAME_Y - h} Z"
    fill="${GOLD}"/>`;
}
function cup(x) {
  // goblet bowl (trapezoid) over a short stem — the oil cup of the menorah
  return `<path d="M ${x - 17} ${CUP_Y - 10} L ${x + 17} ${CUP_Y - 10} L ${x + 9} ${CUP_Y + 7} L ${x - 9} ${CUP_Y + 7} Z" fill="${GOLD}"/>`;
}

// Traditional menorah foot: knop on the shaft → tapered stem → two stacked,
// rounded tiers widening to the floor. Filled (not outlined) so it reads solid.
function base() {
  return `
    <circle cx="${cx}" cy="358" r="13" fill="${GOLD}"/>
    <path d="M 242 376 L 270 376 L 296 414 L 216 414 Z" fill="${GOLD}"/>
    <rect x="206" y="410" width="100" height="17" rx="7" fill="${GOLD}"/>
    <rect x="182" y="425" width="148" height="20" rx="9" fill="${GOLD}"/>`;
}

function menorah(scale = 1) {
  const arms = XS.map((x) => `M ${ARM_JOIN[0]} ${ARM_JOIN[1]} L ${x} ${CUP_Y + 8}`).join(' ');
  const inner = `
    <g stroke="${GOLD}" stroke-width="${ARM_W}" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${arms}" />
      <path d="M ${cx} ${ARM_JOIN[1]} L ${cx} 372" />        <!-- central shaft down to the knop -->
    </g>
    ${base()}
    ${XS.map(cup).join('')}
    ${XS.map(flame).join('')}`;
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g>`;
}

function svg(scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${DEEP}"/>
    ${menorah(scale)}
  </svg>`;
}

async function main() {
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg(1));
  const jobs = [
    ['icon-192.png', svg(1), 192],
    ['icon-512.png', svg(1), 512],
    ['icon-maskable-512.png', svg(0.72), 512],
    ['apple-icon-180.png', svg(1), 180],
    ['appicon-1024.png', svg(1), 1024],
    ['favicon-32.png', svg(1), 32],
  ];
  for (const [name, src, size] of jobs) {
    await sharp(Buffer.from(src)).resize(size, size).flatten({ background: DEEP }).png().toFile(path.join(OUT, name));
    console.log('wrote', name);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
