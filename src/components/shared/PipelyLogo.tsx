import { cn } from "@/lib/utils";

export function PipelyAppIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="Pipely"
      className={className}
    >
      <rect width="512" height="512" rx="112" fill="#2563EB" />
      <g transform="translate(112, 128)">
        <path
          d="M 20 240 Q 100 240 150 150 Q 200 60 280 50"
          stroke="#FFFFFF"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="20" cy="240" r="28" fill="#FFFFFF" opacity="0.7" />
        <circle cx="150" cy="150" r="38" fill="#FFFFFF" opacity="0.85" />
        <circle cx="280" cy="50" r="50" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export function PipelyWordmark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      height={24}
      role="img"
      aria-label="Pipely"
      className={cn("w-auto", className)}
    >
      <g transform="translate(8, 12)">
        <path
          d="M 8 56 Q 28 56 44 36 Q 60 16 82 14"
          stroke="#2563EB"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle cx="8" cy="56" r="5.5" fill="#1E40AF" />
        <circle cx="44" cy="36" r="7.5" fill="#2563EB" />
        <circle cx="82" cy="14" r="10.5" fill="#14B8A6" />
      </g>
      <text
        x="118"
        y="58"
        fontFamily="Inter, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontSize="48"
        fontWeight="500"
        fill="#0F172A"
        letterSpacing="-1.2"
      >
        Pipely
      </text>
    </svg>
  );
}

export function PipelyWordmarkDark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      height={24}
      role="img"
      aria-label="Pipely"
      className={cn("w-auto", className)}
    >
      <g transform="translate(8, 12)">
        <path
          d="M 8 56 Q 28 56 44 36 Q 60 16 82 14"
          stroke="#60A5FA"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="8" cy="56" r="5.5" fill="#60A5FA" />
        <circle cx="44" cy="36" r="7.5" fill="#3B82F6" />
        <circle cx="82" cy="14" r="10.5" fill="#2DD4BF" />
      </g>
      <text
        x="118"
        y="58"
        fontFamily="Inter, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontSize="48"
        fontWeight="500"
        fill="#F8FAFC"
        letterSpacing="-1.2"
      >
        Pipely
      </text>
    </svg>
  );
}

export function PipelyFavicon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Pipely"
      className={className}
    >
      <circle cx="10" cy="50" r="6" fill="#1E40AF" />
      <circle cx="32" cy="32" r="8" fill="#2563EB" />
      <circle cx="54" cy="12" r="10" fill="#14B8A6" />
    </svg>
  );
}
