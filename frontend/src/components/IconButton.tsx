import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet'

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children' | 'title'
> {
  icon: ReactNode
  label: string
  tooltip?: string
  variant?: IconButtonVariant
}

export function IconButton({
  className,
  icon,
  label,
  tooltip,
  type = 'button',
  variant = 'secondary',
  ...buttonProps
}: IconButtonProps) {
  const tooltipText = tooltip ?? label
  const buttonClassName = [
    'icon-button',
    `icon-button-${variant}`,
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      {...buttonProps}
      aria-label={label}
      className={buttonClassName}
      data-tooltip={tooltipText}
      title={tooltipText}
      type={type}
    >
      <span aria-hidden="true" className="icon-button-symbol">{icon}</span>
    </button>
  )
}
