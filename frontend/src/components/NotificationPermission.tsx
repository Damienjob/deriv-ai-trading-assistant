/**
 * Bouton de permission de notification navigateur.
 * Affiché dans le header — compact, discret.
 * Disparaît quand la permission est accordée.
 */
import { useState, useEffect } from 'react'

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Pas de notifications supportées → rien à afficher
  if (!('Notification' in window)) return null
  // Permission déjà accordée → icône verte discrète
  if (permission === 'granted') {
    return (
      <span
        title="Notifications activées"
        className="text-green-400 text-sm select-none"
        aria-label="Notifications activées"
      >
        🔔
      </span>
    )
  }
  // Permission refusée → message d'info
  if (permission === 'denied') {
    return (
      <span
        title="Notifications bloquées dans votre navigateur"
        className="text-gray-500 text-sm select-none cursor-help"
        aria-label="Notifications bloquées"
      >
        🔕
      </span>
    )
  }

  // Permission non demandée → bouton d'activation
  const handleRequest = async () => {
    setRequesting(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
    } catch {
      // Navigateur ne supporte pas la promesse — fallback silencieux
    } finally {
      setRequesting(false)
    }
  }

  return (
    <button
      onClick={handleRequest}
      disabled={requesting}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/40
                 bg-yellow-500/10 text-yellow-300 text-xs font-semibold
                 hover:bg-yellow-500/20 transition-colors disabled:opacity-60"
      aria-label="Activer les notifications"
    >
      <span>🔔</span>
      <span>{requesting ? 'Activation...' : 'Activer alertes'}</span>
    </button>
  )
}
