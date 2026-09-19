import Image from 'next/image'
import Link from 'next/link'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<Size, { box: string; px: number }> = {
  sm: { box: 'h-8 w-8', px: 32 },
  md: { box: 'h-10 w-10', px: 40 },
  lg: { box: 'h-14 w-14', px: 56 },
  xl: { box: 'h-28 w-28', px: 112 },
}

interface BrandLogoProps {
  size?: Size
  href?: string | null
  className?: string
  priority?: boolean
}

export function BrandLogo({
  size = 'md',
  href = '/',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const { box, px } = sizes[size]

  const mark = (
    <span
      className={`relative ${box} flex-shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Stanza — 2D Art & Classical Music Lessons Online"
        width={px}
        height={px}
        className="object-contain p-0.5"
        priority={priority}
      />
    </span>
  )

  if (href === null) return mark
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Stanza home">
      {mark}
    </Link>
  )
}
