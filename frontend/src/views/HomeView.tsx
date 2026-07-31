import type { AppView } from '../components/Sidebar'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { API_URL } from '../utils/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PriceItem { symbol: string; label: string; price: number; change_pct: number }

// ── Icônes Material Symbols (inline SVG paths via font) ──────────────────────
function MatIcon({ name, fill = 0, className = '', style }: { name: string; fill?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill}`, fontSize: 'inherit', ...style }}
    >
      {name}
    </span>
  )
}

// ── Ticker live ───────────────────────────────────────────────────────────────
function LiveTicker() {
  const [prices, setPrices] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/market/prices`)
      if (!res.ok) return
      const data = await res.json()
      const list: PriceItem[] = Object.values(data.prices ?? {}) as PriceItem[]
      if (list.length > 0) setPrices(list)
    } catch { /* backend indisponible */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchPrices()
    const id = setInterval(fetchPrices, 30_000)
    return () => clearInterval(id)
  }, [fetchPrices])

  const items = useMemo(() => [...prices, ...prices], [prices])

  if (loading) return (
    <div className="ticker-wrap py-3 flex items-center justify-center gap-2">
      <span className="w-3 h-3 border-2 border-emerald-400/60 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono" style={{ color: '#bbcabf' }}>Chargement des prix…</span>
    </div>
  )
  if (prices.length === 0) return null

  return (
    <div className="ticker-wrap py-3 overflow-hidden">
      <div className="ticker-move inline-flex" style={{ animationDuration: '90s' }}>
        {items.map((item, i) => {
          const up = item.change_pct >= 0
          const col = up ? '#4edea3' : '#f87171'
          return (
            <span key={i} className="inline-flex items-center gap-2 px-8 shrink-0 font-mono text-xs">
              <span className="font-bold tracking-wide" style={{ color: col }}>{item.label}</span>
              <span style={{ color: col }}>{item.price.toFixed(item.price > 100 ? 2 : 4)}</span>
              <span className="font-semibold" style={{ color: col }}>
                ({up ? '+' : ''}{item.change_pct.toFixed(2)}%)
              </span>
              <span style={{ color: '#3c4a42' }} className="mx-1">·</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Scroll reveal hook ────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(16px)'
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease'
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ── Glass card ────────────────────────────────────────────────────────────────
function GlassCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useScrollReveal()
  return (
    <div ref={ref} className={`glass-card rounded-2xl ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── Steps data ────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, icon: 'analytics',             title: 'Market Context', desc: 'Analyse de la structure globale du marché' },
  { n: 2, icon: 'stacked_line_chart',    title: 'MTF Alignment',  desc: 'Confluence de M1 à H4 pour une tendance claire' },
  { n: 3, icon: 'architecture',          title: 'Strategies',     desc: 'Application des algorithmes SMC & Price Action' },
  { n: 4, icon: 'verified',              title: 'Confirmation',   desc: 'Validation momentum et timing' },
  { n: 5, icon: 'query_stats',           title: 'FVG Detection',  desc: "Ciblage des zones d'inefficience (FVG)" },
  { n: 6, icon: 'notification_important',title: 'Signal Lock',    desc: 'Alerte stable avec timing optimisé' },
]

const ARSENAL = [
  { icon: 'target',        title: 'Précision des Signaux',  desc: "Un signal n'apparaît que lorsqu'une confluence forte est atteinte via le flux de décision.", tags: ['STRICT FILTERS', 'NO NOISE'] },
  { icon: 'calculate',     title: 'Calcul du Risque',       desc: 'Chaque signal inclut une mise suggérée et une gestion du risque basée sur votre capital.',   tags: [] },
  { icon: 'grid_view',     title: 'SMC Auto-Detection',     desc: 'Identification des zones clés (FVG / OB) et support/résistance pour un timing précis.',      tags: [] },
  { icon: 'verified_user', title: 'Sécurité & Intelligence', desc: "L'application n'exécute pas de trades. Elle fournit l'intelligence et vous gardez 100% le contrôle.", tags: ['PURE INTELLIGENCE'] },
]

// ── Main component ────────────────────────────────────────────────────────────
export function HomeView({ onNavigate }: { onNavigate: (view: AppView) => void }) {

  // Parallax gradient sur hero
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth  / 2) * 0.012
      const y = (e.clientY - window.innerHeight / 2) * 0.012
      document.querySelectorAll<HTMLElement>('.hero-glow').forEach(el => {
        el.style.transform = `translate(${x}px, ${y}px)`
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      className="relative -mx-4 sm:-mx-6"
      style={{ fontFamily: 'Inter, sans-serif', color: '#e5e2e1', background: '#0a0a0a' }}
    >
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Gradient mesh background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: 'radial-gradient(circle at 10% 10%, rgba(16,185,129,0.05) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(16,185,129,0.05) 0%, transparent 40%)',
        }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Ticker ─────────────────────────────────────────────────────────── */}
        <LiveTicker />

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-8 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest"
              style={{ border: '1px solid rgba(78,222,163,0.4)', background: 'rgba(78,222,163,0.1)', color: '#4edea3', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}
            >
              <MatIcon name="auto_awesome" fill={1} className="text-[18px]" />
              AI SIGNAL COPILOT
            </div>

            {/* Headline */}
            <h1
              className="leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e5e2e1', lineHeight: 1.15 }}
            >
              Votre copilote IA pour des{' '}
              <span style={{ color: '#4edea3' }}>signaux de précision</span>
            </h1>

            {/* Subtitle */}
            <p style={{ color: '#bbcabf', fontSize: 18, lineHeight: '28px', maxWidth: 480 }}>
              Un assistant d'analyse pour indices synthétiques : contexte marché, multi-timeframes, confirmation et zones clés (FVG).
              <br />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.07em', opacity: 0.65 }}>
                NO DEPOSITS • NO RISK TO CAPITAL • PURE INTELLIGENCE
              </span>
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => onNavigate('dashboard')}
                style={{
                  background: '#4edea3', color: '#003824', padding: '16px 32px', borderRadius: 12,
                  fontWeight: 700, fontSize: 16, boxShadow: '0 0 20px rgba(78,222,163,0.3)',
                  transition: 'all 0.3s', cursor: 'pointer', border: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(78,222,163,0.5)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(78,222,163,0.3)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
              >
                Ouvrir le Dashboard
              </button>
              <a
                href="#flow"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)', padding: '16px 32px', borderRadius: 12,
                  fontWeight: 700, fontSize: 16, color: '#e5e2e1', textDecoration: 'none',
                  transition: 'all 0.3s', display: 'inline-block',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
              >
                Voir le Flux de Décision
              </a>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative group">
            <div
              className="hero-glow absolute -inset-4 rounded-[2rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
              style={{ background: 'rgba(78,222,163,0.2)' }}
            />
            <div className="glass-card rounded-[2rem] p-1 shadow-2xl relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfvWjz5ClvRNYXJ70d-liJzvSMooA9dXn2gOBdN3Vmj2Fh6yJJ9hIOG8cTjLgeDp3qZfOx8GhIUa6NFfiFLFxsO-oKvR7WjD5U3thqvL90T0WLUy0TN1JLM9r1yYTUVLefTSNDzci9aTj5UqYrv4lPFvbEPtwAdWb1-UQZ76tWd5lTxxHD9xc4k0Kv1XIHN_VZHb4v1-CMQQIvX1J4sE6i2zXNdUSImqsf-lX1u53GrCd7ytQc3kAl"
                alt="Interface trading futuriste IA"
                className="w-full h-auto rounded-[1.9rem]"
              />
            </div>
          </div>
        </section>

        {/* ── Decision Flow ───────────────────────────────────────────────────── */}
        <section id="flow" className="max-w-7xl mx-auto px-8 py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#e5e2e1' }}>
              Le Flux de Décision en 6 Étapes
            </h2>
            <p style={{ color: '#bbcabf', fontSize: 16 }}>Comment l'IA valide chaque opportunité avant de la présenter.</p>
          </div>

          <div className="relative py-12 overflow-x-auto">
            {/* Timeline line desktop */}
            <div
              className="absolute hidden md:block h-[2px] opacity-30"
              style={{ top: 48, left: 0, right: 0, background: 'linear-gradient(90deg, #3c4a42 0%, #4edea3 100%)' }}
            />
            <div className="flex justify-between gap-8 min-w-[900px] relative">
              {STEPS.map((step, i) => (
                <div key={step.n} className="flex flex-col items-center text-center space-y-6 flex-1">
                  <div
                    className="w-12 h-12 rounded-full glass-card flex items-center justify-center relative z-10 text-[22px]"
                    style={{
                      border: i === 0 ? '1px solid rgba(78,222,163,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      background: '#0a0a0a',
                      color: '#4edea3',
                      animation: i === 0 ? 'pulse-emerald 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined,
                    }}
                  >
                    <MatIcon name={step.icon} />
                  </div>
                  <div className="space-y-1">
                    <h3 style={{ fontWeight: 700, color: '#e5e2e1', fontSize: 14 }}>{step.n}. {step.title}</h3>
                    <p style={{ color: '#bbcabf', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Arsenal ─────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-8 py-16 space-y-16">
          <div className="text-center space-y-4">
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#e5e2e1' }}>
              Arsenal de Précision
            </h2>
            <p style={{ color: '#bbcabf', fontSize: 16 }}>Conçu pour maximiser la justesse des signaux et sécuriser l'approche.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ARSENAL.map((card) => (
              <GlassCard key={card.title} className="p-6 flex flex-col gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px]"
                  style={{ background: 'rgba(78,222,163,0.1)', border: '1px solid rgba(78,222,163,0.2)', color: '#4edea3' }}
                >
                  <MatIcon name={card.icon} />
                </div>
                <div className="space-y-2">
                  <h3 style={{ fontWeight: 700, fontSize: 20, color: '#e5e2e1' }}>{card.title}</h3>
                  <p style={{ color: '#bbcabf', fontSize: 16, lineHeight: '24px' }}>{card.desc}</p>
                </div>
                {card.tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-2">
                    {card.tags.map(tag => (
                      <span
                        key={tag}
                        style={{ padding: '2px 8px', borderRadius: 4, background: '#2a2a2a', color: '#4edea3', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-8 py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#e5e2e1' }}>
              Activez votre Copilote
            </h2>
            <p style={{ color: '#bbcabf', fontSize: 16 }}>Choisissez le niveau d'assistance qui vous convient.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
            {/* Free */}
            <GlassCard className="p-8 rounded-3xl space-y-8">
              <div className="text-center space-y-2">
                <span style={{ color: '#bbcabf', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 500 }}>EXPLORATEUR</span>
                <h3 style={{ fontSize: 40, fontWeight: 700, color: '#e5e2e1', letterSpacing: '-0.02em' }}>GRATUIT</h3>
              </div>
              <ul className="space-y-4">
                {['Dashboard live', 'Flux de décision', 'Alertes avancées'].map(f => (
                  <li key={f} className="flex items-center gap-3" style={{ color: '#bbcabf', fontSize: 16 }}>
                    <MatIcon name="check_circle" className="text-sm" style={{ color: '#4edea3' } as React.CSSProperties} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                style={{ width: '100%', padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e5e2e1', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Commencer
              </button>
            </GlassCard>

            {/* Pro — highlighted */}
            <GlassCard
              className="p-8 rounded-3xl space-y-8 relative"
              style={{ border: '1px solid rgba(78,222,163,0.5)', transform: 'scale(1.05)', boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}
            >
              <div
                className="absolute left-1/2 -translate-x-1/2 px-6 py-1 rounded-full font-bold"
                style={{ top: -16, background: '#4edea3', color: '#003824', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              >
                Populaire
              </div>
              <div className="text-center space-y-2">
                <span style={{ color: '#bbcabf', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 500 }}>PRO</span>
                <h3 style={{ fontSize: 40, fontWeight: 700, color: '#e5e2e1', letterSpacing: '-0.02em' }}>
                  5€<span style={{ fontSize: 16, fontWeight: 400, color: '#bbcabf' }}>/mois</span>
                </h3>
                <p style={{ color: '#4edea3', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Temps réel + validations complètes</p>
              </div>
              <ul className="space-y-4">
                {['MTF + confirmation', 'Zones FVG', 'Gestion du risque', 'Support prioritaire'].map(f => (
                  <li key={f} className="flex items-center gap-3" style={{ color: '#e5e2e1', fontSize: 16 }}>
                    <MatIcon name="check_circle" className="text-sm" style={{ color: '#4edea3' } as React.CSSProperties} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onNavigate('dashboard')}
                style={{ width: '100%', padding: '16px', borderRadius: 12, background: '#4edea3', color: '#003824', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 0 20px rgba(78,222,163,0.3)', border: 'none', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(78,222,163,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(78,222,163,0.3)' }}
              >
                Get Signals Now
              </button>
            </GlassCard>

            {/* Institutional */}
            <GlassCard className="p-8 rounded-3xl space-y-8">
              <div className="text-center space-y-2">
                <span style={{ color: '#bbcabf', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 500 }}>INSTITUTIONNEL</span>
                <h3 style={{ fontSize: 40, fontWeight: 700, color: '#e5e2e1', letterSpacing: '-0.02em' }}>
                  51€<span style={{ fontSize: 16, fontWeight: 400, color: '#bbcabf' }}>/an</span>
                </h3>
              </div>
              <ul className="space-y-4">
                {['Tout le pack Pro', 'Accès illimité', 'API Access'].map(f => (
                  <li key={f} className="flex items-center gap-3" style={{ color: '#bbcabf', fontSize: 16 }}>
                    <MatIcon name="check_circle" className="text-sm" style={{ color: '#4edea3' } as React.CSSProperties} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                style={{ width: '100%', padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e5e2e1', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Accès annuel
              </button>
            </GlassCard>
          </div>
        </section>

        {/* ── CTA Final ───────────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-8 py-24 text-center space-y-12">
          <div className="space-y-4">
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#e5e2e1' }}>
              Recevez vos premiers signaux aujourd'hui
            </h2>
            <p style={{ color: '#bbcabf', fontSize: 16 }}>
              Validez vos décisions avec un flux de confluence clair et une interface pensée pour l'exécution.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              background: '#4edea3', color: '#003824', padding: '20px 48px', borderRadius: 16,
              fontWeight: 700, fontSize: 18, boxShadow: '0 0 20px rgba(78,222,163,0.3)',
              border: 'none', cursor: 'pointer', transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(78,222,163,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(78,222,163,0.3)'; e.currentTarget.style.transform = 'none' }}
          >
            Ouvrir le Dashboard
          </button>
          <p style={{ color: '#bbcabf', fontSize: 12, opacity: 0.6, fontStyle: 'italic' }}>
            Pas de carte requise. Aucun dépôt de fonds nécessaire.
          </p>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <footer
          className="border-t"
          style={{ background: '#0e0e0e', borderColor: 'rgba(60,74,66,0.3)', padding: '48px 0' }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto px-8">
            <div style={{ fontWeight: 700, fontSize: 20, color: '#e5e2e1' }}>Deriv AI</div>
            <div className="flex gap-8">
              {['Dashboard', 'Analyse', 'Positions'].map(l => (
                <button
                  key={l}
                  onClick={() => onNavigate(l.toLowerCase() as AppView)}
                  style={{ color: '#bbcabf', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#4edea3')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#bbcabf')}
                >
                  {l}
                </button>
              ))}
            </div>
            <p style={{ color: '#bbcabf', fontSize: 12, opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>
              © 2026 Deriv AI · Indicatif uniquement
            </p>
          </div>
        </footer>

        {/* pulse-emerald keyframes */}
        <style>{`
          @keyframes pulse-emerald {
            0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px #4edea3); }
            50% { opacity: .7; filter: drop-shadow(0 0 15px #4edea3); }
          }
        `}</style>

      </div>
    </div>
  )
}
