import React, { useRef } from 'react';

const Footer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playClickSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  };

  return (
    <footer className="app-footer text-center text-xs py-4 mt-8" 
      style={{ 
        borderTop: '1px solid',
        borderColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
        color: 'color-mix(in srgb, var(--theme-text) 60%, transparent)'
      }}
    >
      <audio ref={audioRef} className="hidden" preload="auto">
        <source src="/assets/clack.mp3" type="audio/mpeg" />
      </audio>
      <p className="mb-2">
        Vibe coded with Claude. &copy; {new Date().getFullYear()}
      </p>
      <p className="mb-3">
        <a 
          href="https://discord.gg/hKRJ4NT6Sq" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-medium inline-flex items-center transition-colors hover:opacity-80"
          style={{ color: 'var(--theme-primary)' }}
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3847-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
          </svg>
          Reach out on Discord
        </a>
      </p>
      <div className="flex justify-center mt-3 relative">
        <div 
          className="keycap-button overflow-hidden z-10 group hover:-translate-y-[1px] hover:shadow-lg active:translate-y-[1px] active:shadow-sm transition-all duration-75"
          style={{
            // Key cap sizing
            width: '190px',
            height: '45px',
            display: 'grid',
            gridTemplateColumns: 'var(--b-side) minmax(0, auto) var(--b-side)',
            gridTemplateRows: 'var(--b-top) minmax(0, auto) var(--b-bottom)',
            padding: 'var(--gutter)',
            position: 'relative',
            fontFamily: 'Heros, Inter, Helvetica, Arial',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            borderRadius: 'var(--r-base)',
            // Custom yellow key colors
            '--base': '#FFDD00',
            '--lightest': '#fff6cc',
            '--lighter': '#ffea80',
            '--dark': '#e6c700', 
            '--darker': '#ccb100',
            '--darkest': '#b39c00',
            '--shadow': '#806f00',
            backgroundColor: 'var(--shadow)',
            textShadow: '0 0 2px var(--darker)',
            color: '#000000',
            userSelect: 'none',
            textAlign: 'center',
            transform: 'translateZ(1px)',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.15)'
          }}
        >
          {/* Key Base */}
          <div 
            className="z-10"
            style={{
              gridColumn: '1/-1',
              gridRow: '1/-1',
              background: 'var(--darker)',
              borderStyle: 'solid',
              borderWidth: 'var(--b-top) var(--b-side) var(--b-bottom)',
              borderColor: 'var(--dark) var(--darker) var(--darkest)',
              borderRadius: 'var(--r-base)'
            }}
          ></div>
          {/* Key Top */}
          <div 
            className="z-20 transition-all duration-150 ease-in-out group-hover:brightness-110 group-active:transform group-active:translate-y-[2px]"
            style={{
              gridColumn: '2',
              gridRow: '2',
              margin: 'calc(var(--accent)*-1) calc(var(--accent)*-1) 0',
              border: 'var(--accent) solid var(--lightest)',
              borderBottom: 'none',
              backgroundColor: 'var(--base)',
              borderRadius: 'var(--r-top)'
            }}
          ></div>
          {/* Legend Text (Coffee) - Main Center */}
          <div 
            className="z-30 transition-transform group-active:transform group-active:translate-y-[1px]"
            style={{
              gridColumn: '2/3',
              gridRow: '2/3',
              placeSelf: 'center',
              fontSize: 'var(--l-medium)',
              lineHeight: '90%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              pointerEvents: 'none'
            }}
          >
            <span className="mr-2" role="img" aria-label="coffee">☕</span>
            <span>Buy me a coffee</span>
          </div>

          {/* Small legend - Corner */}
          <span 
            className="z-30 font-mono text-black/30"
            style={{ 
              fontSize: '7px',
              gridColumn: '3',
              gridRow: '1',
              placeSelf: 'start end',
              padding: '2px 4px',
              pointerEvents: 'none',
              opacity: 0.3
            }}
          >
            BMC
          </span>

          {/* Clickable link area - invisible but covers entire key */}
          <a 
            href="https://www.buymeacoffee.com/jaysobel" 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={playClickSound}
            className="absolute inset-0 z-40"
            aria-label="Buy me a coffee"
          ></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 