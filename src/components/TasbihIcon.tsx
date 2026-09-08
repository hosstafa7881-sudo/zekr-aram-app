import React from 'react';

/** Custom prayer-beads (tasbih) icon — lucide-react has no equivalent, and a plain 📿 emoji can't be recolored. */
export const TasbihIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="10" r="1.6" />
    <circle cx="16.2" cy="11.3" r="1.6" />
    <circle cx="17.6" cy="15.4" r="1.6" />
    <circle cx="14.8" cy="18.7" r="1.6" />
    <circle cx="10.4" cy="18.9" r="1.6" />
    <circle cx="7.4" cy="15.8" r="1.6" />
    <circle cx="7.8" cy="11.5" r="1.6" />
    <path d="M12.6 18.9c.3 1.1.4 2.3.1 3.4" />
    <circle cx="12.9" cy="22.3" r="1.1" />
  </svg>
);
