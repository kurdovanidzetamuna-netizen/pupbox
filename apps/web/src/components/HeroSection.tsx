'use client';
import Link from 'next/link';

function GoldenRetriever() {
  return (
    <div className="relative w-full max-w-md mx-auto select-none">

      {/* floating elements */}
      <span className="absolute top-2 right-6 text-3xl float-elem" style={{ animationDelay: '0s', animationDuration: '3s' }}>🦴</span>
      <span className="absolute top-24 -left-4 text-2xl float-elem" style={{ animationDelay: '0.7s', animationDuration: '3.5s' }}>🐾</span>
      <span className="absolute top-10 left-16 text-xl float-elem" style={{ animationDelay: '1.4s', animationDuration: '4s' }}>⭐</span>
      <span className="absolute bottom-24 -right-2 text-2xl float-elem" style={{ animationDelay: '0.3s', animationDuration: '3.2s' }}>🎾</span>
      <span className="absolute bottom-12 left-4 text-xl float-elem" style={{ animationDelay: '1.1s', animationDuration: '3.8s' }}>🐾</span>
      <span className="absolute top-36 right-2 text-lg float-elem" style={{ animationDelay: '0.5s', animationDuration: '4.2s' }}>✨</span>

      {/* dog SVG */}
      <div className="dog-float">
        <svg viewBox="0 0 320 360" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
          <defs>
            <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#F5C842" />
              <stop offset="100%" stopColor="#D4891A" />
            </radialGradient>
            <radialGradient id="chestGrad" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F5C842" />
            </radialGradient>
            <radialGradient id="earGrad" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#E8A020" />
              <stop offset="100%" stopColor="#C07810" />
            </radialGradient>
          </defs>

          {/* shadow */}
          <ellipse cx="160" cy="345" rx="105" ry="12" fill="#00000015" />

          {/* tail — animated */}
          <g className="tail-wag" style={{ transformOrigin: '215px 230px' }}>
            <path d="M215 230 Q268 195 262 148 Q258 118 242 130" stroke="#D4891A" strokeWidth="26" fill="none" strokeLinecap="round" />
            <path d="M215 230 Q268 195 262 148 Q258 118 242 130" stroke="#F5C842" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M215 230 Q268 195 262 148 Q258 118 242 130" stroke="#FDE68A" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
          </g>

          {/* rear haunches */}
          <ellipse cx="90" cy="278" rx="52" ry="44" fill="#C07810" />
          <ellipse cx="218" cy="278" rx="52" ry="44" fill="#D4891A" />

          {/* body */}
          <ellipse cx="155" cy="240" rx="90" ry="78" fill="url(#bodyGrad)" />

          {/* fluffy chest */}
          <ellipse cx="152" cy="212" rx="64" ry="60" fill="url(#chestGrad)" />

          {/* neck */}
          <path d="M122 158 Q152 145 182 158 L178 200 Q152 190 126 200 Z" fill="#D4891A" />

          {/* head */}
          <circle cx="152" cy="128" r="68" fill="url(#bodyGrad)" />

          {/* left ear */}
          <path d="M98 98 Q64 78 58 148 Q62 182 96 178 Q116 162 112 122 Z" fill="url(#earGrad)" />
          {/* ear inner */}
          <path d="M96 108 Q76 98 74 150 Q78 172 96 168 Q108 156 106 126 Z" fill="#E8A020" opacity="0.5" />

          {/* right ear */}
          <path d="M206 98 Q240 78 242 148 Q238 182 204 178 Q184 162 188 122 Z" fill="url(#earGrad)" />
          {/* ear inner */}
          <path d="M204 108 Q224 98 226 150 Q222 172 204 168 Q192 156 194 126 Z" fill="#E8A020" opacity="0.5" />

          {/* muzzle */}
          <ellipse cx="152" cy="152" rx="42" ry="33" fill="url(#chestGrad)" />

          {/* left eye white */}
          <circle cx="128" cy="118" r="13" fill="#2A1408" />
          <circle cx="128" cy="118" r="11" fill="#3D1C08" />
          <circle cx="128" cy="118" r="8" fill="#1A0C04" />
          <circle cx="131" cy="114" r="4" fill="white" />
          <circle cx="133" cy="116" r="1.5" fill="white" opacity="0.6" />
          {/* blink layer left */}
          <ellipse cx="128" cy="118" rx="11" ry="11" fill="#D4891A" className="blink-left" />

          {/* right eye */}
          <circle cx="176" cy="118" r="13" fill="#2A1408" />
          <circle cx="176" cy="118" r="11" fill="#3D1C08" />
          <circle cx="176" cy="118" r="8" fill="#1A0C04" />
          <circle cx="179" cy="114" r="4" fill="white" />
          <circle cx="181" cy="116" r="1.5" fill="white" opacity="0.6" />
          {/* blink layer right */}
          <ellipse cx="176" cy="118" rx="11" ry="11" fill="#D4891A" className="blink-right" />

          {/* eyebrows */}
          <path d="M118 102 Q128 97 138 102" stroke="#B07010" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M166 102 Q176 97 186 102" stroke="#B07010" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />

          {/* rosy cheeks */}
          <circle cx="108" cy="145" r="14" fill="#F97316" opacity="0.18" />
          <circle cx="196" cy="145" r="14" fill="#F97316" opacity="0.18" />

          {/* nose */}
          <path d="M140 147 Q152 141 164 147 Q164 160 152 163 Q140 160 140 147 Z" fill="#1A0C04" />
          <ellipse cx="146" cy="150" rx="5" ry="3" fill="#2D1810" opacity="0.5" />
          <ellipse cx="150" cy="147" rx="4" ry="2" fill="#3D2010" opacity="0.4" />

          {/* smile */}
          <path d="M137 165 Q152 176 167 165" stroke="#1A0C04" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* tongue */}
          <ellipse cx="152" cy="174" rx="10" ry="8" fill="#F87171" />
          <line x1="152" y1="166" x2="152" y2="182" stroke="#EF4444" strokeWidth="1.5" />

          {/* front left paw */}
          <ellipse cx="112" cy="305" rx="36" ry="24" fill="#C07810" />
          <ellipse cx="112" cy="298" rx="32" ry="20" fill="#D4891A" />
          {/* paw toes */}
          <circle cx="98" cy="294" r="7" fill="#C07810" opacity="0.6" />
          <circle cx="112" cy="291" r="7" fill="#C07810" opacity="0.6" />
          <circle cx="126" cy="294" r="7" fill="#C07810" opacity="0.6" />

          {/* front right paw */}
          <ellipse cx="194" cy="305" rx="36" ry="24" fill="#C07810" />
          <ellipse cx="194" cy="298" rx="32" ry="20" fill="#D4891A" />
          <circle cx="180" cy="294" r="7" fill="#C07810" opacity="0.6" />
          <circle cx="194" cy="291" r="7" fill="#C07810" opacity="0.6" />
          <circle cx="208" cy="294" r="7" fill="#C07810" opacity="0.6" />

          {/* fluffy chest detail */}
          <path d="M122 200 Q152 188 182 200" stroke="#FDE68A" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" />
          <path d="M118 214 Q152 202 186 214" stroke="#FDE68A" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M115 228 Q152 216 189 228" stroke="#FDE68A" strokeWidth="2" fill="none" opacity="0.25" strokeLinecap="round" />
        </svg>
      </div>

      {/* image pills below dog */}
      <div className="flex justify-center gap-3 mt-2 flex-wrap">
        {[
          { emoji: '🦴', label: 'Treats' },
          { emoji: '🧸', label: 'Toys' },
          { emoji: '✨', label: 'Grooming' },
          { emoji: '🎁', label: 'Surprises' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 bg-white border border-amber-100 shadow-sm text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-full">
            <span>{item.emoji}</span>{item.label}
          </div>
        ))}
      </div>

      <style>{`
        .dog-float {
          animation: dogFloat 4s ease-in-out infinite;
        }
        @keyframes dogFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }

        .tail-wag {
          animation: tailWag 0.6s ease-in-out infinite alternate;
        }
        @keyframes tailWag {
          0%   { transform: rotate(-18deg); }
          100% { transform: rotate(18deg); }
        }

        .float-elem {
          position: absolute;
          animation: floatElem var(--dur, 3s) ease-in-out infinite;
        }
        @keyframes floatElem {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(8deg); }
          66%       { transform: translateY(-5px) rotate(-5deg); }
        }

        .blink-left, .blink-right {
          animation: blink 5s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .blink-right { animation-delay: 0.05s; }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(0); }
          94%            { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 py-16 px-6">
      {/* blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-200 rounded-full opacity-25 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* ── LEFT: text ── */}
          <div className="text-left">
            <span className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">
              🐶 Monthly Dog Subscription Boxes · Georgia
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Your dog deserves<br />
              <span className="text-teal-600">a surprise</span><br />
              every month
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-lg">
              Curated boxes of premium treats, toys and accessories — tailored to your dog's size and breed. Delivered across Georgia.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10 flex-wrap">
              <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-teal-700 transition shadow-lg shadow-teal-100 hover:scale-105">
                Start Your Subscription →
              </Link>
              <Link href="/prices?gift=true" className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition shadow-lg shadow-amber-100 hover:scale-105">
                🎁 Give as a Gift
              </Link>
              <Link href="/how-it-works" className="inline-flex items-center justify-center border-2 border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg hover:border-teal-400 hover:text-teal-600 transition">
                How It Works
              </Link>
            </div>

            {/* trust bar */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">✅ Cancel anytime</span>
              <span className="flex items-center gap-1.5">🚚 Free delivery</span>
              <span className="flex items-center gap-1.5">🐾 Personalised boxes</span>
              <span className="flex items-center gap-1.5">⭐ 4.9 rating</span>
            </div>
          </div>

          {/* ── RIGHT: dog ── */}
          <div className="flex items-center justify-center">
            <GoldenRetriever />
          </div>
        </div>
      </div>
    </section>
  );
}
