/**
 * Fonctions de formatage centralisées.
 * Tous les prix s'affichent avec 4 décimales.
 * Les montants en dollars et pourcentages restent à 2 décimales.
 */

/** Prix de marché — toujours 4 décimales : 90.4258 */
export const formatPrice = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return value.toFixed(4)
}

/** Montant en dollars — 2 décimales : 2.50$ */
export const formatAmount = (value: number | null | undefined, currency = '$'): string => {
  if (value == null) return '—'
  return `${value.toFixed(2)}${currency}`
}

/** Pourcentage — 2 décimales : +3.14% */
export const formatPct = (value: number | null | undefined, showSign = false): string => {
  if (value == null) return '—'
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/** Variation de prix avec signe — +0.0023 */
export const formatPriceDiff = (value: number | null | undefined): string => {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(4)}`
}

/** RSI, MACD histogram — 2 décimales */
export const formatIndicator = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return value.toFixed(2)
}

/** MACD line / signal — 4 décimales */
export const formatMacd = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return value.toFixed(4)
}
