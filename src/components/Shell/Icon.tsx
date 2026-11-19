import type { CSSProperties, ReactNode } from 'react'

/**
 * The app's icon set: SF Symbols-like line icons on a 24px grid (2px round
 * strokes, filled where Apple fills: play, pause, stop). No emoji anywhere.
 */
const F = { fill: 'currentColor', stroke: 'none' } as const

const PATHS = {
  play:         <path {...F} d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10.4-6.8a1 1 0 0 0 0-1.6L9.6 4.4C8.9 3.9 8 4.4 8 5.2z" />,
  pause:        <><rect {...F} x="6" y="4.5" width="4" height="15" rx="1.2" /><rect {...F} x="14" y="4.5" width="4" height="15" rx="1.2" /></>,
  stop:         <rect {...F} x="6" y="6" width="12" height="12" rx="2" />,
  back:         <><path d="M5 5v14" /><path {...F} d="M19 5.9v12.2c0 .8-.9 1.3-1.6.8L8.6 13a1.2 1.2 0 0 1 0-2l8.8-5.9c.7-.5 1.6 0 1.6.8z" /></>,
  forward:      <><path d="M19 5v14" /><path {...F} d="M5 5.9v12.2c0 .8.9 1.3 1.6.8l8.8-5.9a1.2 1.2 0 0 0 0-2L6.6 5.1C5.9 4.6 5 5.1 5 5.9z" /></>,
  rewind:       <path {...F} d="M11.5 6.7v10.6c0 .8-.9 1.3-1.6.8L2.8 13a1.2 1.2 0 0 1 0-2l7.1-5.1c.7-.5 1.6 0 1.6.8zM21.5 6.7v10.6c0 .8-.9 1.3-1.6.8L12.8 13a1.2 1.2 0 0 1 0-2l7.1-5.1c.7-.5 1.6 0 1.6.8z" />,
  fastForward:  <path {...F} d="M2.5 6.7v10.6c0 .8.9 1.3 1.6.8l7.1-5.1a1.2 1.2 0 0 0 0-2L4.1 5.9c-.7-.5-1.6 0-1.6.8zM12.5 6.7v10.6c0 .8.9 1.3 1.6.8l7.1-5.1a1.2 1.2 0 0 0 0-2l-7.1-5.1c-.7-.5-1.6 0-1.6.8z" />,
  more:       <><circle {...F} cx="5.5" cy="12" r="1.8" /><circle {...F} cx="12" cy="12" r="1.8" /><circle {...F} cx="18.5" cy="12" r="1.8" /></>,
  close:        <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  plus:         <path d="M12 5v14M5 12h14" />,
  check:        <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle:  <><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.8 2.8L16.2 9.5" /></>,
  xCircle:      <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  search:       <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20 20" /></>,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  chevronDown:  <path d="M5.5 9.5 12 16l6.5-6.5" />,
  chevronLeft:  <path d="M14.5 5.5 8 12l6.5 6.5" />,
  upDown:       <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  arrowUp:      <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown:    <path d="M12 5v14M6 13l6 6 6-6" />,
  arrowRight:   <path d="M5 12h14M13 6l6 6-6 6" />,
  undo:         <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  pencil:       <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3zM14.5 7.5l2 2" />,
  sliders:      <><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="17" r="2" /></>,
  piano:        <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5v8M12 5v8M16 5v8M8 13v6M12 13v6M16 13v6" /></>,
  mic:          <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  speaker:      <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flex: 'none', ...style }}>
      {PATHS[name]}
    </svg>
  )
}
