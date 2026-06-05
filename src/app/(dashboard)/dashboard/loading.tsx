import { Flame } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#070708] text-gray-100 pb-24 md:pb-8 font-sans">
      
      {/* 🚀 1. SKELETON HEADER (Desktop) */}
      <header className="hidden md:flex justify-between items-center px-6 py-4 bg-[#111113] border border-gray-800/80 rounded-2xl mx-4 mt-4 shadow-lg animate-pulse">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
            <Flame size={18} className="text-gray-650" />
          </div>
          <div className="h-4 w-40 bg-gray-800 rounded-md"></div>
        </div>
        <div className="flex space-x-2 bg-[#050506] p-1 rounded-xl border border-gray-800">
          <div className="w-24 h-8 bg-gray-800 rounded-lg"></div>
          <div className="w-24 h-8 bg-gray-800 rounded-lg"></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:px-4 md:py-8 space-y-6 mt-2 md:mt-0">
        
        {/* 🚀 2. SKELETON PROFILE CARD */}
        <section className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-pulse">
          <div className="h-6 w-48 bg-gray-800 rounded-md mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#0a0a0b]/60 p-4 rounded-2xl border border-gray-800 space-y-3">
                <div className="h-3 w-16 bg-gray-800 rounded-md"></div>
                <div className="h-6 w-24 bg-gray-800 rounded-md"></div>
                <div className="h-3 w-32 bg-gray-800 rounded-md"></div>
              </div>
            ))}
          </div>
        </section>

        {/* 🚀 3. SKELETON SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111113] border border-gray-800 rounded-3xl p-5 space-y-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-8 w-20 bg-gray-800 rounded-md"></div>
                <div className="h-3 w-28 bg-[#111113] bg-opacity-0"></div> {/* Spacer */}
                <div className="h-3 w-28 bg-gray-800 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>

        {/* 🚀 4. SKELETON CHART ZONE */}
        <div className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-6 w-36 bg-gray-800 rounded-md"></div>
            <div className="flex space-x-2 bg-[#050506] p-1 rounded-xl border border-gray-800">
              <div className="w-14 h-7 bg-gray-800 rounded-lg"></div>
              <div className="w-14 h-7 bg-gray-800 rounded-lg"></div>
            </div>
          </div>
          <div className="h-60 w-full bg-[#050506]/40 rounded-2xl border border-gray-850"></div>
        </div>

      </div>
    </div>
  );
}
