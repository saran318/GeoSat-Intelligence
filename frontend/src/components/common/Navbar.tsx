import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Menu,
  X,
  Layers,
  BarChart3,
  FileText,
  Globe2,
} from 'lucide-react';
interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: 'overview', label: 'Home', icon: Layers },
    { id: 'dynamic_world', label: 'Land Cover', icon: Globe2 },
    { id: 'trends', label: 'Trend Analysis', icon: BarChart3 },
    { id: 'export', label: 'Reports and Data', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/95 dark:bg-card/90 backdrop-blur-md transition-colors font-sans select-none shadow-2xs">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/logo.svg"
            alt="GeoSat Intelligence logo"
            width={50}
            height={48}
            className="h-12 w-auto object-contain dark:invert dark:hue-rotate-180"
          />
          <h1 className="sr-only">GeoSat Intelligence</h1>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                type="button"
                className={`relative px-3.5 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'text-primary font-bold bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Theme Toggle */}
        <div className="flex items-center gap-3 shrink-0">

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-9 w-9 rounded-xl border border-border/70 hover:bg-muted/70 text-foreground transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            type="button"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-primary" />
            )}
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-9 w-9 rounded-xl border border-border/70 hover:bg-muted text-foreground flex items-center justify-center cursor-pointer"
            aria-label="Open navigation menu"
            type="button"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/80 bg-card px-4 py-3 space-y-1 animate-fadeIn">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                type="button"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Navbar;
