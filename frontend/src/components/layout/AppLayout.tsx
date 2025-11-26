import React from 'react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-full bg-slate-950 text-white px-4 font-sans">
      <main className="container mx-auto max-w-md pb-[calc(4.5rem+var(--tg-safe-area-bottom))]">
        {children}
      </main>
    </div>
  );
};
