import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );
};
