export function TicTacToeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="6" fill="url(#gradient)" />
      <line x1="11" y1="4" x2="11" y2="28" stroke="#E2E8F0" strokeWidth="2" />
      <line x1="21" y1="4" x2="21" y2="28" stroke="#E2E8F0" strokeWidth="2" />
      <line x1="4" y1="11" x2="28" y2="11" stroke="#E2E8F0" strokeWidth="2" />
      <line x1="4" y1="21" x2="28" y2="21" stroke="#E2E8F0" strokeWidth="2" />
      <defs>
        <linearGradient
          id="gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
