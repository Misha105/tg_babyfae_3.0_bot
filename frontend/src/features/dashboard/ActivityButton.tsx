import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ActivityButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  lastActivityTime?: string;
  color?: string;
  isActive?: boolean; // For sleep toggle
}

export const ActivityButton: React.FC<ActivityButtonProps> = ({
  label,
  icon: Icon,
  onClick,
  lastActivityTime,
  color = 'bg-slate-800',
  isActive = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-95 w-full aspect-square ${
        isActive ? 'bg-indigo-600 ring-2 ring-indigo-400' : color
      } hover:opacity-90 relative overflow-hidden`}
    >
      <Icon size={32} className="mb-2 text-white drop-shadow-md relative z-10" />
      <span className="font-bold text-white text-sm drop-shadow-md relative z-10 text-center leading-tight">{label}</span>
      {lastActivityTime && (
        <span className="text-[10px] leading-tight text-white/90 mt-1 drop-shadow-md font-medium relative z-10 px-1">{lastActivityTime}</span>
      )}
    </button>
  );
};
