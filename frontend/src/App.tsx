import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/common/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Footer } from './components/common/Footer';
import { ApiOfflineBanner } from './components/common/ApiOfflineBanner';
import { usePageTitle } from './hooks/usePageTitle';
import { ChangeAnalyticsPage } from './components/trends/ChangeAnalyticsPage';
import { ReportsExportPage } from './components/export/ReportsExportPage';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { DynamicWorldDashboard } from './components/dynamic_world/DynamicWorldDashboard';
import { EsriLandCoverDashboard } from './components/esri/EsriLandCoverDashboard';
import { NotFoundPage } from './pages/NotFoundPage';

import {
  checkHealth,
  fetchAvailableCities,
} from './api/client';
import type { HealthResponse } from './api/types';

// ── Utility pages (lazy-loaded at module level to keep bundle simple) ──
import { AboutPage } from './pages/AboutPage';
import { DataPage } from './pages/DataPage';
import { PrivacyPage } from './pages/PrivacyPage';

/** Tabs that are real app views (shown in Navbar) */
const APP_TABS = new Set(['overview', 'dynamic_world', 'esri', 'trends', 'export']);

/** Utility pages served at /about, /data, /privacy */
const UTILITY_PATHS: Record<string, string> = {
  about: 'about',
  data: 'data',
  privacy: 'privacy',
};

function resolveInitialPage(): string {
  const path = window.location.pathname.replace(/^\//, '').toLowerCase();
  if (UTILITY_PATHS[path]) return UTILITY_PATHS[path];
  if (APP_TABS.has(path)) return path;
  // ?tab= param (legacy) — no longer written, just consumed if present
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam && APP_TABS.has(tabParam)) return tabParam;
  if (path === '' || path === 'index.html') return 'overview';
  if (path === 'style-guide') return 'style-guide'; // handled in main.tsx
  return '404';
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(resolveInitialPage);
  const [explorerCity, setExplorerCity] = useState<string | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Sync URL path when switching between utility pages and app tabs
  const navigate = (tab: string) => {
    const isUtility = UTILITY_PATHS[tab];
    const newPath = isUtility ? `/${tab}` : '/';
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath + window.location.search);
    }
    setActiveTab(tab);
  };

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => setActiveTab(resolveInitialPage());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load backend cities
  useEffect(() => {
    const loadCities = async () => {
      try {
        const cities = await fetchAvailableCities();
        setAvailableCities(cities);
        setSelectedCity((prev) => {
          if (cities.length > 0 && !cities.includes(prev)) {
            return cities[0];
          }
          return prev;
        });
      } catch {
        setAvailableCities([]);
      }
    };
    loadCities();
  }, []);

  const retryHealth = useCallback(async () => {
    try {
      const healthRes = await checkHealth();
      setHealth(healthRes);
    } catch {
      setHealth({ status: 'offline', inference_enabled: false });
    }
  }, []);

  // Load API health status
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const healthRes = await checkHealth();
        setHealth(healthRes);
      } catch {
        setHealth({ status: 'offline', inference_enabled: false });
      }
    };
    loadInitialData();
  }, [selectedCity, availableCities, activeTab]);

  // Set document title
  usePageTitle(activeTab);

  const isUtility = UTILITY_PATHS[activeTab];

  return (
    <ErrorBoundary onGoHome={() => navigate('overview')}>
      <div className="min-h-screen bg-background text-foreground font-sans transition-colors">
        {/* Background Subtle Grid Texture */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 65%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 65%, transparent 100%)',
          }}
        />

        {/* Top Navigation Bar */}
        <Navbar activeTab={activeTab} setActiveTab={navigate} />

        {/* Main Container */}
        <main className={`relative z-10 py-8 px-4 sm:px-6 lg:px-8 mx-auto font-sans ${isUtility ? 'max-w-4xl' : 'max-w-[1700px]'}`}>
          {!isUtility && activeTab !== '404' && health?.status === 'offline' && (
            <div className="mb-6">
              <ApiOfflineBanner
                compact
                message="Backend API is offline or unreachable. Live data may be unavailable."
                onRetry={retryHealth}
              />
            </div>
          )}

          {/* UTILITY PAGES */}
          {activeTab === 'about' && <AboutPage onNavigate={navigate} />}
          {activeTab === 'data' && <DataPage onNavigate={navigate} />}
          {activeTab === 'privacy' && <PrivacyPage onNavigate={navigate} />}
          {activeTab === '404' && <NotFoundPage onNavigate={navigate} />}

          {/* VIEW 1: Overview Landing Page */}
          {activeTab === 'overview' && (
            <div className="w-full animate-fadeIn">
              <OverviewDashboard
                onNavigate={(tab, region) => {
                  if (region) setExplorerCity(region);
                  navigate(tab);
                }}
              />
            </div>
          )}

          {/* VIEW 2: Dynamic World (Land Cover Explorer) */}
          {activeTab === 'dynamic_world' && (
            <div className="w-full animate-fadeIn">
              <DynamicWorldDashboard initialCity={explorerCity} />
            </div>
          )}

          {/* VIEW: Esri Land Cover (2019-2025 Regional Intelligence) */}
          {activeTab === 'esri' && (
            <div className="w-full animate-fadeIn">
              <EsriLandCoverDashboard />
            </div>
          )}

          {/* VIEW 4: Change Analytics */}
          {activeTab === 'trends' && <ChangeAnalyticsPage />}

          {/* VIEW 6: Reports & Export */}
          {activeTab === 'export' && <ReportsExportPage />}
        </main>
        <Footer onNavigate={navigate} />
      </div>
    </ErrorBoundary>
  );
};

export default App;
