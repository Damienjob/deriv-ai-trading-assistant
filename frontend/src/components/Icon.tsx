import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { size?: number }

function s(props: Props) {
  return { width: props.size ?? 16, height: props.size ?? 16, ...props }
}

export function IconBolt(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h8l-1 8 11-14h-8l1-6Z" />
    </svg>
  )
}

export function IconBell(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    </svg>
  )
}

export function IconBellOff(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h14" />
      <path d="M2 2l20 20" />
    </svg>
  )
}

export function IconCheck(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

export function IconClock(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function IconInfo(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

export function IconKey(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2l-2 2m-2 2-2 2" />
      <path d="M7.5 14.5a4.5 4.5 0 1 1 3.18-7.68A4.5 4.5 0 0 1 7.5 14.5Z" />
      <path d="M10.7 9.3 21 19.6V22h-2.4l-1.2-1.2-1.2 1.2H14v-2.4l1.2-1.2-1.2-1.2H11.6L10 15.6" />
    </svg>
  )
}

export function IconLock(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function IconX(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export function IconPin(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s6-5.33 6-10a6 6 0 0 0-12 0c0 4.67 6 10 6 10Z" />
      <path d="M12 11a2 2 0 1 0-2-2 2 2 0 0 0 2 2Z" />
    </svg>
  )
}

export function IconRefresh(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 1-15 6.36" />
      <path d="M3 12a9 9 0 0 1 15-6.36" />
      <path d="M21 19v-7h-7" />
      <path d="M3 5v7h7" />
    </svg>
  )
}

export function IconShieldAlert(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

export function IconChevronDown(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconChevronUp(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

export function IconChevronRight(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function IconArrowUp(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}

export function IconArrowDown(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  )
}

export function IconArrowsLeftRight(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12H3" />
      <path d="m7 16-4-4 4-4" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  )
}

export function IconMinus(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}

export function IconPlus(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function IconBan(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  )
}

export function IconHelpCircle(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" />
      <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function IconStar(props: Props) {
  return (
    <svg {...s(props)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11.03 2.63a1 1 0 0 1 1.94 0l2.1 6.48a1 1 0 0 0 .95.69h6.81a1 1 0 0 1 .59 1.81l-5.51 4a1 1 0 0 0-.36 1.12l2.1 6.48a1 1 0 0 1-1.54 1.12l-5.51-4a1 1 0 0 0-1.18 0l-5.51 4a1 1 0 0 1-1.54-1.12l2.1-6.48a1 1 0 0 0-.36-1.12l-5.51-4a1 1 0 0 1 .59-1.81h6.81a1 1 0 0 0 .95-.69Z" />
    </svg>
  )
}
