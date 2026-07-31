import { useState } from 'react'
import { useMarketStore } from '../store/marketStore'
import { API_URL } from '../utils/api'

const RISK_LEVELS = [
  { label: 'Conservateur', pct: 1, color: 'text-emerald-300', border: 'border-emerald-500/25', bg: 'bg-emerald-500/[0.08]' },
  { label: 'Modéré',       pct: 2, color: 'text-amber-300',   border: 'border-amber-400/25',   bg: 'bg-amber-400/[0.08]'   },
  { label: 'Agressif',     pct: 3, color: 'text-red-400',     border: 'border-red-500/25',     bg: 'bg-red-500/[0.08]'     },
]

function IconWallet({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M18 12h2a2 2 0 0 1 0 4h-2a2 2 0 0 1 0-4Z" />
    </svg>
  )
}

export function CapitalSettings() {
  const { baseAmount, setBaseAmount } = useMarketStore()
  const [input, setInput] = useState(String(baseAmount))
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    const val = parseFloat(input)
    if (isNaN(val) || val < 1) return
    try { await fetch(`${API_URL}/settings/amount?amount=${val}`, { method: 'POST' }) } catch {}
    setBaseAmount(val)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="surface-solid h-full flex flex-col">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-start justify-between">
        <div>
          <p className="section-label mb-1">Capital de base</p>
          <p className="font-bold text-xl text-white leading-none">
            {baseAmount.toFixed(2)}
            <span className="text-zinc-400 text-sm font-normal ml-1">$</span>
            <span className="text-emerald-400 text-xs font-normal ml-2">· Mis à jour</span>
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0">
          <IconWallet size={17} />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5 flex-1">

        {/* Input + bouton */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm pointer-events-none select-none">$</span>
            <input
              type="number" min="1" step="10"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="input-base w-full pl-8"
              aria-label="Montant du capital"
            />
          </div>
          <button
            onClick={handleSave}
            className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: saved ? 'rgba(78,222,163,0.15)' : '#4edea3',
              color: saved ? '#4edea3' : '#003824',
              border: saved ? '1px solid rgba(78,222,163,0.3)' : 'none',
              cursor: 'pointer',
              boxShadow: saved ? 'none' : '0 0 14px rgba(78,222,163,0.25)',
            }}
          >
            {saved ? '✓ Enregistré' : 'Appliquer'}
          </button>
        </div>

        {/* Risk grid */}
        <div>
          <p className="section-label mb-3">Mises recommandées par niveau de risque</p>
          <div className="grid grid-cols-3 gap-2">
            {RISK_LEVELS.map(({ label, pct, color, border, bg }) => (
              <div key={pct} className={`rounded-xl p-3 border ${bg} ${border}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${color}`}
                   style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {label}
                </p>
                <p className={`font-black text-lg leading-none ${color}`}
                   style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {(baseAmount * pct / 100).toFixed(2)}
                  <span className="text-xs ml-0.5 opacity-70">$</span>
                </p>
                <p className="text-zinc-500 text-[11px] mt-1">{pct}% du capital</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-zinc-600 text-[11px] leading-relaxed mt-auto italic">
          * Le système calcule automatiquement la mise optimale selon le niveau de confiance du signal.
        </p>

      </div>
    </div>
  )
}
