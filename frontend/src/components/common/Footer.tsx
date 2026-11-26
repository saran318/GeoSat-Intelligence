import React from 'react';
import { Info, Database, ShieldCheck, ExternalLink } from 'lucide-react';
import { SITE_CONFIG } from '../../config/site';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const year = new Date().getFullYear();

  const links = [
    { label: 'About', tab: 'about', icon: <Info className="h-3.5 w-3.5" /> },
    { label: 'Data & Credits', tab: 'data', icon: <Database className="h-3.5 w-3.5" /> },
    { label: 'Privacy', tab: 'privacy', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <footer className="relative z-10 mt-16 border-t border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Brand + Version */}
        <div className="flex items-center gap-2.5 text-xs font-mono text-muted-foreground">
          <img
            src="/logo.svg"
            alt="GeoSat Intelligence logo"
            width={37}
            height={36}
            className="h-9 w-auto object-contain dark:invert dark:hue-rotate-180"
          />
          <span className="sr-only">{SITE_CONFIG.appName}</span>
          <span>v{SITE_CONFIG.version}</span>
          <span className="text-border">·</span>
          <span>© {year}</span>
        </div>

        {/* Center: Utility page links */}
        <nav className="flex items-center gap-1 flex-wrap justify-center">
          {links.map(({ label, tab, icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              {icon}
              {label}
            </button>
          ))}
          <a
            href={SITE_CONFIG.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
