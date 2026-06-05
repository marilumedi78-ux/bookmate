'use client'

interface BookMateLogoProps {
  size?: number
  className?: string
}

export function BookMateLogo({ size = 40, className }: BookMateLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BookMate logo"
      role="img"
    >
      {/* Left page */}
      <path
        d="M4 8C4 8 8 6 14 6C17 6 19 7 19 8V30C19 30 17 29 14 29C8 29 4 31 4 31V8Z"
        fill="#2A9D8F"
        opacity="0.85"
      />
      {/* Right page */}
      <path
        d="M36 8C36 8 32 6 26 6C23 6 21 7 21 8V30C21 30 23 29 26 29C32 29 36 31 36 31V8Z"
        fill="#2A9D8F"
        opacity="0.85"
      />
      {/* Sound wave bars on left page - equalizer style */}
      <rect x="7" y="16" width="2" height="10" rx="1" fill="white" opacity="0.9" />
      <rect x="11" y="12" width="2" height="18" rx="1" fill="white" opacity="0.9" />
      <rect x="15" y="14" width="2" height="14" rx="1" fill="white" opacity="0.9" />

      {/* Sound wave bars on right page - equalizer style */}
      <rect x="23" y="14" width="2" height="14" rx="1" fill="white" opacity="0.9" />
      <rect x="27" y="12" width="2" height="18" rx="1" fill="white" opacity="0.9" />
      <rect x="31" y="16" width="2" height="10" rx="1" fill="white" opacity="0.9" />

      {/* Book spine center line */}
      <rect x="19.5" y="7" width="1" height="23" rx="0.5" fill="#2A9D8F" opacity="0.5" />
    </svg>
  )
}
