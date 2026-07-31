/**
 * Indicateur de connexion WebSocket dans le header.
 */
import { useMarketStore } from '../store/marketStore'

export function ConnectionStatus() {
  const { isConnected, error } = useMarketStore()

  return (
    <div className={`
      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold
      transition-colors
      ${isConnected
        ? 'text-emerald-400'
        : 'text-red-400 bg-red-500/8 border border-red-500/20'
      }
    `}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
      <span className="hidden sm:inline">
        {isConnected ? 'Connecté' : (error ?? 'Déconnecté')}
      </span>
    </div>
  )
}
