interface StudioLogoProps {
  size?: number;
  className?: string;
}

export function StudioLogo({ size = 32, className }: StudioLogoProps) {
  const radius = Math.round((size / 64) * 16);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Studio"
      role="img"
    >
      <rect width="64" height="64" rx={radius} fill="#1A1A1A" />
      <path
        d="M32 12 L36 28 L52 32 L36 36 L32 52 L28 36 L12 32 L28 28 Z"
        fill="#F59E0B"
      />
    </svg>
  );
}
