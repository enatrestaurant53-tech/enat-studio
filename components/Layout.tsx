import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen font-sans text-stone-100 selection:bg-orange-500 selection:text-white pb-20 md:pb-0 overflow-x-hidden bg-stone-900">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Cinematic Background Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center animate-ken-burns opacity-30"
            style={{ 
                backgroundImage: `url('https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=1920&auto=format&fit=crop')` 
            }}
        ></div>
        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/90 via-stone-950/80 to-stone-950/90 backdrop-blur-[2px]"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};