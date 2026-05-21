"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-[#0f0f23] dark:to-[#1a1a2e] p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 80" width="64" height="54" className="mb-6 opacity-60">
        <path d="M 8 64 Q 28 64 44 42 Q 60 20 84 16" stroke="#2563EB" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.3"/>
        <circle cx="8" cy="64" r="7" fill="#1E40AF"/>
        <circle cx="44" cy="42" r="9" fill="#2563EB"/>
        <circle cx="84" cy="16" r="12" fill="#14B8A6"/>
      </svg>

      <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
        Sei offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[#64748b] dark:text-[#94a3b8]">
        Pipely ha bisogno di una connessione internet per funzionare.
        Controlla la tua rete e riprova.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-[#1d4ed8] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
        Riprova
      </button>
    </div>
  );
}
