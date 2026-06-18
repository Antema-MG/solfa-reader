import type { ReactNode } from 'react'
import type { KeyboardVariant } from '../../types/music'

interface Props {
  variant: KeyboardVariant
  /** Instrument display name (shown on piano/melodic headers). */
  label?: string
  /** Optional inline SVG path for the melodic-variant instrument icon. */
  icon?: string
  children: ReactNode
}

/**
 * Frames the keybed with a variant-specific skin:
 *  - organ   : engraved UPPER / PEDALS / LOWER header on wood
 *  - piano   : minimal lacquer header with instrument name
 *  - melodic : neutral frame with an instrument icon + name
 * Skin tokens live in CSS (.kb-chrome[data-variant=…]); markup is shared.
 */
export default function KeyboardChrome({ variant, label, icon, children }: Props) {
  return (
    <div className="kb-chrome" data-variant={variant}>
      <div className="kb-header">
        {variant === 'organ' ? (
          <>
            <span className="seg" style={{ paddingLeft: 0 }}>Upper</span>
            <span className="filet" />
            <span className="seg">Pedals</span>
            <span className="filet" />
            <span className="seg">Lower</span>
            {label && <span className="seg" style={{ marginLeft: 'auto', opacity: .8 }}>{label}</span>}
          </>
        ) : (
          <>
            {variant === 'melodic' && icon && (
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 8, fill: 'currentColor' }} aria-hidden>
                <path d={icon} />
              </svg>
            )}
            <span className="seg" style={{ paddingLeft: 0, letterSpacing: '.14em' }}>
              {label ?? (variant === 'piano' ? 'Piano' : 'Instrument')}
            </span>
          </>
        )}
      </div>
      {children}
    </div>
  )
}
