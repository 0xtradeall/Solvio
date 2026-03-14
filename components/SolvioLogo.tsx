interface Props {
  size?: number;
  className?: string;
}

export function SolvioLogoIcon({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="#7c3aed" />
      <path
        d="M13 14C13 14 14 12 20 12C26 12 27 15 27 17C27 19.5 25 21 20 21C15 21 13 22.5 13 25C13 27.5 15 28 20 28C25 28 27 26 27 26"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="8" r="4" fill="#0d9488" opacity="0.9" />
    </svg>
  );
}

export function SolvioLogo({ size = 32, showWordmark = true, wordmarkColor = 'text-gray-900', className = '' }: Props & { showWordmark?: boolean; wordmarkColor?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <SolvioLogoIcon size={size} />
      {showWordmark && (
        <span className={`font-extrabold tracking-tight ${wordmarkColor}`} style={{ fontSize: size * 0.6 }}>
          Solvio
        </span>
      )}
    </span>
  );
}
