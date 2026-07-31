import { useState } from 'react'
import { useMarketStore } from '../store/marketStore'
import { API_URL } from '../utils/api'

const VOLATILITY = [
  { symbol: 'R_10',    label: 'V10'     },
  { symbol: 'R_25',    label: 'V25'     },
  { symbol: 'R_50',    label: 'V50'     },
  { symbol: 'R_75',    label: 'V75'     },
  { symbol: 'R_100',   label: 'V100'    },
  { symbol: '1HZ10V',  label: 'V10 1s'  },
  { symbol: '1HZ25V',  label: 'V25 1s'  },
  { symbol: '1HZ50V',  label: 'V50 1s'  },
  { symbol: '1HZ75V',  label: 'V75 1s'  },
  { symbol: '1HZ100V', label: 'V100 1s' },
]

const BOOM = [
  { symbol: 'BOOM300N', label: 'Boom 300'  },
  { symbol: 'BOOM500',  label: 'Boom 500'  },
  { symbol: 'BOOM1000', label: 'Boom 1000' },
]

const CRASH = [
  { symbol: 'CRASH300N', label: 'Crash 300'  },
  { symbol: 'CRASH500',  label: 'Crash 500'  },
  { symbol: 'CRASH1000', label: 'Crash 1000' },
]

interface Props { onSelect: (symbol: string) => void }

export function AssetSelector({ onSelect }: Props) {
  const { currentSymbol } = useMarketStore()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (symbol: string) => {
    if (symbol === currentSymbol) return
    setLoading(symbol)
    try {
      await fetch(`${API_URL}/settings/symbol?symbol=${symbol}`, { method: 'POST' })
      onSelect(symbol)
    } catch { onSelect(symbol) }
    finally { setLoading(null) }
  }

  const isBoomCrash = currentSymbol?.includes('BOOM') || currentSymbol?.includes('CRASH')

  function AssetBtn({ symbol, label }: { symbol: string; label: string }) {
    const isActive  = symbol === currentSymbol
    const isLoading = loading === symbol
    return (
      <button
        onClick={() => handleSelect(symbol)}
        disabled={isLoading}
        title={symbol}
        aria-pressed={isActive}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-[0.97] ${
          isActive
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:bg-white/[0.07] hover:text-zinc-200'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isLoading ? '…' : label}
      </button>
    )
  }

  return (
    <div className="surface-solid h-full flex flex-col">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <p className="section-label mb-1">Sélection de l'actif</p>
        <p className="text-white font-semibold text-sm">
          {currentSymbol}
          <span className="text-emerald-400 font-normal ml-2 text-xs">● Actif surveillé</span>
        </p>
      </div>

      <div className="p-5 flex-1 space-y-5">

        {/* Volatility */}
        <div>
          <p className="section-label text-emerald-600 mb-2.5">Volatility</p>
          <div className="flex flex-wrap gap-1.5">
            {VOLATILITY.map(a => <AssetBtn key={a.symbol} {...a} />)}
          </div>
        </div>

        {/* Boom + Crash side by side */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="section-label mb-2.5">Boom</p>
            <div className="flex flex-wrap gap-1.5">
              {BOOM.map(a => <AssetBtn key={a.symbol} {...a} />)}
            </div>
          </div>
          <div>
            <p className="section-label mb-2.5">Crash</p>
            <div className="flex flex-wrap gap-1.5">
              {CRASH.map(a => (
                <button
                  key={a.symbol}
                  onClick={() => handleSelect(a.symbol)}
                  disabled={loading === a.symbol}
                  aria-pressed={a.symbol === currentSymbol}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-[0.97] ${
                    a.symbol === currentSymbol
                      ? 'bg-red-500/15 text-red-300 border-red-500/30'
                      : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:bg-white/[0.07] hover:text-zinc-200'
                  } ${loading === a.symbol ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {loading === a.symbol ? '…' : a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step */}
        <div>
          <p className="section-label text-amber-400 mb-2.5">Step</p>
          <div className="flex flex-wrap gap-1.5">
            <AssetBtn symbol="stpRNG" label="Step Index" />
          </div>
        </div>

      </div>

      {/* Boom/Crash warning */}
      {isBoomCrash && (
        <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-orange-500/[0.08] border border-orange-500/20">
          <p className="text-orange-200 text-xs font-semibold leading-relaxed">
            {currentSymbol?.includes('BOOM')
              ? '↑ Boom : spikes haussiers — stratégie BUY uniquement.'
              : '↓ Crash : spikes baissiers — stratégie SELL uniquement.'}
          </p>
        </div>
      )}

    </div>
  )
}
