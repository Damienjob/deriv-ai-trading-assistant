/**
 * Bouton de permission de notification navigateur.
 * Affiché dans le header — compact, discret.
 * Disparaît quand la permission est accordée.
 */
import { useState, useEffect } from 'react'
import { IconBell, IconBellOff } from './Icon'

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  if (!('Notification' in window)) return null

  if (permission === 'granted') {
    return (
      <span
        title="Notifications activées"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-white/[0.04] transition-colors cursor-default"
        aria-label="Notifications activées"
      >
        <IconBell size={15} />
      </span>
    )
  }

  if (permission === 'denied') {
    return (
      <span
        title="Notifications bloquées dans votre navigateur"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 cursor-help"
        aria-label="Notifications bloquées"
      >
        <IconBellOff size={15} />
      </span>
    )
  }

  const handleRequest = async () => {
    setRequesting(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
    } catch { /* fallback silencieux */ } finally {
      setRequesting(false)
    }
  }

  return (
    <button
      onClick={handleRequest}
      disabled={requesting}
      title="Activer les alertes"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                 bg-amber-500/10 border border-amber-500/20 text-amber-400
                 text-[12px] font-semibold hover:bg-amber-500/15 transition-colors
                 disabled:opacity-60"
      aria-label="Activer les notifications"
    >
      <IconBell size={13} />
      <span className="hidden sm:inline">{requesting ? '...' : 'Alertes'}</span>
    </button>
  )
}
