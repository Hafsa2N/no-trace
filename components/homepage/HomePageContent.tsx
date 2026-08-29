"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./HomePageContent.module.css";

// Fonts are loaded once, globally, in app/layout.tsx — every page shares
// the same --font-display/--font-body/--font-mono-nt variables, this
// component just reads them.

const STEPS = [
  {
    n: "01",
    title: "Students prove they belong. Nothing more.",
    body: "Roll number in, one-time code out. That confirms eligibility. It confirms nothing about what they're about to say.",
    tag: "→ students, session_participants",
  },
  {
    n: "02",
    title: "A blind token, not a name",
    body: "Their code becomes a token with zero identity attached. It knows it's real. It will never know whose it was.",
    tag: "→ tokens (identity-blind)",
  },
  {
    n: "03",
    title: "No name reaches the answer",
    body: "Their response saves against the token. The token burns on the spot. Nothing is left to trace it back with.",
    tag: "→ responses (no identity key)",
  },
];

const FACTS = [
  { count: 0, suffix: "", desc: "Foreign keys between identity and response tables. Not hidden. Not encrypted. Absent." },
  { count: 1, suffix: "×", desc: "Uses per verification token. Replay it and it's rejected — no exceptions, no retries." },
  { count: 5, suffix: "", desc: "Respondents required before one comment shows. Below that, elimination could name someone — so nothing shows." },
];

const FAQS = [
  { q: "Can an admin see who submitted what?", a: "No — not by policy, by structure. The responses table has no column that references a student. There's nothing to look up, even with full database access." },
  { q: "Could timing give a student away?", a: "Responses aren't stored in any order tied to verification, and sessions stay open long enough that timing alone can't narrow a response down to one person." },
  { q: "What happens to a student's roll number?", a: "It confirms eligibility, gets recorded only as a salted hash to block double-submission, and is never written anywhere near their actual answers." },
  { q: "Could a comment identify a student?", a: "Comments stay withheld entirely until at least 5 students in that class respond — so no comment is ever the one, or one of two, that could be traced by elimination." },
  { q: "Why trust this over a paper form?", a: "A paper form's anonymity depends on handwriting and someone's discretion. This depends on there being no path back to a student in the data — check the schema yourself, don't take our word for it." },
];

export function HomePageContent() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorReady, setCursorReady] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<number[]>(() => FACTS.map(() => 0));

  // Scroll reveal — plus a fallback timer. If IntersectionObserver never
  // fires for any reason (an older browser, a background/prerendered tab
  // that never becomes visible, an extension interfering), this content
  // must not stay permanently invisible — opacity:0 is the resting state,
  // and there has to be a way out of it that doesn't depend on the observer.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const allKeys = Array.from(targets, (t) => t.getAttribute("data-reveal")!);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const key = e.target.getAttribute("data-reveal")!;
          setRevealed((prev) => new Set(prev).add(key));
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
    const fallback = setTimeout(() => setRevealed(new Set(allKeys)), 2500);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  // Count-up once the facts grid reveals. requestAnimationFrame is paused
  // by the browser for a hidden/backgrounded document the same way
  // IntersectionObserver is — a fallback timer here means the real numbers
  // still land even if rAF never gets a chance to run.
  useEffect(() => {
    if (!revealed.has("facts")) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setCounts(FACTS.map((f) => f.count));
      return;
    }
    const fallback = setTimeout(() => setCounts(FACTS.map((f) => f.count)), 1500);
    const start = performance.now();
    const duration = 700;
    let raf: number;
    function tick(now: number) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCounts(FACTS.map((f) => Math.round(eased * f.count)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else clearTimeout(fallback);
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(fallback); };
  }, [revealed]);

  // Custom cursor — fine pointers only
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduceMotion) return;
    setCursorReady(true);
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    let raf: number;
    function onMove(e: MouseEvent) {
      mx = e.clientX; my = e.clientY;
      dot!.style.left = mx + "px"; dot!.style.top = my + "px";
      const target = (e.target as HTMLElement).closest("a, button, [data-tilt]");
      ring!.classList.toggle(styles.hovering, !!target);
    }
    window.addEventListener("mousemove", onMove);
    function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring!.style.left = rx + "px"; ring!.style.top = ry + "px";
      raf = requestAnimationFrame(loop);
    }
    loop();
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // Hero canvas — dot grid, glows near the cursor
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hero = canvas.parentElement!;
    let w: number, h: number, dots: { x: number; y: number }[] = [];
    let px = -1000, py = -1000;
    function size() {
      w = canvas!.width = hero.offsetWidth;
      h = canvas!.height = hero.offsetHeight;
      dots = [];
      const gap = 34;
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) dots.push({ x, y });
    }
    size();
    const onResize = () => size();
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
    };
    const onLeave = () => { px = -1000; py = -1000; };
    window.addEventListener("resize", onResize);
    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dist = Math.hypot(d.x - px, d.y - py);
        const near = Math.max(0, 1 - dist / 180);
        const r = 1.2 + near * 2.4;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = near > 0.05 ? `rgba(255,75,51,${0.18 + near * 0.7})` : "rgba(36,26,46,0.10)";
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      window.removeEventListener("resize", onResize);
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Card tilt
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduceMotion || !rootRef.current) return;
    const cards = rootRef.current.querySelectorAll<HTMLElement>("[data-tilt]");
    const cleanups: (() => void)[] = [];
    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 14}deg) translateY(-6px)`;
      };
      const onLeave = () => { card.style.transform = ""; };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      cleanups.push(() => { card.removeEventListener("mousemove", onMove); card.removeEventListener("mouseleave", onLeave); });
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  // Magnetic buttons
  useEffect(() => {
    if (!rootRef.current) return;
    const btns = rootRef.current.querySelectorAll<HTMLElement>("[data-magnetic]");
    const cleanups: (() => void)[] = [];
    btns.forEach((btn) => {
      const parent = btn.parentElement;
      if (!parent) return;
      const onMove = (e: MouseEvent) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      };
      const onLeave = () => { btn.style.transform = "translate(0,0)"; };
      parent.addEventListener("mousemove", onMove);
      parent.addEventListener("mouseleave", onLeave);
      cleanups.push(() => { parent.removeEventListener("mousemove", onMove); parent.removeEventListener("mouseleave", onLeave); });
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div ref={rootRef} className={styles.page}>
      <svg className={styles.grain} width="100%" height="100%" aria-hidden="true">
        <filter id="nt-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#nt-noise)" />
      </svg>

      {cursorReady && (
        <>
          <div ref={dotRef} className={styles.cursorDot} />
          <div ref={ringRef} className={styles.cursorRing} />
        </>
      )}

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <span className={styles.brandDot} />
            NO TRACE
          </div>
          <div className={styles.navLinks}>
            <a href="#how" className={styles.plain}>How it works</a>
            <a href="#faq" className={styles.plain}>FAQ</a>
            <span className={styles.magnetic}>
              <Link href="/admin/login" className={`${styles.magneticBtn} ${styles.dark}`} data-magnetic>
                Staff login
              </Link>
            </span>
          </div>
        </div>
      </nav>

      <div className={styles.marqueeBand}>
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>
              <span>VERIFIED, NOT TRACEABLE</span>
              <span>ONE-TIME TOKEN</span>
              <span>ZERO IDENTITY KEYS</span>
              <span>ANONYMOUS BY DESIGN</span>
            </span>
          ))}
        </div>
      </div>

      <section className={styles.hero}>
        <canvas ref={canvasRef} className={styles.heroCanvas} />
        <div className={styles.wrap}>
          <div className={styles.heroEyebrow}>
            <span className={styles.pulse} />
            Live session — CSE · Year 3 · Section A
          </div>
          <h1 className={`${styles.heroH1} ${styles.display}`}>
            <span className={styles.heroLine}><span>THEY SAY IT.</span></span>
            <span className={styles.heroLine}><span>NO ONE CAN</span></span>
            <span className={styles.heroLine}><span>TRACE IT.</span></span>
          </h1>
          <div className={styles.heroSub}>
            <p>A roll number proves a student belongs in the class. It never touches what they say. Two tables. No shared key. No path back.</p>
            <div className={styles.heroActions}>
              <span className={styles.magnetic}>
                <a href="#how" className={styles.magneticBtn} data-magnetic>See the mechanism ↓</a>
              </span>
              <a href="#faq" className={styles.plain}>Read the FAQ →</a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.howBlock} id="how">
        <div className={styles.wrap}>
          <div className={`${styles.howHead} ${styles.reveal} ${revealed.has("how") ? styles.in : ""}`} data-reveal="how">
            <h2 className={styles.display}>Three steps.<br />Each one a lock.</h2>
          </div>
        </div>
        <div className={styles.wrap} style={{ padding: 0 }}>
          <div className={`${styles.scrollStrip} ${styles.stripPerspective}`}>
            {STEPS.map((s) => (
              <div key={s.n} className={styles.stepCard} data-tilt>
                <div className={styles.stepNum}>{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <span className={`${styles.stepTag} ${styles.mono}`}>{s.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.facts}>
        <div className={styles.wrap}>
          <div className={`${styles.factsHead} ${styles.reveal} ${revealed.has("facts") ? styles.in : ""}`} data-reveal="facts">
            <div className={styles.heroEyebrow}>
              <span className={styles.pulse} />
              Not a promise — a schema
            </div>
            <h2 className={styles.display}>The database can&apos;t rat anyone out.</h2>
          </div>
          <div className={styles.factsGrid}>
            {FACTS.map((f, i) => (
              <div key={i} className={styles.factItem}>
                <div className={`${styles.factNum} ${styles.mono}`}>{counts[i]}{f.suffix}</div>
                <div className={styles.factDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <div className={styles.wrap}>
          <div className={styles.faqHead}>
            <h2 className={styles.display}>Ask the skeptical<br />question first.</h2>
          </div>
          <div>
            {FAQS.map((item, i) => (
              <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.open : ""}`}>
                <button className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>
                    <span className={styles.faqQn}>{String(i + 1).padStart(2, "0")}</span>
                    {item.q}
                  </span>
                  <span className={styles.faqPlus}>+</span>
                </button>
                <div className={styles.faqAWrap}>
                  <p className={styles.faqA}>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaBlock}>
        <div className={styles.wrap}>
          <h2 className={styles.display}>Set up a<br />session in minutes.</h2>
          <div className={styles.heroActions}>
            <span className={styles.magnetic}>
              <Link href="/admin/login" className={styles.magneticBtn} data-magnetic>
                Staff login
              </Link>
            </span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footInner}`}>
          <div className={styles.brand} style={{ fontSize: 16 }}>
            <span className={styles.brandDot} />
            NO TRACE
          </div>
          <div className={styles.footLinks}>
            <Link href="/privacy">Privacy</Link>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
