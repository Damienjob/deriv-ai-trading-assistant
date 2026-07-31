import type { AppView } from '../components/Sidebar'
import { IconCalculator, IconCheck, IconGrid, IconShieldAlert, IconTarget } from '../components/Icon'
import { useEffect, useMemo } from 'react'

export function HomeView({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const heroImageSrc = useMemo(() => {
    const prompt = encodeURIComponent(
      'Ultra-realistic futuristic trading terminal dashboard on a sleek glass monitor, dark premium fintech UI, neon blue and cyan accents, candlestick chart with indicators, professional institutional trading desk, cinematic lighting, high detail, photorealistic, no text, no watermark'
    )
    return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_16_9`
  }, [])

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-show')
            e.target.classList.remove('reveal')
            obs.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12 }
    )
    for (const el of els) {
      el.classList.add('transition-all', 'duration-700', 'reveal')
      obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const moveX = (e.clientX - window.innerWidth / 2) * 0.01
      const moveY = (e.clientY - window.innerHeight / 2) * 0.01
      document.querySelectorAll<HTMLElement>('.hero-gradient').forEach((el) => {
        el.style.transform = `translate(${moveX}px, ${moveY}px)`
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="space-y-0">
      <section className="relative min-h-[850px] flex items-center justify-center overflow-hidden py-20">
        <div className="hero-gradient absolute inset-0" />
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              AI SIGNAL COPILOT
            </div>
            <h1 className="text-white text-5xl font-black leading-tight tracking-tight">
              Votre copilote IA pour des <span className="text-cyan-200">signaux de précision</span>.
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
              Un assistant d’analyse pour indices synthétiques: contexte marché, multi-timeframes, confirmation et zones clés (FVG).
              <span className="block mt-4 text-cyan-200 font-bold tracking-wide">
                NO DEPOSITS • NO RISK TO CAPITAL • PURE INTELLIGENCE
              </span>
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-8 py-4 rounded-xl font-bold bg-cyan-200 text-zinc-950 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all active:scale-95"
              >
                Ouvrir le Dashboard
              </button>
              <a
                href="#flow"
                className="glass-panel px-8 py-4 rounded-xl font-bold text-zinc-100 hover:bg-white/[0.06] transition-all"
              >
                Voir le Flux de Décision
              </a>
            </div>
          </div>

          <div className="relative" data-reveal>
            <div className="glass-panel p-2 rounded-2xl overflow-hidden">
              <img className="w-full h-auto rounded-xl" alt="Interface trading futuriste" src={heroImageSrc} />
            </div>
            <div className="absolute -bottom-6 -left-6 glass-panel p-4 rounded-xl border border-emerald-500/30 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-300">
                  <IconCheck size={18} />
                </div>
                <div>
                  <div className="text-emerald-300 text-xs font-bold tracking-wide">SIGNAL LOCK</div>
                  <div className="text-zinc-200 font-mono text-sm">V75 - SELL @ 452.10</div>
                </div>
              </div>
              <div className="text-xs text-zinc-400">Confiance IA: 98.4%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white/[0.02]" id="flow">
        <div className="text-center mb-16 space-y-4" data-reveal>
          <h2 className="text-white text-3xl font-black">Le Flux de Décision en 6 Étapes</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Comment l’IA valide chaque opportunité avant de la présenter.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { n: 1, t: 'Market Context', d: 'Analyse de la structure globale du marché.' },
            { n: 2, t: 'MTF Alignment', d: 'Confluence de M1 à H4 pour une tendance claire.' },
            { n: 3, t: 'Strategies', d: 'Application des algorithmes SMC & Price Action.' },
            { n: 4, t: 'Confirmation', d: 'Validation momentum et timing.' },
            { n: 5, t: 'FVG Detection', d: 'Ciblage des zones d’inefficience (FVG).' },
            { n: 6, t: 'Signal Lock', d: 'Alerte stable avec timing optimisé.' },
          ].map((s) => (
            <div key={s.n} className="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-cyan-500/20" data-reveal>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto text-cyan-200 font-black">
                {s.n}
              </div>
              <h4 className="font-bold text-sm text-white">{s.t}</h4>
              <p className="text-xs text-zinc-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="ticker-wrap py-3">
        <div className="ticker-move">
          <span className="px-8 font-mono text-sm text-emerald-300">BOOM 300: 1024.08 (+0.42%)</span>
          <span className="px-8 font-mono text-sm text-red-300">CRASH 500: 4946.16 (-0.12%)</span>
          <span className="px-8 font-mono text-sm text-emerald-300">V10 INDEX: 142.92 (+1.05%)</span>
          <span className="px-8 font-mono text-sm text-emerald-300">STEP INDEX: 8902.11 (+0.05%)</span>
          <span className="px-8 font-mono text-sm text-emerald-300">BOOM 300: 1024.08 (+0.42%)</span>
          <span className="px-8 font-mono text-sm text-red-300">CRASH 500: 4946.16 (-0.12%)</span>
          <span className="px-8 font-mono text-sm text-emerald-300">V10 INDEX: 142.92 (+1.05%)</span>
          <span className="px-8 font-mono text-sm text-emerald-300">STEP INDEX: 8902.11 (+0.05%)</span>
        </div>
      </div>

      <section className="py-24" id="features">
        <div className="text-center mb-16 space-y-4" data-reveal>
          <h2 className="text-white text-3xl font-black">Arsenal de Précision</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Conçu pour maximiser la justesse des signaux et sécuriser l’approche.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden" data-reveal>
            <div className="relative z-10">
              <span className="text-cyan-200 inline-flex mb-6"><IconTarget size={32} /></span>
              <h3 className="text-white text-2xl font-black mb-4">Précision des Signaux</h3>
              <p className="text-zinc-400 mb-6 max-w-md">
                Un signal n’apparaît que lorsqu’une confluence forte est atteinte via le flux de décision.
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 rounded bg-white/[0.04] text-xs font-mono text-zinc-200">STRICT FILTERS</span>
                <span className="px-3 py-1 rounded bg-white/[0.04] text-xs font-mono text-zinc-200">NO NOISE</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl border-l-4 border-emerald-500/40" data-reveal>
            <span className="text-emerald-300 inline-flex mb-6"><IconCalculator size={32} /></span>
            <h3 className="text-white text-2xl font-black mb-4">Calcul du Risque</h3>
            <p className="text-zinc-400">
              Chaque signal inclut une mise suggérée et une gestion du risque basée sur votre capital.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-2xl" data-reveal>
            <span className="text-purple-300 inline-flex mb-6"><IconGrid size={32} /></span>
            <h3 className="text-white text-2xl font-black mb-4">SMC Auto-Detection</h3>
            <p className="text-zinc-400">
              Identification des zones clés (FVG / SMC) et support/résistance, pour un timing précis.
            </p>
          </div>

          <div className="md:col-span-2 glass-panel p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8" data-reveal>
            <div className="flex-1">
              <span className="text-amber-300 inline-flex mb-6"><IconShieldAlert size={32} /></span>
              <h3 className="text-white text-2xl font-black mb-4">Sécurité & Intelligence</h3>
              <p className="text-zinc-400">
                L’application n’exécute pas de trades. Elle fournit l’intelligence et vous gardez 100% le contrôle.
              </p>
            </div>
            <div className="w-full md:w-64 h-40 bg-white/[0.04] rounded-xl flex items-center justify-center border border-white/10">
              <div className="text-center p-4">
                <div className="font-mono text-xl text-cyan-200">PURE</div>
                <div className="text-white font-black text-lg">INTELLIGENCE</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24" id="pricing">
        <div className="text-center mb-16 space-y-3" data-reveal>
          <h2 className="text-white text-3xl font-black">Activez votre Copilote</h2>
          <p className="text-zinc-400">Choisissez le niveau d’assistance qui vous convient.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-panel p-8 rounded-2xl flex flex-col" data-reveal>
            <div className="mb-8">
              <div className="text-zinc-400 font-bold mb-2">EXPLORATEUR</div>
              <div className="text-4xl font-black text-white">GRATUIT</div>
              <div className="text-sm text-zinc-500">Découvrir l’interface et les concepts</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm">
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Dashboard live</li>
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Flux de décision</li>
              <li className="flex items-center gap-2 text-zinc-500 opacity-40"><span className="text-zinc-500"><IconCheck size={18} /></span> Alertes avancées</li>
            </ul>
            <button className="w-full py-3 rounded-xl border border-cyan-500/25 text-cyan-200 font-bold hover:bg-cyan-500/10 transition-all">
              Commencer
            </button>
          </div>

          <div className="glass-panel p-8 rounded-2xl flex flex-col border-2 border-cyan-500/25 shadow-[0_0_40px_rgba(34,211,238,0.12)] relative" data-reveal>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-200 text-zinc-950 px-4 py-1 rounded-full text-xs font-black tracking-widest">
              POPULAIRE
            </div>
            <div className="mb-8">
              <div className="text-cyan-200 font-black mb-2">PRO</div>
              <div className="text-4xl font-black text-white">
                49€<span className="text-lg text-zinc-500">/mois</span>
              </div>
              <div className="text-sm text-zinc-500">Temps réel + validations complètes</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm">
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> MTF + confirmation</li>
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Zones FVG</li>
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Gestion du risque</li>
            </ul>
            <button className="w-full py-3 rounded-xl bg-cyan-200 text-zinc-950 font-black hover:shadow-[0_0_15px_rgba(34,211,238,0.35)] transition-all">
              Get Signals Now
            </button>
          </div>

          <div className="glass-panel p-8 rounded-2xl flex flex-col" data-reveal>
            <div className="mb-8">
              <div className="text-zinc-400 font-bold mb-2">INSTITUTIONNEL</div>
              <div className="text-4xl font-black text-white">
                199€<span className="text-lg text-zinc-500">/an</span>
              </div>
              <div className="text-sm text-zinc-500">Accès premium</div>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm">
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Tout le pack Pro</li>
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Support prioritaire</li>
              <li className="flex items-center gap-2 text-zinc-300"><span className="text-emerald-300"><IconCheck size={18} /></span> Accès illimité</li>
            </ul>
            <button className="w-full py-3 rounded-xl border border-cyan-500/25 text-cyan-200 font-bold hover:bg-cyan-500/10 transition-all">
              Accès annuel
            </button>
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden bg-cyan-500/5">
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8" data-reveal>
          <h2 className="text-white text-5xl font-black tracking-tight">Recevez vos premiers signaux aujourd’hui</h2>
          <p className="text-zinc-400 text-lg">
            Validez vos décisions avec un flux de confluence clair et une interface pensée pour l’exécution.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => onNavigate('dashboard')}
              className="bg-cyan-200 text-zinc-950 px-12 py-6 rounded-2xl font-black shadow-xl hover:scale-105 transition-all"
            >
              Ouvrir le Dashboard
            </button>
          </div>
          <p className="text-xs text-zinc-500 italic">Pas de carte requise. Aucun dépôt de fonds nécessaire.</p>
        </div>
      </section>
    </div>
  )
}
