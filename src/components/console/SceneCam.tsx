"use client";

/**
 * CAM · INSIDE: an illustrated, animated MOCKUP of the place where a mission's action happens, with
 * detection boxes in the style of God's Eye View's detection overlay. A real build would use a
 * camera feed, a detector and a 3D engine (README: perception + physical worlds); here every
 * frame is drawn by hand and labelled so.
 */

import type { Mission } from "@/lib/scenarios";

const CSS = `
.sc * { transform-box: fill-box; }
@keyframes cupPush { 0%,28% { transform: translate(0,0) rotate(0) } 42% { transform: translate(52px,0) rotate(8deg) } 58% { transform: translate(78px,74px) rotate(95deg) } 100% { transform: translate(78px,74px) rotate(95deg) } }
@keyframes hide58 { 0%,57% { opacity: 1 } 58%,100% { opacity: 0 } }
@keyframes show { from { opacity: 0 } to { opacity: 1 } }
@keyframes paw { 0%,22% { transform: translateX(0) } 32% { transform: translateX(16px) } 45%,100% { transform: translateX(0) } }
@keyframes wave { 0% { transform: scale(.2); opacity: .9 } 100% { transform: scale(2.4); opacity: 0 } }
@keyframes ball { 0%,18% { transform: translate(0,0) } 34% { transform: translate(150px,-120px) } 48% { transform: translate(318px,-86px) } 100% { transform: translate(318px,-86px) } }
@keyframes keys { 0%,25% { transform: translate(0,0) } 45%,100% { transform: translate(92px,0) } }
@keyframes cash { 0%,50% { transform: translate(0,0); opacity: 0 } 52% { opacity: 1 } 70%,100% { transform: translate(-92px,0); opacity: 1 } }
@keyframes walk { 0% { transform: translateX(-120px) } 30%,100% { transform: translateX(0) } }
@keyframes drop { 0%,30% { transform: translate(0,0); opacity: 0 } 31% { opacity: 1 } 40%,100% { transform: translate(10px,46px); opacity: 1 } }
@keyframes grow { 0% { transform: scale(0) } 100% { transform: scale(1) } }
@keyframes smoke { 0% { transform: translateY(0) scale(.6); opacity: .0 } 20% { opacity: .55 } 100% { transform: translateY(-140px) scale(1.8); opacity: 0 } }
@keyframes redflash { 0%,44% { fill: #0b2b3a } 46%,100% { fill: #5a0f14 } }
@keyframes type { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
.a { animation-duration: 6s; animation-fill-mode: both; animation-timing-function: cubic-bezier(.4,0,.3,1) }
`;

function Box({ x, y, w, h, label, delay = 0 }: { x: number; y: number; w: number; h: number; label: string; delay?: number }) {
  const c = "#00d4ff";
  const k = 9;
  return (
    <g style={{ animation: `show .4s ${delay}s both` }}>
      <path d={`M${x},${y + k}V${y}H${x + k} M${x + w - k},${y}H${x + w}V${y + k} M${x + w},${y + h - k}V${y + h}H${x + w - k} M${x + k},${y + h}H${x}V${y + h - k}`} stroke={c} strokeWidth={1.6} fill="none" />
      <rect x={x} y={y - 15} width={label.length * 6.3 + 10} height={13} fill="rgba(0,10,16,.82)" />
      <text x={x + 5} y={y - 5} fill={c} fontSize={9.5} fontFamily="JetBrains Mono, monospace" style={{ letterSpacing: ".06em" }}>{label}</text>
    </g>
  );
}

const Person = ({ x, y, c = "#c9cbd6", s = 1 }: { x: number; y: number; c?: string; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx={0} cy={-62} r={11} fill={c} />
    <path d="M-14,-48 Q0,-54 14,-48 L17,-8 L-17,-8 Z" fill={c} opacity={0.85} />
    <rect x={-12} y={-8} width={9} height={30} fill={c} opacity={0.7} />
    <rect x={3} y={-8} width={9} height={30} fill={c} opacity={0.7} />
  </g>
);

function LivingRoom() {
  return (
    <>
      <rect width={640} height={240} fill="#1b2031" />
      <rect y={240} width={640} height={120} fill="#2b2622" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={i * 90} y1={240} x2={i * 90 - 60} y2={360} stroke="#3a332d" />)}
      <rect x={60} y={44} width={124} height={116} fill="#5b7fae" opacity={0.55} />
      <path d="M122,44V160M60,102H184" stroke="#2a3149" strokeWidth={5} />
      <rect x={60} y={44} width={124} height={116} fill="none" stroke="#2a3149" strokeWidth={6} />
      <rect x={440} y={178} width={170} height={80} rx={14} fill="#4b3a5d" />
      <rect x={430} y={160} width={190} height={34} rx={14} fill="#584470" />
      <rect x={520} y={60} width={60} height={80} fill="#24293d" stroke="#3a4060" />
      <rect x={170} y={198} width={212} height={11} rx={3} fill="#8c6b45" />
      <rect x={182} y={209} width={9} height={64} fill="#6e5334" />
      <rect x={360} y={209} width={9} height={64} fill="#6e5334" />
      <ellipse cx={278} cy={300} rx={150} ry={22} fill="#3c3047" opacity={0.6} />
      {/* the cat */}
      <g>
        <ellipse cx={268} cy={182} rx={34} ry={16} fill="#d68a3a" />
        <path d="M232,182 Q206,166 214,140" stroke="#d68a3a" strokeWidth={7} fill="none" strokeLinecap="round" />
        <circle cx={300} cy={168} r={14} fill="#d68a3a" />
        <path d="M290,158 L292,144 L299,155 Z M304,155 L311,144 L313,158 Z" fill="#d68a3a" />
        <circle cx={305} cy={166} r={2} fill="#111" /><circle cx={296} cy={166} r={2} fill="#111" />
        <rect className="a" x={300} y={186} width={16} height={6} rx={3} fill="#c27a2e" style={{ animationName: "paw" }} />
      </g>
      {/* the tea cup */}
      <g className="a" style={{ animationName: "cupPush, hide58", transformOrigin: "center" }}>
        <path d="M322,178 h24 l-3,20 h-18 z" fill="#f2efe8" />
        <path d="M346,184 q9,1 7,8 q-2,5 -8,3" stroke="#f2efe8" strokeWidth={3} fill="none" />
        <rect x={323} y={179} width={22} height={4} fill="#9a5a24" />
      </g>
      {/* after the fall */}
      <g style={{ animation: "show .2s 3.5s both" }}>
        <ellipse cx={412} cy={286} rx={46} ry={8} fill="#8f5524" opacity={0.75} />
        <path d="M396,280 l8,-6 4,7z M414,282 l10,-4 -2,8z M428,279 l6,-5 3,7z M404,288 l7,2 -6,4z" fill="#f2efe8" />
        <circle cx={412} cy={282} r={30} fill="none" stroke="#ff6b6b" strokeWidth={2} style={{ animation: "wave 1.2s 3.5s ease-out 2 both", transformOrigin: "center" }} />
        <text x={446} y={262} fill="#ff8f8f" fontSize={13} fontFamily="JetBrains Mono, monospace" fontWeight={700}>CRASH</text>
      </g>
      <g style={{ animation: "show .5s 4.4s both" }}>
        <rect x={10} y={110} width={46} height={150} fill="#141826" />
        <Person x={34} y={248} c="#9fb2d9" />
        <text x={50} y={168} fill="#ffc857" fontSize={22} fontWeight={800}>!</text>
      </g>
      <Box x={226} y={146} w={96} h={56} label="CAT · animal · 0.97" delay={0.3} />
      <Box x={316} y={172} w={44} h={30} label="TEA CUP · porcelain · 0.93" delay={0.6} />
      <Box x={8} y={176} w={54} h={96} label="LÉA · human · 0.91" delay={4.6} />
    </>
  );
}

function Garden() {
  return (
    <>
      <rect width={640} height={360} fill="#2a3f5c" />
      <circle cx={90} cy={60} r={26} fill="#f3d27a" opacity={0.8} />
      <rect y={250} width={640} height={110} fill="#2f5a2c" />
      <rect x={400} y={70} width={240} height={190} fill="#7a6252" />
      <path d="M390,72 L520,10 L650,72 Z" fill="#5a3f33" />
      <rect x={455} y={110} width={92} height={70} fill="#8fbbe0" opacity={0.75} stroke="#3c2f27" strokeWidth={5} />
      <path d="M501,110V180M455,145H547" stroke="#3c2f27" strokeWidth={4} />
      {Array.from({ length: 22 }, (_, i) => <rect key={i} x={i * 18} y={212} width={12} height={46} fill="#b9905a" />)}
      <rect x={0} y={222} width={396} height={6} fill="#a07a48" />
      <Person x={120} y={268} c="#e0b48a" s={0.8} />
      <circle className="a" cx={152} cy={264} r={9} fill="#f4f4f4" stroke="#222" style={{ animationName: "ball" }} />
      <g style={{ animation: "show .1s 2.9s both" }}>
        <path d="M470,178 L470,178 M462,166 l14,-6 M470,166 l-3,-14 l9,-4 M472,164 l14,5 l6,-9 M470,166 l-12,12" stroke="#fff" strokeWidth={1.6} fill="none" />
        <circle cx={470} cy={166} r={20} fill="none" stroke="#ff6b6b" strokeWidth={2} style={{ animation: "wave 1.2s 2.9s ease-out 2 both", transformOrigin: "center" }} />
        <text x={378} y={104} fill="#ff8f8f" fontSize={13} fontFamily="JetBrains Mono, monospace" fontWeight={700}>SMASH</text>
      </g>
      <g style={{ animation: "show .5s 4.2s both" }}>
        <Person x={520} y={178} c="#9fb2d9" s={0.6} />
        <text x={532} y={134} fill="#ffc857" fontSize={18} fontWeight={800}>!</text>
      </g>
      <Box x={92} y={196} w={58} h={78} label="LEO · human · 0.96" delay={0.3} />
      <Box x={140} y={252} w={24} h={24} label="BALL · 0.94" delay={0.5} />
      <Box x={450} y={104} w={102} h={82} label="WINDOW · glass · fragile" delay={0.8} />
      <Box x={500} y={130} w={40} h={52} label="MRS MARTIN · 0.84" delay={4.4} />
    </>
  );
}

function Street() {
  return (
    <>
      <rect width={640} height={360} fill="#1c2232" />
      {[0, 1, 2, 3].map((b) => (
        <g key={b}>
          <rect x={b * 165} y={20} width={158} height={210} fill={b % 2 ? "#c9b48f" : "#d6c39e"} opacity={0.35} />
          {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={b * 165 + 14 + c * 36} y={40 + r * 60} width={20} height={34} fill="#3b4a6b" opacity={0.8} />))}
        </g>
      ))}
      <rect y={230} width={640} height={130} fill="#2b2e36" />
      <rect y={226} width={640} height={10} fill="#4a4d55" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 120 + 20} y={312} width={60} height={5} fill="#d9d9d9" opacity={0.5} />)}
      <g transform="translate(60 214)">
        <path d="M0,40 Q8,6 60,4 L120,4 Q150,6 168,30 L176,40 Z" fill="#3b78c4" />
        <rect x={0} y={38} width={180} height={22} rx={6} fill="#2f63a8" />
        <circle cx={38} cy={62} r={13} fill="#111" /><circle cx={142} cy={62} r={13} fill="#111" />
        <path d="M60,8 L72,30 L118,30 L116,8 Z" fill="#9cc3ea" opacity={0.8} />
      </g>
      <Person x={300} y={300} c="#e0c09a" />
      <Person x={392} y={300} c="#d8a7c7" />
      <Person x={540} y={300} c="#9fb2d9" />
      <g className="a" style={{ animationName: "keys" }}>
        <circle cx={316} cy={262} r={5} fill="none" stroke="#ffd04d" strokeWidth={2} /><rect x={319} y={260} width={10} height={3} fill="#ffd04d" />
      </g>
      <g className="a" style={{ animationName: "cash" }}>
        <rect x={378} y={256} width={22} height={12} fill="#7fd09b" /><text x={382} y={266} fontSize={9} fill="#0b3">€</text>
      </g>
      <g style={{ animation: "show .5s 4.6s both" }}>
        <rect x={556} y={190} width={78} height={22} rx={6} fill="rgba(230,103,103,.2)" stroke="#e66767" />
        <text x={563} y={205} fill="#ffb3b3" fontSize={10} fontFamily="JetBrains Mono, monospace">✕ GOAL BLOCKED</text>
      </g>
      <Box x={276} y={226} w={48} h={98} label="ME · seller · 0.95" delay={0.3} />
      <Box x={368} y={226} w={48} h={98} label="SARAH · buyer · 0.93" delay={0.5} />
      <Box x={516} y={226} w={48} h={98} label="MARK · wants the car" delay={0.7} />
      <Box x={58} y={214} w={182} h={64} label="CAR · hatchback · 0.97" delay={0.9} />
    </>
  );
}

function Office() {
  return (
    <>
      <rect width={640} height={360} fill="#121827" />
      <rect x={0} y={0} width={640} height={170} fill="#1d2b44" />
      {[40, 110, 170, 250, 330, 420, 500, 580].map((x, i) => <rect key={x} x={x} y={170 - (60 + (i * 37) % 110)} width={40} height={60 + (i * 37) % 110} fill="#2b3d5f" />)}
      <rect y={170} width={640} height={190} fill="#1a1f2b" />
      <rect x={460} y={30} width={160} height={90} fill="#0b2b3a" stroke="#2b4a5f" style={{ animation: "redflash 6s both" }} />
      <text x={472} y={52} fill="#9fe3ff" fontSize={10} fontFamily="JetBrains Mono, monospace">payments · error rate</text>
      <polyline points="472,100 500,98 530,99 560,97 575,60 590,40 608,38" stroke="#ff6b6b" strokeWidth={2} fill="none" style={{ animation: "show .3s 2.8s both" }} />
      <rect x={140} y={240} width={360} height={12} fill="#3a4152" />
      <rect x={160} y={252} width={8} height={70} fill="#2a2f3b" /><rect x={472} y={252} width={8} height={70} fill="#2a2f3b" />
      <rect x={250} y={160} width={150} height={82} rx={4} fill="#0b2b3a" stroke="#4a5568" strokeWidth={3} style={{ animation: "redflash 6s both" }} />
      <text x={262} y={186} fill="#7dffb0" fontSize={10.5} fontFamily="JetBrains Mono, monospace" style={{ animation: "type 1.4s .8s steps(26) both" }}>&gt; DROP DATABASE customers;</text>
      <text x={262} y={212} fill="#ffb3b3" fontSize={12} fontWeight={700} fontFamily="JetBrains Mono, monospace" style={{ animation: "show .2s 2.8s both" }}>ERROR 500 · 0 rows</text>
      <Person x={322} y={330} c="#c9b18f" />
      <g style={{ animation: "show .5s 4.2s both" }}>
        <Person x={560} y={330} c="#9fb2d9" />
        <text x={574} y={250} fill="#ffc857" fontSize={20} fontWeight={800}>!</text>
      </g>
      <Box x={296} y={250} w={52} h={86} label="SAM · engineer · 0.95" delay={0.3} />
      <Box x={246} y={156} w={158} h={90} label="PROD DB · console" delay={0.6} />
      <Box x={456} y={26} w={168} h={98} label="DASHBOARD · alerts" delay={2.9} />
      <Box x={534} y={250} w={52} h={86} label="PRIYA · lead · 0.88" delay={4.4} />
    </>
  );
}

function Forest() {
  return (
    <>
      <rect width={640} height={360} fill="#4a3a35" />
      <rect width={640} height={180} fill="#b8794a" opacity={0.45} />
      <path d="M0,200 Q160,130 320,180 T640,160 V360 H0 Z" fill="#6b5a3a" />
      <path d="M0,260 Q200,220 380,250 T640,240 V360 H0 Z" fill="#7d6a43" />
      <path d="M40,300 Q260,270 640,292" stroke="#a89060" strokeWidth={10} fill="none" opacity={0.6} />
      {[60, 130, 420, 480, 540, 600, 360].map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y={190 + (i % 3) * 14} width={6} height={30} fill="#3a2a1a" />
          <path d={`M${x - 20},${200 + (i % 3) * 14} L${x},${140 + (i % 3) * 14} L${x + 20},${200 + (i % 3) * 14} Z`} fill="#55613a" />
        </g>
      ))}
      <g className="a" style={{ animationName: "walk" }}><Person x={250} y={300} c="#d6b088" s={0.8} /></g>
      <circle className="a" cx={262} cy={262} r={3} fill="#ff8a3d" style={{ animationName: "drop" }} />
      <g style={{ transformOrigin: "272px 308px" }}>
        {[0, 1, 2].map((k) => (
          <path key={k} d={`M${262 + k * 26},310 q-12,-20 0,-44 q4,16 12,6 q10,18 -2,38 z`} fill={k % 2 ? "#ffb347" : "#ff6a2b"}
            style={{ animation: `grow 2.2s ${2.6 + k * 0.5}s both`, transformOrigin: `${268 + k * 26}px 310px` }} />
        ))}
        {[360, 420, 480].map((x, k) => (
          <path key={x} d={`M${x - 14},${215 + (k % 3) * 14} q-4,-30 14,-60 q12,30 14,60 z`} fill="#ff6a2b" opacity={0.9}
            style={{ animation: `grow 1.6s ${4 + k * 0.4}s both`, transformOrigin: `${x}px ${215 + (k % 3) * 14}px` }} />
        ))}
        {[0, 1, 2, 3, 4].map((k) => (
          <circle key={k} cx={290 + k * 40} cy={250} r={22} fill="#777" style={{ animation: `smoke 3s ${3 + k * 0.5}s infinite`, transformOrigin: "center" }} />
        ))}
      </g>
      <Box x={222} y={226} w={56} h={80} label="HIKER · human · 0.92" delay={1.6} />
      <Box x={254} y={292} w={30} h={24} label="CIGARETTE · lit · 0.71" delay={2.3} />
      <Box x={330} y={150} w={180} h={110} label="DRY BRUSH · fuel 6% moist." delay={3.4} />
    </>
  );
}

const SCENES = { living_room: LivingRoom, garden: Garden, street: Street, office: Office, forest: Forest };

export function SceneCam({ m, playKey, onClose, onLive, live }: { m: Mission; playKey: number; onClose: () => void; onLive: () => void; live: boolean }) {
  const S = SCENES[m.setting];
  return (
    <section className="glass rise w-[min(720px,calc(100vw-32px))] overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b hairline px-4 py-2.5">
        <p className="hud-label !text-[var(--accent)]"><span className="rec mr-1" />CAM · inside · {m.inside}</p>
        <button className="hbtn !px-2 !py-1" onClick={onClose} aria-label="Close camera">✕</button>
      </header>
      <div className="relative bg-black">
        <svg key={playKey} viewBox="0 0 640 360" className="sc block w-full" role="img" aria-label={`${m.title}: illustrated mockup of the scene`}>
          <style>{CSS}</style>
          <S />
          <rect width={640} height={360} fill="url(#scan)" opacity={0.25} />
          <defs>
            <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" /></pattern>
          </defs>
        </svg>
        <span className="mono absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-[var(--amber)]">MOCKUP · illustrated · authored</span>
        <span className="mono absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">{m.place.lat.toFixed(4)}°, {m.place.lon.toFixed(4)}° · {m.place.label}</span>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <p className="text-[13px]">&ldquo;{m.sentence}&rdquo;</p>
        <button className="hbtn !py-1.5" onClick={onLive} disabled={!live} title={live ? "Send this sentence to the real engine and compare" : "Needs the live model"}>Test on the live model ›</button>
      </footer>
    </section>
  );
}
