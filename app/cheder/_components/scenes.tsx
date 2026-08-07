'use client';

// Hand-animated scenes for the "Bring it to life" layer. In the full school
// these are AI-generated inside Rav-approved templates; the demo ships three
// pre-approved scenes so the experience is real without a generation backend.

export function TallisScene() {
  return (
    <svg viewBox="0 0 380 240" className="w-full rounded-2xl" style={{ backgroundColor: 'var(--ch-violet-soft)' }}>
      {/* floor */}
      <rect x="0" y="196" width="380" height="44" fill="#e2ddf5" />
      {/* beis din desk + dayan */}
      <g style={{ animation: 'cheder-fade 0.8s ease-out both' }}>
        <rect x="140" y="96" width="100" height="34" rx="6" fill="#8b6f47" />
        <rect x="150" y="130" width="10" height="30" fill="#75593a" />
        <rect x="220" y="130" width="10" height="30" fill="#75593a" />
        <ellipse cx="190" cy="62" rx="17" ry="15" fill="#eec39a" />
        <path d="M173 64 q-1 22 17 24 q18-2 17-24 q-5 13-17 13 t-17-13z" fill="#d7d2ca" />
        <ellipse cx="190" cy="48" rx="22" ry="6" fill="#14181f" />
        <path d="M175 46 q0-13 15-13 t15 13 q-7 4-15 4 t-15-4z" fill="#171c25" />
        <circle cx="184" cy="60" r="4" fill="none" stroke="#20242c" strokeWidth="1.6" />
        <circle cx="196" cy="60" r="4" fill="none" stroke="#20242c" strokeWidth="1.6" />
        <path d="M188 60 h4" stroke="#20242c" strokeWidth="1.6" />
      </g>

      {/* left boy */}
      <g style={{ animation: 'cheder-tug-l 2.2s ease-in-out infinite', transformOrigin: '90px 200px' }}>
        <path d="M64 148 q-8 40 0 52 q26 8 52 0 q8-12 0-52 q-12-10 -26-10 t-26 10z" fill="#2563eb" />
        <ellipse cx="90" cy="122" rx="20" ry="18" fill="#eec39a" />
        <path d="M70 124 q-1 20 20 22 q21-2 20-22 q-6 12-20 12 t-20-12z" fill="#2b2620" />
        <ellipse cx="90" cy="106" rx="26" ry="7" fill="#14181f" />
        <path d="M72 104 q0-15 18-15 t18 15 q-8 5-18 5 t-18-5z" fill="#171c25" />
        <path d="M84 132 q6 4 12 0" stroke="#7c3d1e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M112 158 q18-4 34 2 l-4 12 q-16-4 -32-2z" fill="#eec39a" />
      </g>

      {/* right boy */}
      <g style={{ animation: 'cheder-tug-r 2.2s ease-in-out infinite', transformOrigin: '290px 200px' }}>
        <path d="M264 148 q-8 40 0 52 q26 8 52 0 q8-12 0-52 q-12-10 -26-10 t-26 10z" fill="#0d9488" />
        <ellipse cx="290" cy="122" rx="20" ry="18" fill="#e9b98d" />
        <path d="M270 124 q-1 20 20 22 q21-2 20-22 q-6 12-20 12 t-20-12z" fill="#3a2f1e" />
        <ellipse cx="290" cy="106" rx="26" ry="7" fill="#14181f" />
        <path d="M272 104 q0-15 18-15 t18 15 q-8 5-18 5 t-18-5z" fill="#171c25" />
        <path d="M284 132 q6 4 12 0" stroke="#7c3d1e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M268 158 q-18-4 -34 2 l4 12 q16-4 32-2z" fill="#e9b98d" />
      </g>

      {/* tallis */}
      <g style={{ animation: 'cheder-tug-l 2.2s ease-in-out infinite', transformOrigin: '190px 170px' }}>
        <rect x="138" y="152" width="104" height="44" rx="4" fill="#ffffff" stroke="#d3d9e3" />
        <rect x="146" y="156" width="6" height="36" fill="#1a202c" />
        <rect x="158" y="156" width="3" height="36" fill="#1a202c" />
        <rect x="228" y="156" width="6" height="36" fill="#1a202c" />
        <rect x="219" y="156" width="3" height="36" fill="#1a202c" />
        {/* the split line — draws itself after a beat */}
        <line
          x1="190" y1="148" x2="190" y2="200"
          stroke="var(--ch-violet)" strokeWidth="3" strokeDasharray="6 5"
          style={{ strokeDashoffset: 60, animation: 'cheder-draw 1s ease-out 2.4s both' }}
        />
      </g>

      {/* verdict */}
      <g style={{ animation: 'cheder-fade 0.8s ease-out 3s both' }}>
        <rect x="118" y="14" width="144" height="26" rx="13" fill="#ffffff" stroke="#e0dcf2" />
        <text x="190" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ch-violet)">
          יַחֲלוֹקוּ — they split it
        </text>
      </g>
    </svg>
  );
}

export function HagalaScene() {
  return (
    <svg viewBox="0 0 380 240" className="w-full rounded-2xl" style={{ backgroundColor: 'var(--ch-amber-soft)' }}>
      {/* counter */}
      <rect x="0" y="200" width="380" height="40" fill="#f3e3c2" />
      {/* stove */}
      <rect x="110" y="176" width="160" height="28" rx="6" fill="#3f4756" />
      <circle cx="140" cy="190" r="4" fill="#8b93a3" />
      <circle cx="158" cy="190" r="4" fill="#8b93a3" />
      {/* flames */}
      {[150, 175, 200, 225].map((x, i) => (
        <path
          key={x}
          d={`M${x} 176 q4-12 8-2 q4-8 6 2 z`}
          fill="#f59e0b"
          style={{ animation: `cheder-bubble 0.9s ease-in ${i * 0.2}s infinite` }}
        />
      ))}
      {/* big pot */}
      <path d="M120 108 h140 l-10 68 h-120 z" fill="#8b93a3" />
      <rect x="112" y="100" width="156" height="12" rx="6" fill="#6b7484" />
      <path d="M108 112 q-16 4 -8 20 l10 2" fill="none" stroke="#6b7484" strokeWidth="7" strokeLinecap="round" />
      <path d="M272 112 q16 4 8 20 l-10 2" fill="none" stroke="#6b7484" strokeWidth="7" strokeLinecap="round" />
      {/* water */}
      <ellipse cx="190" cy="108" rx="70" ry="8" fill="#7dd3fc" />
      {/* bubbles */}
      {[
        [150, 0], [175, 0.5], [200, 0.2], [225, 0.8], [165, 1.1], [215, 1.4],
      ].map(([x, d], i) => (
        <circle
          key={i}
          cx={x} cy={150} r={i % 2 ? 4 : 6}
          fill="#bae6fd" opacity="0"
          style={{ animation: `cheder-bubble 1.6s ease-in ${d}s infinite` }}
        />
      ))}
      {/* steam */}
      {[140, 190, 240].map((x, i) => (
        <path
          key={x}
          d={`M${x} 92 q-6-10 0-18 q6-8 0-16`}
          fill="none" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" opacity="0"
          style={{ animation: `cheder-steam 2.4s ease-out ${i * 0.7}s infinite` }}
        />
      ))}
      {/* tongs dipping the small pot */}
      <g style={{ animation: 'cheder-dip 3s ease-in-out infinite' }}>
        <path d="M236 30 l26 34 M262 30 l-14 36" stroke="#4b5563" strokeWidth="5" strokeLinecap="round" />
        <path d="M228 62 h44 l-6 26 h-32 z" fill="#c0c7d1" />
        <rect x="224" y="56" width="52" height="8" rx="4" fill="#9aa4b2" />
      </g>
      {/* caption */}
      <g style={{ animation: 'cheder-fade 0.8s ease-out 1.2s both' }}>
        <rect x="96" y="12" width="188" height="26" rx="13" fill="#ffffff" stroke="#f3e0b8" />
        <text x="190" y="29" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ch-amber)">
          הַגְעָלָה — boiled back to kosher
        </text>
      </g>
    </svg>
  );
}

export function LightScene() {
  return (
    <svg viewBox="0 0 380 240" className="w-full rounded-2xl" style={{ backgroundColor: '#0b1230' }}>
      <defs>
        <radialGradient id="cheder-glow" cx="72%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f8c86a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0b1230" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* stars in the dark half */}
      {[
        [40, 40], [78, 88], [30, 140], [110, 52], [64, 178], [130, 120],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} fill="#93a6d8"
          style={{ animation: `cheder-fade 1.4s ease-in-out ${i * 0.3}s infinite alternate` }} />
      ))}
      {/* light wash */}
      <rect x="0" y="0" width="380" height="240" fill="url(#cheder-glow)" style={{ animation: 'cheder-fade 1.6s ease-out both' }} />
      {/* rays */}
      <g style={{ transformOrigin: '272px 96px', animation: 'cheder-rays 36s linear infinite' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="268" y="18" width="8" height="42" rx="4" fill="#fde68a" opacity="0.5"
            transform={`rotate(${i * 45} 272 96)`} />
        ))}
      </g>
      <circle cx="272" cy="96" r="30" fill="#fef3c7" />
      {/* waters below */}
      <path d="M0 196 q40-12 80 0 t80 0 t80 0 t80 0 t80 0 v44 h-400z" fill="#1e3a8a"
        style={{ animation: 'cheder-float 5s ease-in-out infinite' }} />
      <path d="M0 210 q40-10 80 0 t80 0 t80 0 t80 0 t80 0 v30 h-400z" fill="#172d6e" opacity="0.9"
        style={{ animation: 'cheder-float 6.5s ease-in-out 0.6s infinite' }} />
      {/* caption */}
      <g style={{ animation: 'cheder-fade 0.8s ease-out 1.6s both' }}>
        <rect x="102" y="12" width="176" height="26" rx="13" fill="#0f1b45" stroke="#28407f" />
        <text x="190" y="29" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fde68a">
          וַיַּבְדֵּל — light from darkness
        </text>
      </g>
    </svg>
  );
}
