export default function ScanningEffect() {
  return (
    <>
             <style jsx global>{`
        @keyframes scan-horizontal {
          0% { 
            top: 0; 
            opacity: 0; 
          }
          10% { 
            opacity: 0.8; 
          }
          90% { 
            opacity: 0.8; 
          }
          100% { 
            top: 100%; 
            opacity: 0; 
          }
        }

        .animate-scan-horizontal {
          animation: scan-horizontal 3s ease-in-out infinite;
        }
      `}</style>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden" role="status" aria-live="polite">
        {/* Scanning line */}
        <div className="absolute inset-0">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-horizontal" />
        </div>

        {/* Corner brackets */}
        <div className="absolute inset-6">
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-emerald-400/60" />
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-emerald-400/60" />
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-emerald-400/60" />
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-emerald-400/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <p className="text-sm text-white/90 font-mono tracking-wide">
            PROCESSING
          </p>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    </>
  );
} 