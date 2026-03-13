"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion";
import {
  ArrowRight,
  Brain,
  Code2,
  Cpu,
  Dices,
  ExternalLink,
  FileText,
  Github,
  Globe,
  LineChart,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

// ─── Animations ─────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// ─── Section Divider ────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="section-divider mx-auto max-w-5xl" />;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

function Navigation({ dark }: { dark?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        dark
          ? scrolled ? "border-b border-[#2d2d44] bg-[#0a0a0f]/90 backdrop-blur-xl" : "bg-transparent"
          : scrolled ? "border-b border-border bg-white/80 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-[72px]">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Yiling Protocol" width={32} height={32} className="rounded-lg" />
          <span className={`font-heading font-bold text-[16px] tracking-tight transition-colors duration-500 ${dark ? "text-white" : "text-text"}`}>Yiling Protocol</span>
        </div>

        <div className={`hidden md:flex items-center gap-8 text-[14px] font-medium transition-colors duration-500 ${dark ? "text-[#a3a3a3]" : "text-text-secondary"}`}>
          {["Protocol", "Infrastructure", "Build"].map((i) => (
            <a key={i} href={`#${i.toLowerCase()}`} className={`transition-colors duration-200 ${dark ? "hover:text-white" : "hover:text-text"}`}>
              {i}
            </a>
          ))}
          <a href="#networks" className={`transition-colors duration-200 ${dark ? "hover:text-white" : "hover:text-text"}`}>Networks</a>
          <a href="/docs/getting-started/overview" className={`transition-colors duration-200 ${dark ? "hover:text-white" : "hover:text-text"}`}>Docs</a>
        </div>

        <a
          href="#networks"
          className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-500 ${
            dark ? "bg-white text-[#0a0a0f] hover:bg-gray-200" : "bg-text text-white hover:bg-accent-light"
          }`}
        >
          Get Started <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-16">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8">
          <motion.h1 variants={fadeUp} className="font-heading font-extrabold text-[44px] sm:text-[56px] md:text-[72px] lg:text-[84px] tracking-[-0.03em] leading-[1]">
            <span className="text-text">The Self-Resolving</span>
            <br />
            <span className="text-text-secondary">Truth Layer</span>
          </motion.h1>

          <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 pt-2">
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8100D1]/10 border border-[#8100D1]/20 text-[#8100D1] text-[13px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#8100D1] animate-pulse" />
                Monad
              </span>
            </div>
            {/* Coming Soon Chains Marquee */}
            <div className="relative w-full max-w-md overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}>
              <div className="flex animate-[marquee_20s_linear_infinite] w-max gap-3">
                {[...Array(2)].map((_, setIdx) => (
                  <div key={setIdx} className="flex gap-3">
                    {["Arbitrum", "Optimism", "Polygon", "Avalanche", "BNB Chain", "Scroll", "zkSync", "Linea", "Blast"].map((chain) => (
                      <span key={`${setIdx}-${chain}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-text-muted text-[11px] font-medium whitespace-nowrap opacity-50">
                        {chain}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-center text-[10px] text-text-muted tracking-[0.15em] uppercase mt-1.5 font-medium">Coming Soon</p>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} className="max-w-lg mx-auto text-[17px] text-text-secondary leading-relaxed">
            Oracle-free truth discovery infrastructure powered by game theory.
            Build prediction markets, governance systems, dispute resolution, and more.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <a href="/docs/getting-started/overview"
              className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-text text-white text-[15px] font-semibold transition-all duration-200 hover:bg-accent-light hover:scale-[1.02]">
              Explore Protocol
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a href="#networks"
              className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-border text-text-secondary hover:text-text hover:border-border-light text-[15px] font-medium transition-all duration-200">
              View Live Deployments <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-12 pt-10">
            {[
              { value: "0", label: "Oracles Needed" },
              { value: "2", label: "Live Chains" },
              { value: "Game", label: "Theory" },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center">
                <span className="font-heading font-bold text-2xl sm:text-3xl tracking-tight text-text">{stat.value}</span>
                <p className="text-[11px] text-text-muted mt-1 tracking-[0.1em] uppercase font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Marquee Band ───────────────────────────────────────────────────────────

function MarqueeBand({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const content = items.join(" \u00B7 ") + " \u00B7 ";
  return (
    <div className="overflow-hidden border-y border-border">
      <div
        className="marquee-track whitespace-nowrap py-3 text-[12px] font-mono uppercase tracking-[0.2em] text-text-muted"
        style={{ animationDirection: reverse ? "reverse" : "normal" }}
      >
        <span>{content}</span>
        <span>{content}</span>
      </div>
    </div>
  );
}

// ─── Problem / Solution ─────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="relative py-28 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger}
          className="grid md:grid-cols-2 gap-6">
          {/* Problem */}
          <motion.div variants={fadeUp}
            className="card p-10 relative overflow-hidden">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-light text-[12px] font-semibold text-rose">
                <span className="w-1.5 h-1.5 rounded-full bg-rose" />
                The Problem
              </div>
              <h2 className="font-heading font-bold text-[26px] sm:text-[30px] leading-[1.15] tracking-tight">
                Oracles are the<br />single point of failure
              </h2>
              <p className="text-text-secondary text-[15px] leading-[1.75]">
                Every on-chain truth system today depends on an external oracle.
                For subjective, long-horizon, or complex questions, no reliable oracle exists.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {["Oracle", "Trust", "Centralization"].map((item) => (
                  <span key={item}
                    className="px-3 py-1.5 rounded-md bg-rose-light text-rose/70 text-[12px] font-medium line-through decoration-rose/40">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Solution */}
          <motion.div variants={fadeUp}
            className="card p-10 relative overflow-hidden">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-light text-[12px] font-semibold text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                The Solution
              </div>
              <h2 className="font-heading font-bold text-[26px] sm:text-[30px] leading-[1.15] tracking-tight">
                Truth resolves<br /><span className="text-text-secondary">itself</span>
              </h2>
              <p className="text-text-secondary text-[15px] leading-[1.75]">
                Yiling Protocol implements the <span className="text-text font-semibold">SKC mechanism</span> —
                truth emerges from mathematics.
                Honest reporting is a <span className="text-text font-semibold">Perfect Bayesian Equilibrium</span>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {["Game Theory", "Math", "Autonomous"].map((item) => (
                  <span key={item}
                    className="px-3 py-1.5 rounded-md bg-orange-light text-orange text-[12px] font-semibold">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── How It Works — Mechanical Schematic Diagram ─────────────────────────────

// Animated dot traveling along an SVG path
function FlowDot({ path, color, duration, delay }: { path: string; color: string; duration: number; delay: number }) {
  return (
    <circle r="3.5" fill={color}>
      <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" path={path} />
    </circle>
  );
}

// Schematic module box drawn in SVG
function SchematicBox({ x, y, w, h, label, sublabel, number, color, icon }: {
  x: number; y: number; w: number; h: number; label: string; sublabel?: string; number: string; color: string; icon?: string;
}) {
  return (
    <g>
      {/* Box body */}
      <rect x={x} y={y} width={w} height={h} rx="6" ry="6"
        fill="#0d1117" stroke={color} strokeWidth="1.5" opacity="0.95" />
      {/* Top accent line */}
      <line x1={x + 8} y1={y} x2={x + w - 8} y2={y} stroke={color} strokeWidth="2.5" opacity="0.7" />
      {/* Number badge */}
      <rect x={x + w - 28} y={y - 8} width="24" height="16" rx="4" fill={color} opacity="0.15" stroke={color} strokeWidth="0.5" />
      <text x={x + w - 16} y={y + 3} textAnchor="middle" fill={color} fontSize="8" fontFamily="var(--font-mono)" fontWeight="700">{number}</text>
      {/* Icon placeholder circle */}
      <circle cx={x + 20} cy={y + (sublabel ? 26 : h / 2)} r="11" fill={`${color}18`} stroke={`${color}40`} strokeWidth="1" />
      <text x={x + 20} y={y + (sublabel ? 30 : h / 2 + 4)} textAnchor="middle" fill={color} fontSize="10">{icon}</text>
      {/* Label */}
      <text x={x + 38} y={y + (sublabel ? 24 : h / 2 - 2)} fill="#e6edf3" fontSize="11" fontFamily="var(--font-heading)" fontWeight="700" letterSpacing="0.5">{label}</text>
      {sublabel && <text x={x + 38} y={y + 40} fill="#7d8590" fontSize="9" fontFamily="var(--font-body)">{sublabel}</text>}
      {/* Corner brackets — mechanical detail */}
      <path d={`M${x + 3},${y + h - 10} L${x + 3},${y + h - 3} L${x + 10},${y + h - 3}`} fill="none" stroke={`${color}40`} strokeWidth="1" />
      <path d={`M${x + w - 10},${y + h - 3} L${x + w - 3},${y + h - 3} L${x + w - 3},${y + h - 10}`} fill="none" stroke={`${color}40`} strokeWidth="1" />
    </g>
  );
}

// Pipe connector with flanges
function Pipe({ x1, y1, x2, y2, color, vertical }: { x1: number; y1: number; x2: number; y2: number; color: string; vertical?: boolean }) {
  if (vertical) {
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${color}50`} strokeWidth="2" />
        {/* Flanges */}
        <line x1={x1 - 5} y1={y1} x2={x1 + 5} y2={y1} stroke={`${color}60`} strokeWidth="1.5" />
        <line x1={x2 - 5} y1={y2} x2={x2 + 5} y2={y2} stroke={`${color}60`} strokeWidth="1.5" />
      </g>
    );
  }
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${color}50`} strokeWidth="2" />
      {/* Flanges */}
      <line x1={x1} y1={y1 - 5} x2={x1} y2={y1 + 5} stroke={`${color}60`} strokeWidth="1.5" />
      <line x1={x2} y1={y2 - 5} x2={x2} y2={y2 + 5} stroke={`${color}60`} strokeWidth="1.5" />
      {/* Arrow */}
      <polygon points={`${x2 - 6},${y2 - 4} ${x2},${y2} ${x2 - 6},${y2 + 4}`} fill={`${color}70`} />
    </g>
  );
}

function SchematicDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });

  // Colors
  const blue = "#58a6ff";
  const orange = "#ea580c";
  const purple = "#a371f7";
  const green = "#3fb950";

  // Layout: SVG viewBox 1100 x 520
  // Row 1 (y=40):  Inputs(col) → pipe → Factory → pipe → Engine → pipe → RandomStop
  // Row 2 (y=310): Payouts ← pipe ← Truth ← pipe ← SKC ← pipe ← FixedPointMath
  // Vertical pipe connecting RandomStop → FixedPointMath

  return (
    <div ref={ref} className="hidden lg:block">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="relative rounded-2xl overflow-hidden" style={{
          background: "linear-gradient(145deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
          border: "1px solid #30363d",
        }}>
          {/* Blueprint grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(rgba(88,166,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          <svg viewBox="0 0 1100 520" className="w-full relative z-10" style={{ minHeight: 420 }}>
            {/* ═══ ROW 1: Top — Left to Right ═══ */}

            {/* Input stack */}
            <SchematicBox x={30} y={40} w={140} h={50} label="dApp / Protocol" number="01" color={blue} icon="&#9673;" />
            <SchematicBox x={30} y={105} w={140} h={50} label="AI Agent" number="02" color={purple} icon="&#9672;" />
            <SchematicBox x={30} y={170} w={140} h={50} label="User" number="03" color={orange} icon="&#9679;" />

            {/* Bracket/manifold connecting 3 inputs into 1 pipe */}
            <path d="M170,65 L200,65 L200,195 L170,195" fill="none" stroke={`${blue}50`} strokeWidth="1.5" />
            <path d="M170,130 L200,130" fill="none" stroke={`${purple}50`} strokeWidth="1.5" />
            <line x1={200} y1={130} x2={220} y2={130} stroke={`${orange}70`} strokeWidth="2" />
            {/* Flange */}
            <line x1={200} y1={60} x2={200} y2={200} stroke="#30363d" strokeWidth="3" />
            <rect x={196} y={55} width={8} height={150} rx={2} fill="none" stroke="#30363d" strokeWidth="1" />

            {/* Pipe: inputs → Factory */}
            <Pipe x1={220} y1={130} x2={310} y2={130} color={orange} />

            {/* Query Factory */}
            <SchematicBox x={320} y={90} w={175} h={80} label="QUERY FACTORY" sublabel="Deploys & configures instances" number="04" color={blue} icon="&#9881;" />

            {/* Pipe: Factory → Truth Engine */}
            <Pipe x1={495} y1={130} x2={565} y2={130} color={purple} />

            {/* Report Engine — larger, main component */}
            <SchematicBox x={575} y={80} w={190} h={100} label="REPORT ENGINE" sublabel="Collects reports backed by bonds" number="05" color={purple} icon="&#9670;" />
            {/* Internal detail lines */}
            <line x1={590} y1={145} x2={750} y2={145} stroke={`${purple}20`} strokeWidth="0.5" strokeDasharray="4 3" />
            <line x1={590} y1={160} x2={750} y2={160} stroke={`${purple}15`} strokeWidth="0.5" strokeDasharray="4 3" />

            {/* Pipe: Truth Engine → Random Stop */}
            <Pipe x1={765} y1={130} x2={840} y2={130} color={orange} />

            {/* Random Stop */}
            <SchematicBox x={850} y={85} w={195} h={90} label="RANDOM STOP" sublabel="Dice roll triggers resolution" number="06" color={orange} icon="&#9858;" />
            {/* Dice detail */}
            <rect x={870} y={145} width={18} height={18} rx={3} fill="none" stroke={`${orange}35`} strokeWidth="1" />
            <circle cx={879} cy={154} r="2" fill={`${orange}50`} />

            {/* ═══ VERTICAL: Random Stop → FixedPointMath ═══ */}
            <Pipe x1={948} y1={175} x2={948} y2={310} color={green} vertical />
            {/* Elbow detail */}
            <rect x={940} y={235} width={16} height={16} rx={2} fill="none" stroke="#30363d" strokeWidth="1.5" />
            <circle cx={948} cy={243} r="3" fill={`${green}40`} stroke={`${green}60`} strokeWidth="1" />

            {/* ═══ ROW 2: Bottom — Right to Left ═══ */}

            {/* FixedPointMath */}
            <SchematicBox x={850} y={310} w={195} h={75} label="FIXED POINT MATH" sublabel="Precision math for scoring" number="07" color={green} icon="&#8721;" />

            {/* Pipe: FixedPointMath → SKC */}
            <line x1={850} y1={348} x2={780} y2={348} stroke={`${green}50`} strokeWidth="2" />
            <line x1={850} y1={343} x2={850} y2={353} stroke={`${green}60`} strokeWidth="1.5" />
            <line x1={780} y1={343} x2={780} y2={353} stroke={`${green}60`} strokeWidth="1.5" />
            <polygon points="786,344 780,348 786,352" fill={`${green}70`} />

            {/* SKC Engine — highlighted core */}
            <g>
            <rect x={565} y={303} width={205} height={90} rx="8" ry="8"
              fill="#0d1117" stroke={purple} strokeWidth="2" />
            <line x1={575} y1={303} x2={760} y2={303} stroke={purple} strokeWidth="3" opacity="0.6" />
            {/* Inner grid pattern */}
            <line x1={580} y1={325} x2={755} y2={325} stroke={`${purple}12`} strokeWidth="0.5" />
            <line x1={580} y1={340} x2={755} y2={340} stroke={`${purple}12`} strokeWidth="0.5" />
            <line x1={580} y1={355} x2={755} y2={355} stroke={`${purple}12`} strokeWidth="0.5" />
            <line x1={580} y1={370} x2={755} y2={370} stroke={`${purple}12`} strokeWidth="0.5" />
            <line x1={620} y1={310} x2={620} y2={390} stroke={`${purple}08`} strokeWidth="0.5" />
            <line x1={680} y1={310} x2={680} y2={390} stroke={`${purple}08`} strokeWidth="0.5" />
            <line x1={720} y1={310} x2={720} y2={390} stroke={`${purple}08`} strokeWidth="0.5" />
            {/* Number */}
            <rect x={742} y={295} width={24} height="16" rx="4" fill={`${purple}15`} stroke={`${purple}`} strokeWidth="0.5" />
            <text x={754} y={306} textAnchor="middle" fill={purple} fontSize="8" fontFamily="var(--font-mono)" fontWeight="700">08</text>
            {/* Icon & label */}
            <circle cx={587} cy={340} r="13" fill={`${purple}15`} stroke={`${purple}40`} strokeWidth="1" />
            <text x={587} y={344} textAnchor="middle" fill={purple} fontSize="12">&#9881;</text>
            <text x={610} y={337} fill="#e6edf3" fontSize="12" fontFamily="var(--font-heading)" fontWeight="700" letterSpacing="0.5">SKC ENGINE</text>
            <text x={610} y={355} fill="#7d8590" fontSize="9" fontFamily="var(--font-body)">Cross-entropy scoring</text>
            <text x={610} y={370} fill="#7d8590" fontSize="9" fontFamily="var(--font-body)">Honest reporting = dominant strategy</text>
            {/* Corner brackets */}
            <path d="M568,383 L568,390 L575,390" fill="none" stroke={`${purple}40`} strokeWidth="1" />
            <path d="M760,390 L767,390 L767,383" fill="none" stroke={`${purple}40`} strokeWidth="1" />
            {/* Scan line */}
            {isInView && (
              <line x1={570} x2={765} y1={310} y2={310} stroke={`${purple}30`} strokeWidth="1">
                <animate attributeName="y1" values="310;390;310" dur="3s" repeatCount="indefinite" />
                <animate attributeName="y2" values="310;390;310" dur="3s" repeatCount="indefinite" />
              </line>
            )}

            </g>

            {/* Pipe: SKC → Truth */}
            <line x1={565} y1={348} x2={490} y2={348} stroke={`${purple}50`} strokeWidth="2" />
            <line x1={565} y1={343} x2={565} y2={353} stroke={`${purple}60`} strokeWidth="1.5" />
            <line x1={490} y1={343} x2={490} y2={353} stroke={`${purple}60`} strokeWidth="1.5" />
            <polygon points="496,344 490,348 496,352" fill={`${purple}70`} />

            {/* Truth Consensus */}
            <SchematicBox x={290} y={310} w={190} h={75} label="TRUTH CONSENSUS" sublabel="Game theory determines truth" number="09" color={blue} icon="&#9673;" />

            {/* Pipe: Truth → Payouts */}
            <line x1={290} y1={348} x2={220} y2={348} stroke={`${blue}50`} strokeWidth="2" />
            <line x1={290} y1={343} x2={290} y2={353} stroke={`${blue}60`} strokeWidth="1.5" />
            <line x1={220} y1={343} x2={220} y2={353} stroke={`${blue}60`} strokeWidth="1.5" />
            <polygon points="226,344 220,348 226,352" fill={`${blue}70`} />

            {/* Payouts */}
            <SchematicBox x={30} y={310} w={180} h={75} label="SETTLEMENT" sublabel="Rewards for accurate reporters" number="10" color={green} icon="&#9650;" />

            {/* ═══ ANIMATED FLOW DOTS ═══ */}
            {isInView && (
              <>
                {/* Input → Factory */}
                <FlowDot path="M220,130 L310,130" color={orange} duration={1.5} delay={0} />
                {/* Factory → Engine */}
                <FlowDot path="M495,130 L565,130" color={purple} duration={1.2} delay={0.5} />
                {/* Engine → Stop */}
                <FlowDot path="M765,130 L840,130" color={orange} duration={1.2} delay={1} />
                {/* Vertical drop */}
                <FlowDot path="M948,175 L948,310" color={green} duration={2} delay={1.5} />
                {/* FixedPoint → SKC */}
                <FlowDot path="M850,348 L780,348" color={green} duration={1.2} delay={2.5} />
                {/* SKC → Truth */}
                <FlowDot path="M565,348 L490,348" color={purple} duration={1.2} delay={3} />
                {/* Truth → Payouts */}
                <FlowDot path="M290,348 L220,348" color={blue} duration={1.2} delay={3.5} />
              </>
            )}

            {/* ═══ LABELS & DETAILS ═══ */}
            {/* Top-left label */}
            <text x={32} y={28} fill="#30363d" fontSize="9" fontFamily="var(--font-mono)" fontWeight="500">YILING PROTOCOL — SYSTEM ARCHITECTURE</text>
            {/* Bottom flow indicator */}
            <text x={550} y={470} textAnchor="middle" fill="#30363d" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="2">
              INPUTS → FACTORY → ENGINE → STOP → MATH → SKC → TRUTH → SETTLEMENT
            </text>

            {/* Row labels */}
            <text x={15} y={235} fill="#30363d" fontSize="8" fontFamily="var(--font-mono)" transform="rotate(-90, 15, 235)" letterSpacing="1.5">EXECUTION</text>
            <text x={15} y={450} fill="#30363d" fontSize="8" fontFamily="var(--font-mono)" transform="rotate(-90, 15, 450)" letterSpacing="1.5">RESOLUTION</text>

            {/* Decorative bolt/rivets */}
            {[{x:8,y:8},{x:1092,y:8},{x:8,y:488},{x:1092,y:488}].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#161b22" stroke="#30363d" strokeWidth="1" />
                <line x1={p.x - 2} y1={p.y} x2={p.x + 2} y2={p.y} stroke="#30363d" strokeWidth="0.8" />
              </g>
            ))}

            {/* Decorative hatch marks along bottom */}
            {Array.from({ length: 22 }, (_, i) => (
              <line key={i} x1={50 + i * 48} y1={495} x2={55 + i * 48} y2={490} stroke="#21262d" strokeWidth="0.8" />
            ))}
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

function HowItWorks({ onDarkChange }: { onDarkChange?: (dark: boolean) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInViewHIW = useInView(sectionRef, { margin: "-40% 0px -40% 0px" });

  useEffect(() => {
    onDarkChange?.(isInViewHIW);
  }, [isInViewHIW, onDarkChange]);

  return (
    <>
      {/* Full-screen dark overlay */}
      <motion.div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: "#0a0a0f" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isInViewHIW ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      <section ref={sectionRef} id="protocol" className="relative py-28 px-6" style={{ position: "relative", zIndex: 41 }}>
        <div className="relative mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="space-y-16">
            <motion.div variants={fadeUp} className="text-center space-y-4">
              <p className="text-[12px] font-semibold tracking-[0.2em] uppercase" style={{ color: isInViewHIW ? "#a3a3a3" : undefined }}><motion.span animate={{ color: isInViewHIW ? "#737373" : "#a3a3a3" }} transition={{ duration: 0.6 }}>Protocol</motion.span></p>
              <h2 className="font-heading font-bold text-[30px] sm:text-[38px] md:text-[44px] tracking-tight"><motion.span animate={{ color: isInViewHIW ? "#f5f5f5" : "#171717" }} transition={{ duration: 0.6 }}>How It Works</motion.span></h2>
              <p className="text-[16px] max-w-md mx-auto"><motion.span animate={{ color: isInViewHIW ? "#a3a3a3" : "#525252" }} transition={{ duration: 0.6 }}>An open and modular system — fully on-chain, fully autonomous</motion.span></p>
            </motion.div>

            {/* Mechanical schematic diagram — desktop */}
            <SchematicDiagram />

            {/* Mobile: stacked cards */}
            <div className="grid sm:grid-cols-2 lg:hidden gap-4">
              {[
                { icon: Users, number: "01", title: "Submit a Query", description: "Any participant deploys a query to the protocol — subjective, objective, or philosophical.", color: "#2563eb" },
                { icon: Brain, number: "02", title: "Agents Report", description: "AI agents analyze the query and submit probability reports backed by bonds.", color: "#7c3aed" },
                { icon: Dices, number: "03", title: "Random Stop", description: "After each report, a dice rolls. If triggered, the protocol finalizes.", color: "#171717" },
                { icon: TrendingUp, number: "04", title: "Truth & Settlement", description: "Cross-entropy scoring rewards accuracy. Truth emerges from game theory.", color: "#16a34a" },
              ].map((step) => (
                <motion.div key={step.number} variants={fadeUp} className="rounded-2xl p-6 border transition-all duration-600"
                  animate={{
                    background: isInViewHIW ? "#141420" : "#ffffff",
                    borderColor: isInViewHIW ? "#2d2d44" : "#e5e5e5",
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${step.color}10`, border: `1px solid ${step.color}20` }}>
                      <step.icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    <span className="font-mono text-[12px] font-bold" style={{ color: isInViewHIW ? "#737373" : "#a3a3a3" }}>{step.number}</span>
                  </div>
                  <h3 className="font-heading font-bold text-[16px] mb-2"><motion.span animate={{ color: isInViewHIW ? "#f5f5f5" : "#171717" }} transition={{ duration: 0.6 }}>{step.title}</motion.span></h3>
                  <p className="text-[14px] leading-[1.7]"><motion.span animate={{ color: isInViewHIW ? "#a3a3a3" : "#a3a3a3" }} transition={{ duration: 0.6 }}>{step.description}</motion.span></p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

// ─── Mechanism ───────────────────────────────────────────────────────────────

const chartPoints = [
  0.50, 0.50, 0.53, 0.56, 0.54, 0.59, 0.62, 0.60, 0.64, 0.61,
  0.65, 0.68, 0.66, 0.70, 0.71, 0.69, 0.72, 0.71, 0.73, 0.72,
  0.72, 0.71, 0.72, 0.72,
];

function PriceChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const inView = useInView(chartRef, { once: false, margin: "-100px" });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) { setProgress(0); return; }
    let p = 0;
    const interval = setInterval(() => {
      p += 0.02;
      if (p >= 1) { setProgress(1); clearInterval(interval); } else setProgress(p);
    }, 40);
    return () => clearInterval(interval);
  }, [inView]);

  const w = 340, h = 210, padX = 40, padY = 20;
  const chartW = w - padX - 10, chartH = h - padY * 2;
  const visibleCount = Math.floor(progress * chartPoints.length);
  const getX = (i: number) => padX + (i / (chartPoints.length - 1)) * chartW;
  const getY = (v: number) => padY + (1 - (v - 0.4) / 0.45) * chartH;

  let linePath = "", areaPath = "";
  for (let i = 0; i <= visibleCount && i < chartPoints.length; i++) {
    const x = getX(i), y = getY(chartPoints[i]);
    if (i === 0) { linePath = `M${x},${y}`; areaPath = `M${x},${getY(0.4)}L${x},${y}`; }
    else { linePath += `L${x},${y}`; areaPath += `L${x},${y}`; }
  }
  if (visibleCount > 0) areaPath += `L${getX(Math.min(visibleCount, chartPoints.length - 1))},${getY(0.4)}Z`;

  const currentVal = visibleCount > 0 ? chartPoints[Math.min(visibleCount, chartPoints.length - 1)] : 0.5;
  const currentX = getX(Math.min(visibleCount, chartPoints.length - 1));
  const currentY = getY(currentVal);

  return (
    <div ref={chartRef} className="card p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="text-text-muted text-[11px] uppercase tracking-[0.15em] font-semibold">Truth Convergence</div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
          <span className="font-mono text-[14px] text-text font-bold">{currentVal.toFixed(2)}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 220 }}>
        {[0.40, 0.50, 0.60, 0.70, 0.80].map((v) => (
          <g key={v}>
            <line x1={padX} y1={getY(v)} x2={w - 10} y2={getY(v)} stroke="#e5e5e5" strokeWidth="0.5" strokeDasharray="4 4" />
            <text x={padX - 6} y={getY(v) + 3} textAnchor="end" fill="#a3a3a3" fontSize="9" fontFamily="var(--font-mono)">{v.toFixed(1)}</text>
          </g>
        ))}
        <line x1={padX} y1={getY(0.72)} x2={w - 10} y2={getY(0.72)} stroke="#16a34a" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
        <text x={w - 8} y={getY(0.72) - 6} textAnchor="end" fill="#16a34a" fontSize="8" fontFamily="var(--font-mono)">truth</text>
        {visibleCount > 0 && <path d={areaPath} fill="url(#chart-area-grad)" />}
        {visibleCount > 0 && <path d={linePath} fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {visibleCount > 0 && (
          <>
            <circle cx={currentX} cy={currentY} r="4" fill="#171717" stroke="#ffffff" strokeWidth="2" />
          </>
        )}
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#171717" stopOpacity="0.08" /><stop offset="100%" stopColor="#171717" stopOpacity="0.01" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        {["Agent 1", "Agent 2", "Agent 3", "Agent N"].map((name, i) => {
          const show = progress > (i + 1) * 0.2;
          return (
            <motion.div key={name} initial={{ opacity: 0, y: 8 }} animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-text" />
              <span className="font-mono text-[10px] text-text-muted">{name}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Mechanism() {
  return (
    <section className="relative py-28 px-6">
      <div className="relative mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger}
          className="grid lg:grid-cols-2 gap-14 items-center">
          <motion.div variants={fadeUp} className="space-y-8">
            <div className="space-y-4">
              <p className="text-text-muted text-[12px] font-semibold tracking-[0.2em] uppercase">Mechanism</p>
              <h2 className="font-heading font-bold text-[30px] sm:text-[38px] tracking-tight leading-[1.15]">The SKC Mechanism</h2>
              <p className="text-text-secondary text-[16px] leading-[1.75]">
                Based on game-theoretic research from Harvard. Cross-entropy scoring ensures honest reporting is the dominant strategy.
              </p>
            </div>

            <div className="code-block p-7 space-y-4 relative overflow-hidden">
              <div className="text-[#60a5fa] text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Cross-Entropy Scoring
              </div>
              <div className="text-[#e4e4f0] font-medium text-[15px]">
                payoff<span className="text-[#6b7194]">i</span> = bond + <span className="text-[#60a5fa]">b</span> &times; [S(q<span className="text-[#6b7194]">final</span>, p<span className="text-[#6b7194]">after</span>) - S(q<span className="text-[#6b7194]">final</span>, p<span className="text-[#6b7194]">before</span>)]
              </div>
              <div className="border-t border-[#2d2d44] pt-4 mt-4 space-y-1.5 text-[13px]">
                <p className="text-[#6b7194]">S(q, p) = q &middot; ln(p) + (1-q) &middot; ln(1-p)</p>
                <p className="text-emerald-400">Move toward truth &rarr; reward</p>
                <p className="text-rose-400">Move away from truth &rarr; penalty</p>
              </div>
            </div>

            <a href="https://arxiv.org/abs/2306.04305" target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-4 p-5 card group hover:border-border-light transition-all duration-200">
              <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0 group-hover:bg-bg-2 transition-colors">
                <FileText className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text">Self-Resolving Prediction Markets</p>
                <p className="text-[13px] text-text-muted mt-0.5">Srinivasan, Karger, Chen — Harvard, 2023</p>
                <span className="inline-flex items-center gap-1 text-[13px] text-text-secondary mt-2 font-semibold">
                  Read on arXiv <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>
          </motion.div>

          <motion.div variants={fadeUp}>
            <PriceChart />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Infrastructure ──────────────────────────────────────────────────────────

const infraFeatures = [
  { icon: Brain, title: "Open Agent Framework", desc: "Plug in any agent — AI, human, or algorithmic. Define your own reasoning strategy with our SDK." },
  { icon: Globe, title: "Chain Agnostic", desc: "Not limited to any VM or chain. Deploy on any network — EVM, SVM, Move, or beyond. Natively built on Monad." },
  { icon: Zap, title: "Self-Resolving", desc: "No oracle dependency. Truth emerges from game theory via the SKC mechanism." },
  { icon: Code2, title: "Modular Smart Contracts", desc: "MarketFactory, PredictionMarket, and FixedPointMath — composable and auditable." },
  { icon: Users, title: "Permissionless", desc: "Anyone can deploy questions, build agents, or integrate the protocol. No gatekeepers." },
  { icon: LineChart, title: "Cross-Entropy Scoring", desc: "Mathematically proven incentive layer. Honest reporting is always the dominant strategy." },
];

function Infrastructure() {
  return (
    <section id="infrastructure" className="relative py-28 px-6">
      <div className="relative mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger}
          className="space-y-16">
          <motion.div variants={fadeUp} className="text-center space-y-4">
            <p className="text-orange text-[12px] font-semibold tracking-[0.2em] uppercase">Infrastructure</p>
            <h2 className="font-heading font-bold text-[30px] sm:text-[38px] md:text-[44px] tracking-tight">Protocol Infrastructure</h2>
            <p className="text-text-secondary text-[16px] max-w-lg mx-auto">The building blocks that make Yiling Protocol modular, open, and unstoppable</p>
          </motion.div>

          <div className="hidden lg:flex gap-5 pb-28">
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex-1 flex flex-col gap-5" style={{ transform: col === 1 ? "translateY(48px)" : undefined }}>
                {infraFeatures.filter((_, i) => i % 3 === col).map((feature) => (
                  <motion.div key={feature.title} variants={fadeUp}
                    className="relative rounded-2xl border border-dashed border-orange/30 p-6 flex flex-col justify-between min-h-[260px] overflow-hidden group transition-all duration-300 hover:border-orange/50">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orange/10 rounded-2xl pointer-events-none" />
                    <div className="relative z-10">
                      <feature.icon className="w-5 h-5 text-orange/70 mb-4" />
                      <h3 className="font-heading font-bold text-[22px] leading-tight text-text">{feature.title}</h3>
                    </div>
                    <p className="relative z-10 text-text-muted text-[14px] leading-[1.8] mt-auto">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
          {/* mobile fallback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:hidden">
            {infraFeatures.map((feature) => (
              <motion.div key={feature.title} variants={fadeUp}
                className="relative rounded-2xl border border-dashed border-orange/30 p-6 flex flex-col justify-between min-h-[220px] overflow-hidden group transition-all duration-300 hover:border-orange/50">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orange/10 rounded-2xl pointer-events-none" />
                <div className="relative z-10">
                  <feature.icon className="w-5 h-5 text-orange/70 mb-4" />
                  <h3 className="font-heading font-bold text-[20px] leading-tight text-text">{feature.title}</h3>
                </div>
                <p className="relative z-10 text-text-muted text-[14px] leading-[1.8] mt-auto">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Code Typewriter ─────────────────────────────────────────────────────────

interface CodeToken { text: string; color: string }
type CodeLine = CodeToken[];

const codeLines: CodeLine[] = [
  [{ text: "from", color: "#c084fc" }, { text: " web3 ", color: "#e4e4f0" }, { text: "import", color: "#c084fc" }, { text: " Web3", color: "#e4e4f0" }],
  [{ text: "from", color: "#c084fc" }, { text: " openai ", color: "#e4e4f0" }, { text: "import", color: "#c084fc" }, { text: " OpenAI", color: "#e4e4f0" }],
  [],
  [{ text: "# Connect to any chain", color: "#4a4a6a" }],
  [{ text: "w3 ", color: "#e4e4f0" }, { text: "= ", color: "#60a5fa" }, { text: "Web3", color: "#e4e4f0" }, { text: "(", color: "#60a5fa" }, { text: "Web3", color: "#e4e4f0" }, { text: ".", color: "#60a5fa" }, { text: "HTTPProvider", color: "#60a5fa" }, { text: "(", color: "#60a5fa" }],
  [{ text: '  RPC_URL', color: "#86efac" }],
  [{ text: "))", color: "#60a5fa" }],
  [],
  [{ text: "# Submit prediction", color: "#4a4a6a" }],
  [{ text: "contract", color: "#e4e4f0" }, { text: ".", color: "#60a5fa" }, { text: "functions", color: "#e4e4f0" }, { text: ".", color: "#60a5fa" }, { text: "predict", color: "#60a5fa" }, { text: "(", color: "#60a5fa" }],
  [{ text: "  market_id", color: "#e4e4f0" }, { text: "=", color: "#60a5fa" }, { text: "42", color: "#fb923c" }, { text: ",", color: "#60a5fa" }],
  [{ text: "  probability", color: "#e4e4f0" }, { text: "=", color: "#60a5fa" }, { text: "0.73e18", color: "#fb923c" }],
  [{ text: ")", color: "#60a5fa" }],
];

function CodeTypewriter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const [visibleChars, setVisibleChars] = useState(0);

  const totalChars = codeLines.reduce((sum, line) => {
    if (line.length === 0) return sum + 1;
    return sum + line.reduce((s, tok) => s + tok.text.length, 0);
  }, 0);

  useEffect(() => {
    if (!inView) { setVisibleChars(0); return; }
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= totalChars) { setVisibleChars(totalChars); clearInterval(interval); }
      else setVisibleChars(current);
    }, 25);
    return () => clearInterval(interval);
  }, [inView, totalChars]);

  const cursor = (
    <span className="inline-block w-[2px] h-[14px] bg-[#60a5fa] align-middle"
      style={{ animation: "cursor-blink 0.8s step-end infinite", marginLeft: 1 }} />
  );

  const stillTyping = visibleChars < totalChars;
  let charIndex = 0;
  let cursorPlaced = false;
  const renderedLines = codeLines.map((line, lineIdx) => {
    if (line.length === 0) {
      const show = charIndex < visibleChars;
      const placeCursorHere = !cursorPlaced && show && charIndex + 1 >= visibleChars && stillTyping;
      charIndex += 1;
      if (placeCursorHere) { cursorPlaced = true; return <div key={lineIdx}>{cursor}</div>; }
      return show ? <br key={lineIdx} /> : null;
    }
    const tokens = line.map((token, tokIdx) => {
      const chars = token.text.split("").map((ch, chIdx) => {
        const show = charIndex < visibleChars;
        const isLastVisible = !cursorPlaced && show && charIndex + 1 >= visibleChars && stillTyping;
        charIndex += 1;
        if (!show) return null;
        if (isLastVisible) { cursorPlaced = true; return <span key={chIdx}>{ch}{cursor}</span>; }
        return <span key={chIdx}>{ch}</span>;
      });
      return <span key={tokIdx} style={{ color: token.color }}>{chars}</span>;
    });
    if (!tokens.some(t => t)) return null;
    return <div key={lineIdx}>{tokens}</div>;
  });

  if (!cursorPlaced && inView && stillTyping) renderedLines.unshift(<span key="cursor-start">{cursor}</span>);

  return (
    <div ref={ref} className="code-block overflow-hidden h-full">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2d2d44]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/60" />
        </div>
        <span className="text-[#6b7194] text-[12px] ml-2 font-medium">my_agent.py</span>
      </div>
      <div className="p-6 text-[13px] leading-[1.9] font-mono">{renderedLines}</div>
    </div>
  );
}

// ─── Builders ────────────────────────────────────────────────────────────────

const builderCards = [
  { icon: Globe, title: "Live Deployments", desc: "The full contract suite is deployed and running on Monad. Explore or build on top.", link: "View Networks", href: "#networks" },
  { icon: Brain, title: "Connect an Agent", desc: "Build AI agents that participate in the protocol. Use any LLM, any language, any strategy.", link: "Learn More", href: "/docs/getting-started/how-it-works" },
  { icon: Cpu, title: "Smart Contracts", desc: "Fully on-chain SKC mechanism. Deploy questions, submit predictions, and claim payouts directly.", link: "View Docs", href: "/docs/contracts/overview" },
];

function Builders() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  const terminalOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  const terminalX = useTransform(scrollYProgress, [0, 0.15], [-40, 0]);
  const cardAnims = [
    { opacity: useTransform(scrollYProgress, [0.25, 0.4], [0, 1]), y: useTransform(scrollYProgress, [0.25, 0.4], [40, 0]) },
    { opacity: useTransform(scrollYProgress, [0.45, 0.6], [0, 1]), y: useTransform(scrollYProgress, [0.45, 0.6], [40, 0]) },
    { opacity: useTransform(scrollYProgress, [0.65, 0.8], [0, 1]), y: useTransform(scrollYProgress, [0.65, 0.8], [40, 0]) },
  ];

  return (
    <div ref={sectionRef} className="relative" style={{ height: "300vh" }}>
      <section id="build" className="sticky top-0 min-h-screen flex items-center px-6">
        <div className="relative mx-auto max-w-5xl w-full py-20">
          <div className="text-center space-y-4 mb-16">
            <p className="text-orange text-[12px] font-semibold tracking-[0.2em] uppercase">Developers</p>
            <h2 className="font-heading font-bold text-[30px] sm:text-[38px] md:text-[44px] tracking-tight">Built for Builders</h2>
            <p className="text-text-secondary text-[16px] max-w-md mx-auto">Integrate the protocol, connect agents, or deploy on your own chain</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div style={{ opacity: terminalOpacity, x: terminalX }}>
              <CodeTypewriter />
            </motion.div>

            <div className="space-y-4">
              {builderCards.map((p, i) => (
                <motion.a key={p.title} href={p.href}
                  target={p.href.startsWith("http") ? "_blank" : undefined}
                  rel={p.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{ opacity: cardAnims[i].opacity, y: cardAnims[i].y }}
                  className="group card p-6 hover:border-border-light transition-all duration-200 block">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-surface-2 border border-border group-hover:border-border-light transition-colors">
                      <p.icon className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-[15px] text-text">{p.title}</h3>
                      <p className="text-text-muted text-[14px] mt-1 leading-[1.7] group-hover:text-text-secondary transition-colors">{p.desc}</p>
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold mt-2 text-text-secondary group-hover:text-text transition-colors">
                        {p.link} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Chains ──────────────────────────────────────────────────────────────────

const chainLogos: Record<string, { color: string; icon: React.ReactNode }> = {
  Ethereum: { color: "#627EEA", icon: <path d="M12 1.5l-7 11.5L12 17l7-4L12 1.5zm-7 13L12 22.5l7-8L12 18.5 5 14.5z" fill="#627EEA"/> },
  Arbitrum: { color: "#28A0F0", icon: <><path d="M12 2L2 19h20L12 2z" fill="none" stroke="#28A0F0" strokeWidth="1.5"/><path d="M12 7l5 9H7l5-9z" fill="#28A0F0"/></> },
  Solana: { color: "#9945FF", icon: <><path d="M4 17h14l2-2H6l-2 2zm0-5h14l2-2H6l-2 2zm16-3H6l-2-2h14l2 2z" fill="#9945FF"/></> },
  Polygon: { color: "#8247E5", icon: <path d="M16 8l-4-2.5L8 8l-4-2.5v9L8 17l4-2.5L16 17l4-2.5v-9L16 8zm-4 6.5L8 12V9l4 2.5 4-2.5v3l-4 2.5z" fill="#8247E5"/> },
  Sui: { color: "#4DA2FF", icon: <><circle cx="12" cy="12" r="10" fill="#4DA2FF"/><path d="M12 6c-3 0-5 2.5-5 5.5S9 18 12 18s5-3 5-6.5S15 6 12 6zm0 2c1.5 0 3 1.5 3 3.5S14 15 12 16c-2-1-3-2.5-3-4.5S10.5 8 12 8z" fill="#fff"/></> },
  Optimism: { color: "#FF0420", icon: <><circle cx="12" cy="12" r="10" fill="#FF0420"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">OP</text></> },
  Avalanche: { color: "#E84142", icon: <><circle cx="12" cy="12" r="10" fill="#E84142"/><path d="M8 16h2l2-5 2 5h2l-4-9-4 9z" fill="#fff"/></> },
  Monad: { color: "#836EF9", icon: <><circle cx="12" cy="12" r="10" fill="#836EF9"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">M</text></> },
  Starknet: { color: "#29296E", icon: <><path d="M12 2l10 7v6l-10 7L2 15V9l10-7z" fill="none" stroke="#29296E" strokeWidth="1.5"/><path d="M12 6l5 3.5v5L12 18l-5-3.5v-5L12 6z" fill="#29296E"/></> },
  zkSync: { color: "#4E529A", icon: <><circle cx="12" cy="12" r="10" fill="#4E529A"/><path d="M7 12l5-4v3h5l-5 4v-3H7z" fill="#fff"/></> },
  Near: { color: "#00C08B", icon: <><circle cx="12" cy="12" r="10" fill="#00C08B"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">N</text></> },
  Cosmos: { color: "#2E3148", icon: <><circle cx="12" cy="12" r="10" fill="none" stroke="#2E3148" strokeWidth="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#2E3148" strokeWidth="1" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#2E3148" strokeWidth="1" transform="rotate(-60 12 12)"/><circle cx="12" cy="12" r="2" fill="#2E3148"/></> },
  Fantom: { color: "#1969FF", icon: <><circle cx="12" cy="12" r="10" fill="#1969FF"/><path d="M12 4l5 4v8l-5 4-5-4V8l5-4zm0 3L9 9.5v5L12 17l3-2.5v-5L12 7z" fill="#fff"/></> },
  Celo: { color: "#35D07F", icon: <><circle cx="12" cy="12" r="10" fill="none" stroke="#35D07F" strokeWidth="2"/><circle cx="8" cy="12" r="4" fill="none" stroke="#FBCC5C" strokeWidth="1.5"/><circle cx="16" cy="12" r="4" fill="none" stroke="#35D07F" strokeWidth="1.5"/></> },
  Tron: { color: "#FF0013", icon: <><path d="M4 4l16 0-8 18L4 4z" fill="none" stroke="#FF0013" strokeWidth="1.5"/><path d="M4 4l10 5-2 8" fill="none" stroke="#FF0013" strokeWidth="1"/></> },
  Hedera: { color: "#000000", icon: <><rect x="2" y="2" width="20" height="20" rx="4" fill="#000"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">ℏ</text></> },
  "BNB Chain": { color: "#F0B90B", icon: <><path d="M12 2l3 3-3 3-3-3 3-3zm-6 6l3 3-3 3-3-3 3-3zm12 0l3 3-3 3-3-3 3-3zm-6 6l3 3-3 3-3-3 3-3z" fill="#F0B90B"/></> },
  Aptos: { color: "#000000", icon: <><circle cx="12" cy="12" r="10" fill="#000"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">A</text></> },
  Sei: { color: "#9B1C2E", icon: <><circle cx="12" cy="12" r="10" fill="#9B1C2E"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">S</text></> },
  Scroll: { color: "#EDCCA2", icon: <><circle cx="12" cy="12" r="10" fill="#EDCCA2"/><path d="M8 8h8v2H10v4h6v2H8V8z" fill="#684A2E"/></> },
  Linea: { color: "#121212", icon: <><circle cx="12" cy="12" r="10" fill="#121212"/><path d="M7 16V8h2v6h5v2H7z" fill="#fff"/></> },
  Mantle: { color: "#000000", icon: <><circle cx="12" cy="12" r="10" fill="#000"/><path d="M7 9h4v6H7V9zm6 0h4v6h-4V9z" fill="#fff" rx="1"/></> },
  Blast: { color: "#FCFC03", icon: <><circle cx="12" cy="12" r="10" fill="#FCFC03"/><path d="M8 7h8l-2 4h3l-7 8 2-5H8l2-7z" fill="#000"/></> },
  Gnosis: { color: "#04795B", icon: <><circle cx="12" cy="12" r="10" fill="#04795B"/><path d="M7 12a5 5 0 0110 0" fill="none" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="2" fill="#fff"/></> },
  Polkadot: { color: "#E6007A", icon: <><circle cx="12" cy="12" r="10" fill="#E6007A"/><circle cx="12" cy="6" r="2" fill="#fff"/><circle cx="12" cy="18" r="2" fill="#fff"/><circle cx="12" cy="12" r="3" fill="#fff"/></> },
  Algorand: { color: "#000000", icon: <><circle cx="12" cy="12" r="10" fill="#000"/><path d="M10 18l1-5-4 5h-2l5-7-1-4 -4 11h2l3-4 1 4h2l-1-5 4-6h-2l-3 5-1-4z" fill="#fff"/></> },
  Cardano: { color: "#0033AD", icon: <><circle cx="12" cy="12" r="10" fill="#0033AD"/><circle cx="12" cy="5" r="1.5" fill="#fff"/><circle cx="12" cy="19" r="1.5" fill="#fff"/><circle cx="6" cy="8.5" r="1.5" fill="#fff"/><circle cx="18" cy="8.5" r="1.5" fill="#fff"/><circle cx="6" cy="15.5" r="1.5" fill="#fff"/><circle cx="18" cy="15.5" r="1.5" fill="#fff"/></> },
  Ton: { color: "#0098EA", icon: <><circle cx="12" cy="12" r="10" fill="#0098EA"/><path d="M6 8h12l-1 9h-4V11h-2v6H7L6 8z" fill="#fff"/></> },
  Mina: { color: "#E39844", icon: <><circle cx="12" cy="12" r="10" fill="#E39844"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">M</text></> },
  Injective: { color: "#00F2FE", icon: <><circle cx="12" cy="12" r="10" fill="#0C0B20"/><path d="M8 16l4-10 4 10-4-3-4 3z" fill="#00F2FE"/></> },
  Osmosis: { color: "#5E12A0", icon: <><circle cx="12" cy="12" r="10" fill="#5E12A0"/><circle cx="12" cy="12" r="5" fill="none" stroke="#fff" strokeWidth="1.5"/><circle cx="12" cy="7" r="2" fill="#E8BDFF"/></> },
  Berachain: { color: "#7C3F00", icon: <><circle cx="12" cy="12" r="10" fill="#7C3F00"/><text x="12" y="16" textAnchor="middle" fill="#FFD989" fontSize="12">🐻</text></> },
  Eclipse: { color: "#6B21A8", icon: <><circle cx="12" cy="12" r="10" fill="#6B21A8"/><circle cx="14" cy="12" r="7" fill="#1a1a2e"/><circle cx="10" cy="12" r="7" fill="none" stroke="#C084FC" strokeWidth="1"/></> },
};

const chainRow1 = [
  "Ethereum", "Arbitrum", "Solana", "Polygon", "Sui",
  "Optimism", "Avalanche", "Monad", "Starknet", "zkSync", "Near",
  "Cosmos", "Fantom", "Celo", "Tron", "Hedera",
];

const chainRow2 = [
  "BNB Chain", "Aptos", "Sei", "Scroll", "Linea", "Mantle",
  "Blast", "Gnosis", "Polkadot", "Algorand", "Cardano", "Ton",
  "Mina", "Injective", "Osmosis", "Berachain", "Eclipse",
];

function ChainTicker({ chains, reverse }: { chains: string[]; reverse?: boolean }) {
  const content = chains.map((name, i) => (
    <a key={`${name}-${i}`} href={`/docs/chains/${name.toLowerCase().replace(/\s+/g, "-")}`} className="inline-flex items-center gap-2 sm:gap-3 px-2 group/chain cursor-pointer">
      <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 shrink-0 opacity-20 group-hover/chain:opacity-80 transition-opacity duration-300">
        {chainLogos[name]?.icon}
      </svg>
      <span className="font-heading font-bold text-[28px] sm:text-[36px] md:text-[44px] tracking-tight text-text/10 group-hover/chain:text-orange transition-colors duration-300 whitespace-nowrap">
        {name}
      </span>
      <span className="text-orange/30 text-[20px] ml-1">·</span>
    </a>
  ));

  return (
    <div className="overflow-hidden chain-ticker">
      <div
        className="inline-flex whitespace-nowrap chain-ticker-track"
        style={{
          animation: `marquee-scroll ${reverse ? "50s" : "45s"} linear infinite${reverse ? " reverse" : ""}`,
        }}
      >
        {content}
        {content}
      </div>
    </div>
  );
}

function ChainAgnostic() {
  return (
    <section id="networks" className="relative py-28">
      <div className="relative mx-auto max-w-5xl text-center px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="space-y-4 mb-14">
          <motion.p variants={fadeUp} className="text-text-muted text-[12px] font-semibold tracking-[0.2em] uppercase">Networks</motion.p>
          <motion.h2 variants={fadeUp} className="font-heading font-bold text-[30px] sm:text-[38px] md:text-[44px] tracking-tight">Chain-Agnostic Infrastructure</motion.h2>
          <motion.p variants={fadeUp} className="text-text-secondary text-[16px]">The SKC mechanism is pure math — it works on any chain, any VM. These are the first live deployments.</motion.p>
        </motion.div>

        {/* Active chains — unified */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: false }} variants={fadeUp}
          className="card p-8 max-w-lg mx-auto mb-10">
          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-10 h-10">
                <circle cx="12" cy="12" r="10" fill="#836EF9"/>
                <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">M</text>
              </svg>
              <div className="text-left">
                <h3 className="font-heading font-bold text-[17px] text-text">Monad</h3>
                <p className="text-[#836EF9] text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#836EF9] animate-pulse" />
                  Live
                </p>
              </div>
            </div>
          </div>
          <a href="https://yilingmarket.vercel.app/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-text text-white text-[14px] font-semibold hover:bg-accent-light hover:scale-[1.02] transition-all duration-200">
            View Live Product <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Why multi-chain cards */}
        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
          {[
            { title: "Any Chain, Any VM", desc: "EVM, SVM, Move, CosmWasm — the protocol adapts to any execution environment" },
            { title: "Math, Not Middleware", desc: "The SKC mechanism is a mathematical primitive — no chain-specific dependencies" },
            { title: "Growing Network", desc: "Natively built on Monad, with more chains and VMs coming soon" },
          ].map((item) => (
            <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: false }} variants={fadeUp}
              className="card p-5 text-left">
              <h4 className="font-heading font-bold text-[14px] text-text mb-1">{item.title}</h4>
              <p className="text-text-muted text-[13px] leading-[1.7]">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-text-muted text-[13px]">Any chain · Any VM · Permissionless deployment</p>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative py-28 px-6">
      <div className="relative mx-auto max-w-3xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: false }} variants={stagger}
          className="card p-14 text-center border-border-light">
          <div className="space-y-7">
            <motion.h2 variants={fadeUp} className="font-heading font-bold text-[30px] sm:text-[40px] tracking-tight">
              Ready to build with<br />
              <span className="text-text-secondary">self-resolving truth?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary text-[16px] max-w-md mx-auto leading-relaxed">
              Yiling Protocol is live on Monad. A general-purpose truth discovery primitive — ready for your use case.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a href="/docs/getting-started/overview"
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-text text-white text-[15px] font-semibold transition-all duration-200 hover:brightness-110 hover:scale-[1.02]">
                Start Building <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="https://github.com/Muhammed5500/YilingProcotol" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-border text-text-secondary hover:text-text hover:border-border-light text-[15px] font-medium transition-all duration-200">
                <Github className="w-4 h-4" /> View on GitHub
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function SlotLetter({ char, delay, color }: { char: string; delay: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-50px" });
  const [settled, setSettled] = useState(false);
  const [display, setDisplay] = useState(char);

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  useEffect(() => {
    if (!inView) { setSettled(false); setDisplay(char); return; }
    let frame = 0;
    const totalFrames = 12;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        frame++;
        if (frame >= totalFrames) {
          setDisplay(char);
          setSettled(true);
          clearInterval(interval);
        } else {
          setDisplay(chars[Math.floor(Math.random() * chars.length)]);
        }
      }, 50);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [inView, char, delay]);

  return (
    <div ref={ref} className="inline-block overflow-hidden relative" style={{ lineHeight: 1 }}>
      <motion.span
        initial={{ y: "-100%" }}
        animate={inView ? { y: 0 } : { y: "-100%" }}
        transition={{ delay: delay / 1000, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="inline-block font-heading font-extrabold"
        style={{
          WebkitTextStroke: `2px ${color}`,
          WebkitTextFillColor: settled ? "transparent" : color,
          paintOrder: "stroke fill",
          opacity: settled ? 1 : 0.30,
          transition: "opacity 0.6s ease, -webkit-text-fill-color 0.6s ease",
        }}
      >
        {display}
      </motion.span>
    </div>
  );
}

function BigBrandText() {
  const word1 = "YILING";
  const word2 = "PROTOCOL";

  return (
    <div className="relative py-16 overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center select-none text-[60px] sm:text-[90px] md:text-[120px] lg:text-[150px] tracking-[0.02em] leading-[0.9]">
          <div>
            {word1.split("").map((char, i) => (
              <SlotLetter key={`y-${i}`} char={char} delay={i * 80} color="#d4d4d4" />
            ))}
          </div>
          <div>
            {word2.split("").map((char, i) => (
              <SlotLetter key={`p-${i}`} char={char} delay={i * 80} color="#ea580c" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="relative py-12 px-6">
        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center">
                <Dices className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-[17px] text-text">Yiling Protocol</span>
            </div>
            <p className="text-text-muted text-[14px] leading-[1.8] max-w-sm">Oracle-free truth discovery infrastructure for any chain. Built on Harvard&apos;s SKC mechanism.</p>
            <div className="flex items-center gap-3">
              <a href="https://github.com/Muhammed5500/YilingProcotol" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-light transition-all duration-200">
                <Github className="w-4.5 h-4.5" />
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-light transition-all duration-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            </div>
          </div>

          <div className="section-divider mt-8 mb-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-text-muted text-[13px]">MIT License · Built on Harvard Research</p>
            <p className="text-text-muted text-[13px]">&copy; 2026 Yiling Protocol</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  return (
    <main>
      <Navigation dark={isDark} />
      <Hero />

      <MarqueeBand items={[
        "ORACLE-FREE", "SELF-RESOLVING", "MULTI-CHAIN", "GAME THEORY",
        "SKC MECHANISM", "CROSS-ENTROPY", "CHAIN AGNOSTIC",
        "PERMISSIONLESS", "TRUTH DISCOVERY", "TRUTH LAYER"
      ]} />

      <Problem />
      <SectionDivider />
      <HowItWorks onDarkChange={setIsDark} />
      <SectionDivider />
      <Mechanism />

      <MarqueeBand
        reverse
        items={[
          "CHAIN AGNOSTIC", "ANY AGENT", "LOW GAS", "ANY QUESTION",
          "MODULAR CONTRACTS", "REST API", "WEBSOCKET", "FOUNDRY",
          "HARVARD RESEARCH", "BAYESIAN EQUILIBRIUM"
        ]}
      />

      <Infrastructure />
      <SectionDivider />
      <Builders />
      <SectionDivider />
      <ChainAgnostic />
      <CTA />
      <BigBrandText />
      <Footer />
    </main>
  );
}
