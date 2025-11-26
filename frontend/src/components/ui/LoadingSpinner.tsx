import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  className = '',
  fullScreen = false 
}) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
        <Loader2 className={`animate-spin text-blue-500 ${className}`} size={size} />
      </div>
    );
  }
  
  return (
    <Loader2 className={`animate-spin text-blue-500 ${className}`} size={size} />
  );
};
