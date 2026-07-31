/**
 * Widget compact de connexion compte Deriv — affiché dans le header.
 * Montre : solde, loginid, bouton de connexion/refresh.
 * Clique → ouvre le panneau complet dans les détails.
 */
import { useState, useEffect } from 'react'
import { API_URL } from '../utils/api'
import { IconChevronRight, IconKey, IconRefresh, IconX } from './Icon'

interface AccountSummary {
  loginid: string
  balance: number
  currency: string
  is_virtual: boolean
  account_type: string
}

interface Props {
  onOpenDetails: () => void
}

export function AccountWidget({ onOpenDetails }: Props) {
  const [account, setAccount] = useState<AccountSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)

  const fetchAccount = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/account/info`)
      if (res.ok) {
        const data = await res.json()
        setAccount(data)
        setShowTokenInput(false)
      } else {
        const err = await res.json()
        setError(err.detail ?? 'Non connecté')
        setShowTokenInput(true)
      }
    } catch {
      setError('Backend inaccessible')
    } finally {
      setLoading(false)
    }
  }

  const saveToken = async () => {
    if (!tokenInput.trim()) return
    try {
      // Envoyer le token au backend via un endpoint dédié
      const res = await fetch(`${API_URL}/account/set-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      })
      if (res.ok) {
        setTokenInput('')
        setShowTokenInput(false)
        await fetchAccount()
      } else {
        setError('Token invalide')
      }
    } catch {
      setError('Erreur de connexion')
    }
  }

  useEffect(() => { fetchAccount() }, [])

  // ── Compte connecté ──
  if (account) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => { onOpenDetails(); fetchAccount() }}
          className="btn py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06]"
          title="Voir le compte Deriv"
        >
          <div className={`w-2 h-2 rounded-full ${account.is_virtual ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <div className="text-left">
            <p className="text-white text-xs font-semibold leading-none">
              {account.balance.toFixed(2)} {account.currency}
            </p>
            <p className="text-zinc-400 text-xs leading-none mt-0.5">
              {account.loginid} · {account.is_virtual ? 'Démo' : 'Réel'}
            </p>
          </div>
          <span className="text-zinc-500">
            <IconChevronRight size={16} />
          </span>
        </button>
        <button
          onClick={fetchAccount}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          title="Rafraîchir"
        >
          <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    )
  }

  // ── Non connecté — affiche bouton + optionnel champ token ──
  return (
    <div className="flex items-center gap-2">
      {!showTokenInput ? (
        <button
          onClick={() => setShowTokenInput(true)}
          className="btn btn-strong py-1.5 rounded-lg text-xs"
        >
          <IconKey size={14} />
          Connecter compte Deriv
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="Token API Deriv..."
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveToken()}
            className="bg-black/20 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 w-56
                       focus:outline-none focus:border-cyan-500/40 placeholder-zinc-500"
            autoFocus
          />
          <button
            onClick={saveToken}
            disabled={!tokenInput.trim() || loading}
            className="btn btn-strong py-1.5 rounded-lg text-xs disabled:opacity-50"
          >
            {loading ? '...' : 'OK'}
          </button>
          <button
            onClick={() => { setShowTokenInput(false); setTokenInput('') }}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <IconX size={14} />
          </button>
        </div>
      )}
      {error && !showTokenInput && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  )
}
