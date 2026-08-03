import { useState } from 'react'
import { useMarketStore } from '../store/marketStore'
import type { AppView } from '../store/marketStore'
import {
  IconBolt, IconBarChart, IconInfo, IconShieldAlert,
  IconChevronDown, IconChevronUp, IconCheck, IconArrowUp, IconArrowDown,
} from '../components/Icon'

/* ── Helpers ─────────────────────────────────────────────── */
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    green:  { bg: 'rgba(78,222,163,0.12)', text: '#4edea3', border: 'rgba(78,222,163,0.25)' },
    red:    { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.25)'  },
    blue:   { bg: 'rgba(96,165,250,0.12)', text: '#93c5fd', border: 'rgba(96,165,250,0.25)' },
    purple: { bg: 'rgba(167,139,250,0.12)',text: '#c4b5fd', border: 'rgba(167,139,250,0.25)'},
    amber:  { bg: 'rgba(251,191,36,0.12)', text: '#fcd34d', border: 'rgba(251,191,36,0.25)' },
  }
  const c = map[color] ?? map.blue
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {children}
    </span>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'rgba(78,222,163,0.15)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.3)' }}>
          {n}
        </div>
        <div className="w-px flex-1 mt-2" style={{ background: 'var(--border-base)' }} />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</div>
      </div>
    </div>
  )
}

function Accordion({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-base)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        style={{ background: open ? 'var(--bg-stat)' : 'var(--bg-card)' }}
      >
        <span style={{ color: '#4edea3' }}>{icon}</span>
        <span className="flex-1 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ color: 'var(--text-muted)' }}>
          {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1" style={{ background: 'var(--bg-card)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Rule({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <span className="mt-0.5 shrink-0" style={{ color: ok ? '#4edea3' : '#f87171' }}>
        {ok ? <IconCheck size={14} /> : <IconShieldAlert size={14} />}
      </span>
      {children}
    </li>
  )
}

/* ── Section : Dashboard ─────────────────────────────────── */
function SectionDashboard({ onGo }: { onGo: () => void }) {
  return (
    <Accordion title="Dashboard — Signaux en temps réel" icon={<IconBolt size={18} />} defaultOpen>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        C'est la page principale. Elle affiche le signal actuel, le graphique en bougies et tous les indicateurs
        calculés sur 4 timeframes simultanément. C'est ici que tu décides d'entrer ou non.
      </p>

      {/* Ce qu'on observe */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Ce qu'on observe
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Bannière de décision', desc: 'ACHETEZ / VENDEZ / NE RIEN FAIRE — c\'est le verdict final de l\'algo après les 6 étapes.' },
          { label: 'Confiance %', desc: 'Score de 0 à 100. En dessous de 60 % → l\'algo ne donne pas de signal.' },
          { label: 'Verrou 🔒', desc: 'Le signal est stable 3 à 5 min. Il ne change pas à chaque tick pour éviter le bruit.' },
          { label: 'Graphique bougies', desc: 'EMA 20/50, Bollinger Bands, zones FVG violettes, niveaux S/R. Changer le TF avec le sélecteur.' },
          { label: 'Plan de position', desc: 'TP, SL, Risk/Reward, mise recommandée, durée max, nombre de répétitions.' },
          { label: 'Tableau MTF', desc: '4 timeframes (1h / 15min / 5min / 1min) avec direction, RSI, MACD, ATR.' },
        ].map(({ label, desc }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-stat)', border: '1px solid var(--border-base)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#4edea3' }}>{label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Quand acheter */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Quand acheter / vendre pour de vrai
      </p>
      <div className="space-y-3 mb-5">
        <div className="p-4 rounded-xl" style={{ background: 'rgba(78,222,163,0.06)', border: '1px solid rgba(78,222,163,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <IconArrowUp size={14} style={{ color: '#4edea3' }} />
            <span className="text-sm font-bold" style={{ color: '#4edea3' }}>Signal BUY — conditions pour entrer</span>
          </div>
          <ul className="space-y-1.5">
            <Rule ok>Bannière verte <strong>ACHETEZ</strong> affichée</Rule>
            <Rule ok>Confiance ≥ 70 % (idéalement ≥ 80 %)</Rule>
            <Rule ok>Verrou actif 🔒 — signal stable, pas en train de changer</Rule>
            <Rule ok>Au moins 3/4 timeframes en direction haussière dans le tableau MTF</Rule>
            <Rule ok>RSI entre 45 et 70 sur M15 (pas en surachat)</Rule>
            <Rule ok>Prix proche d'un FVG haussier ou d'un support → "Entrée optimale ⚡"</Rule>
          </ul>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <IconArrowDown size={14} style={{ color: '#f87171' }} />
            <span className="text-sm font-bold" style={{ color: '#f87171' }}>Signal SELL — conditions pour entrer</span>
          </div>
          <ul className="space-y-1.5">
            <Rule ok>Bannière rouge <strong>VENDEZ</strong> affichée</Rule>
            <Rule ok>Confiance ≥ 70 %</Rule>
            <Rule ok>Verrou actif 🔒</Rule>
            <Rule ok>Au moins 3/4 timeframes en direction baissière</Rule>
            <Rule ok>RSI entre 30 et 55 sur M15 (pas en survente)</Rule>
            <Rule ok>Prix proche d'un FVG baissier ou d'une résistance</Rule>
          </ul>
        </div>
      </div>

      {/* Ne pas entrer */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Ne pas entrer si
      </p>
      <ul className="space-y-1.5 mb-5">
        <Rule>Bannière <strong>NE RIEN FAIRE</strong> ou <strong>ATTENDRE</strong></Rule>
        <Rule>Alerte rouge ⚠ "Signal invalidé" en haut de page</Rule>
        <Rule>Confiance &lt; 60 %</Rule>
        <Rule>Volatilité "extreme" dans le contexte marché</Rule>
        <Rule>Moins de 2/4 TF alignés dans le tableau MTF</Rule>
        <Rule>Actif Boom → ne jamais vendre · Actif Crash → ne jamais acheter</Rule>
      </ul>

      {/* Étapes concrètes */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Procédure concrète
      </p>
      <div className="space-y-0">
        <Step n={1} title="Sélectionner l'actif">Utilise le sélecteur en haut du dashboard. Attends 2–3 secondes que les bougies se rechargent.</Step>
        <Step n={2} title="Entrer le capital">Dans le champ Capital, saisis ton solde réel. La mise recommandée se calcule automatiquement.</Step>
        <Step n={3} title="Lire la bannière">Si elle est verte (ACHETEZ) ou rouge (VENDEZ), vérifie la confiance et le verrou.</Step>
        <Step n={4} title="Vérifier le plan de position">Note le TP, le SL et la mise. Ne jamais dépasser la mise recommandée.</Step>
        <Step n={5} title="Ouvrir le trade sur Deriv">Va sur Deriv, entre le montant indiqué, place le trade dans la direction du signal.</Step>
        <Step n={6} title="Surveiller l'invalidation">Reste sur le dashboard. Si la bannière passe en rouge ⚠ "Signal invalidé" → sortir immédiatement.</Step>
      </div>

      <button onClick={onGo}
        className="mt-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
        style={{ background: '#4edea3', color: '#003824', border: 'none', cursor: 'pointer' }}>
        Aller au Dashboard →
      </button>
    </Accordion>
  )
}

/* ── Section : Analyse ───────────────────────────────────── */
function SectionAnalysis({ onGo }: { onGo: () => void }) {
  return (
    <Accordion title="Analyse — Comprendre le raisonnement de l'algo" icon={<IconInfo size={18} />}>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        La page Analyse détaille les 6 étapes du moteur de décision. Elle te permet de comprendre
        <em> pourquoi</em> l'algo dit d'acheter ou de vendre, et de valider toi-même chaque condition.
      </p>

      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Ce qu'on observe
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Contexte marché', desc: 'Phase (trending_up / ranging / breakout), structure HH/HL, volatilité ATR.' },
          { label: 'Confirmation 3 bougies', desc: '3 bougies M15 consécutives doivent valider EMA, RSI, MACD. Score affiché en cercle.' },
          { label: 'Score des 3 stratégies', desc: 'Trend+Pullback, Breakout+Retest, Multi-TF. Chaque score /100 avec détail des conditions.' },
          { label: 'Zones FVG', desc: 'Fair Value Gaps détectés sur 60 bougies M15. Force (fort/moyen/faible), distance au prix.' },
          { label: 'Ordres en attente', desc: 'Si le signal est < 70 %, l\'algo calcule un prix cible où entrer avec plus de confiance.' },
          { label: 'Indicateurs détaillés', desc: 'EMA 20/50/100/200, RSI, MACD, ATR, Bollinger sur chaque timeframe.' },
        ].map(({ label, desc }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-stat)', border: '1px solid var(--border-base)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#a78bfa' }}>{label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Comment lire la page Analyse avant d'entrer
      </p>
      <div className="space-y-0">
        <Step n={1} title="Contexte marché">Phase = trending_up ou trending_down → favorable. Phase = ranging → éviter sauf breakout confirmé.</Step>
        <Step n={2} title="Confirmation 3 bougies">Score ≥ 3/3 → signal solide. Score 2/3 → prudence. Score 1/3 ou 0/3 → ne pas entrer.</Step>
        <Step n={3} title="Stratégies">Au moins 2 stratégies sur 3 doivent être actives (score ≥ seuil). Si une seule est active → signal faible.</Step>
        <Step n={4} title="FVG">Si le prix est dans une zone FVG forte → "Entrée optimale ⚡". C'est le meilleur moment pour entrer.</Step>
        <Step n={5} title="Ordres en attente">Si le signal est WAIT, note le prix cible. Attends que le prix atteigne ce niveau avant d'entrer.</Step>
      </div>

      <button onClick={onGo}
        className="mt-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
        style={{ background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)', cursor: 'pointer' }}>
        Aller à l'Analyse →
      </button>
    </Accordion>
  )
}

/* ── Section : Positions ─────────────────────────────────── */
function SectionPositions({ onGo }: { onGo: () => void }) {
  return (
    <Accordion title="Positions — Suivi et gestion du risque" icon={<IconBarChart size={18} />}>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        La page Positions affiche ton compte Deriv en temps réel : solde, positions ouvertes,
        historique des trades. Elle te permet de surveiller tes trades actifs et de gérer le risque.
      </p>

      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Ce qu'on observe
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Solde du compte', desc: 'Solde temps réel connecté à ton compte Deriv via le token API.' },
          { label: 'Positions ouvertes', desc: 'Trades en cours avec P&L en temps réel, direction, montant, durée.' },
          { label: 'Historique', desc: 'Dernières transactions : gains, pertes, montants. Utile pour analyser ses performances.' },
          { label: 'Tracker de position', desc: 'Suivi du TP/SL de la position en cours avec alerte si le prix approche du SL.' },
        ].map(({ label, desc }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-stat)', border: '1px solid var(--border-base)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#60a5fa' }}>{label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
        Règles de gestion du risque à respecter
      </p>
      <ul className="space-y-1.5 mb-5">
        <Rule ok>Ne jamais dépasser la mise recommandée par l'algo (1–3 % du capital)</Rule>
        <Rule ok>Respecter le Stop Loss — sortir si le prix atteint le SL, sans exception</Rule>
        <Rule ok>Maximum 5 répétitions sur le même signal (budget série = 10 % du capital)</Rule>
        <Rule ok>Si 3 pertes consécutives → arrêter la session, analyser avant de reprendre</Rule>
        <Rule>Ne jamais doubler la mise après une perte (martingale interdite)</Rule>
        <Rule>Ne jamais trader sans SL défini</Rule>
      </ul>

      <button onClick={onGo}
        className="mt-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
        style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.25)', cursor: 'pointer' }}>
        Aller aux Positions →
      </button>
    </Accordion>
  )
}

/* ── Section : Règles d'or ───────────────────────────────── */
function SectionGoldenRules() {
  return (
    <Accordion title="Règles d'or — À lire avant chaque session" icon={<IconShieldAlert size={18} />}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4edea3' }}>✅ Toujours faire</p>
          <ul className="space-y-2">
            <Rule ok>Attendre le verrou 🔒 avant d'entrer — jamais sur un signal en train de changer</Rule>
            <Rule ok>Vérifier la confiance : ≥ 70 % minimum, ≥ 80 % idéal</Rule>
            <Rule ok>Lire le plan de position complet (TP, SL, R:R) avant d'ouvrir le trade</Rule>
            <Rule ok>Utiliser uniquement la mise recommandée par l'algo</Rule>
            <Rule ok>Surveiller l'invalidation tick par tick sur le dashboard</Rule>
            <Rule ok>Sortir immédiatement si la bannière passe en ⚠ "Signal invalidé"</Rule>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#f87171' }}>❌ Ne jamais faire</p>
          <ul className="space-y-2">
            <Rule>Entrer sur un signal WAIT ou NE RIEN FAIRE</Rule>
            <Rule>Ignorer le SL parce qu'on "pense" que le marché va revenir</Rule>
            <Rule>Trader les Boom en SELL ou les Crash en BUY</Rule>
            <Rule>Augmenter la mise après une perte</Rule>
            <Rule>Trader en volatilité "extreme" sans réduire la mise à 0</Rule>
            <Rule>Ouvrir plus de 1 trade à la fois sur le même actif</Rule>
          </ul>
        </div>
      </div>

      <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <p className="text-xs font-bold mb-1" style={{ color: '#fcd34d' }}>⚠ Avertissement</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Cet outil est un assistant d'analyse. Il ne garantit aucun gain. Tout trading comporte un risque
          de perte en capital. Les indices synthétiques Deriv (Boom/Crash) peuvent générer des pertes très rapides.
          Ne jamais trader avec de l'argent que tu ne peux pas te permettre de perdre.
        </p>
      </div>
    </Accordion>
  )
}

/* ── Section : Flux de décision ─────────────────────────── */
function SectionFlow() {
  return (
    <Accordion title="Comment l'algo prend ses décisions — Les 6 étapes" icon={<IconInfo size={18} />}>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        À chaque clôture de bougie M5, l'algo recalcule tout depuis zéro en 6 étapes séquentielles.
        Un signal n'est émis que si toutes les étapes sont validées.
      </p>
      <div className="space-y-0">
        <Step n={1} title="Contexte marché (M15)">
          Détermine la phase : <Badge color="green">trending_up</Badge> <Badge color="red">trending_down</Badge> <Badge color="amber">ranging</Badge> <Badge color="blue">breakout</Badge>.
          Détecte la structure HH/HL (haussier) ou LH/LL (baissier). Mesure la volatilité via ATR.
        </Step>
        <Step n={2} title="Analyse 4 timeframes">
          Calcule EMA, RSI, MACD, ATR, Bollinger sur 1h / 15min / 5min / 1min.
          Pondère les signaux : H1 (poids 4) → M15 (3) → M5 (2) → M1 (1).
        </Step>
        <Step n={3} title="3 stratégies (score /100)">
          Trend+Pullback (seuil 80), Breakout+Retest (seuil 85), Multi-TF (seuil 70).
          Filtres anti-faux signaux : mouvement épuisé, range trop étroit, contradiction entre stratégies.
        </Step>
        <Step n={4} title="Confirmation structurelle">
          3 bougies M15 consécutives doivent valider EMA20 vs EMA50, RSI, MACD histogram, prix vs EMA.
          Pénalité -20 pts si moins de 3 bougies confirmées.
        </Step>
        <Step n={5} title="Fair Value Gaps (FVG)">
          Détecte les zones d'imbalance sur 60 bougies M15. FVG fort proche → +8 pts de confiance.
          Prix dans la zone → message "Entrée optimale ⚡".
        </Step>
        <Step n={6} title="Signal verrouillé">
          BUY ou SELL si confiance ≥ 60 %. Verrou 5 min (≥ 80 %) ou 3 min.
          Surveillance tick par tick : invalidation immédiate si SL cassé, EMA croisée, RSI extrême.
        </Step>
      </div>
    </Accordion>
  )
}

/* ── Vue principale ──────────────────────────────────────── */
export function SupportView() {
  const setCurrentView = useMarketStore(s => s.setCurrentView)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(78,222,163,0.12)', border: '1px solid rgba(78,222,163,0.25)', color: '#4edea3' }}>
            <IconInfo size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Guide d'utilisation</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Comment utiliser Trading Tools pour trader efficacement</p>
          </div>
        </div>
      </div>

      {/* Résumé rapide */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { view: 'dashboard' as AppView, label: 'Dashboard', desc: 'Signaux live', color: '#4edea3', Icon: IconBolt },
          { view: 'analysis'  as AppView, label: 'Analyse',   desc: 'Comprendre l\'algo', color: '#a78bfa', Icon: IconInfo },
          { view: 'positions' as AppView, label: 'Positions', desc: 'Gérer le risque', color: '#60a5fa', Icon: IconBarChart },
        ].map(({ view, label, desc, color, Icon }) => (
          <button key={view} onClick={() => setCurrentView(view)}
            className="p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', cursor: 'pointer' }}>
            <Icon size={18} style={{ color, marginBottom: 8 }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
          </button>
        ))}
      </div>

      {/* Sections */}
      <SectionDashboard onGo={() => setCurrentView('dashboard')} />
      <SectionAnalysis  onGo={() => setCurrentView('analysis')}  />
      <SectionPositions onGo={() => setCurrentView('positions')} />
      <SectionFlow />
      <SectionGoldenRules />

    </div>
  )
}
