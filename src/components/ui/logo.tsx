interface LogoMarkProps {
  size?: number
  accent?: boolean
  className?: string
}

/**
 * LogoMark — ícone da plataforma Social Manager
 * 3 barras verticais (pilar de conteúdo) + dot (sinal de broadcast)
 * Branco puro ou com barra central vermelha (accent)
 */
export function LogoMark({ size = 24, accent = false, className }: LogoMarkProps) {
  const centerColor = accent ? 'var(--primary)' : 'currentColor'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Social Manager"
    >
      {/* Barra esquerda - media */}
      <rect x="3" y="11" width="3" height="11" rx="1.5" fill="currentColor" />
      {/* Barra central - mais alta */}
      <rect x="9" y="5" width="3" height="17" rx="1.5" fill={centerColor} />
      {/* Barra direita - curta */}
      <rect x="15" y="15" width="3" height="7" rx="1.5" fill="currentColor" />
      {/* Dot acima da barra central - sinal de broadcast */}
      <circle cx="10.5" cy="2.5" r="1.5" fill={centerColor} />
    </svg>
  )
}
