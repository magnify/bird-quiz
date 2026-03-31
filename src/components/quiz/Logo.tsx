export function LogoSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10C30 10 15 30 15 50C15 70 30 90 50 90C55 90 60 85 58 80C56 75 60 72 65 72C70 72 75 68 75 60C75 35 65 10 50 10Z" fill="currentColor" opacity="0.2"/>
      <path d="M25 45C25 45 35 25 55 20C55 20 45 35 50 50C55 65 40 75 30 65C20 55 25 45 25 45Z" fill="currentColor" opacity="0.4"/>
      <circle cx="38" cy="42" r="3" fill="currentColor"/>
      <path d="M20 48L10 45L22 50Z" fill="currentColor" opacity="0.6"/>
    </svg>
  )
}

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'medium', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-7 h-7',
    large: 'w-12 h-12',
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} text-[var(--quiz-accent)] flex-shrink-0`}>
        <LogoSvg />
      </div>
      {showText && (
        <span className="font-bold text-base tracking-tight bg-gradient-to-br from-[var(--quiz-foreground)] to-[var(--quiz-accent)] bg-clip-text text-transparent">
          Fugle Quiz
        </span>
      )}
    </div>
  )
}
