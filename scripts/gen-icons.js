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
const XS = [cx - 156, cx - 104, cx - 52, cx, cx + 52, cx + 104, cx + 156];
const ARM_JOIN = [cx, 356]; // straight Chabad arms fan from one point
const CUP_Y = 196;          // top of arm / base of cup
const FLAME_Y = 168;        // flame centre

function flame(x) {
  const h = 30;
  // teardrop: pointed top, rounded bottom
  return `<path d="M ${x} ${FLAME_Y - h}
    C ${x + 17} ${FLAME_Y - h * 0.4}, ${x + 15} ${FLAME_Y + h * 0.25}, ${x} ${FLAME_Y + h * 0.3}
    C ${x - 15} ${FLAME_Y + h * 0.25}, ${x - 17} ${FLAME_Y - h * 0.4}, ${x} ${FLAME_Y - h} Z"
    fill="${GOLD}"/>`;
}
function cup(x) {
  // goblet bowl (trapezoid) + small knob under it
  return `<path d="M ${x - 16} ${CUP_Y - 8} L ${x + 16} ${CUP_Y - 8} L ${x + 8} ${CUP_Y + 8} L ${x - 8} ${CUP_Y + 8} Z" fill="${GOLD}"/>
    <circle cx="${x}" cy="${CUP_Y + 14}" r="4.5" fill="${GOLD}"/>`;
}

function menorah(scale = 1) {
  const arms = XS.map((x) => `M ${ARM_JOIN[0]} ${ARM_JOIN[1]} L ${x} ${CUP_Y + 10}`).join(' ');
  const inner = `
    <g stroke="${GOLD}" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${arms}" />
      <path d="M 256 ${ARM_JOIN[1]} L 256 414" />            <!-- central shaft to base -->
      <path d="M 206 414 H 306" />                            <!-- base bar -->
      <path d="M 224 ${ARM_JOIN[1]} L 200 414 M 288 ${ARM_JOIN[1]} L 312 414" />  <!-- foot legs -->
    </g>
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
