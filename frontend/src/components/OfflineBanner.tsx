export function OfflineBanner({ isOffline, isHome }: { isOffline: boolean; isHome: boolean }) {
  if (!isOffline) return null

  return (
    <div
      className={[
        'border-b border-amber-400/20 bg-amber-400/[0.08] text-amber-200 text-center py-2 text-[13px] font-semibold px-4 tracking-wide',
        isHome ? '' : 'rounded-lg',
      ].join(' ')}
    >
      Connexion requise — mode hors-ligne · dernières données en cache si disponibles
    </div>
  )
}
