import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/site';

const PAGE_TITLES: Record<string, string> = {
  overview: 'Home',
  dynamic_world: 'Land Cover',
  esri: 'Regional Land Cover',
  trends: 'Trend Analysis',
  inference: 'GeoSatLens',
  export: 'Reports and Data',
  about: 'About',
  data: 'Data & Credits',
  privacy: 'Privacy',
  '404': 'Page Not Found',
};

/**
 * Sets document.title based on the current active tab.
 */
export function usePageTitle(activeTab: string): void {
  useEffect(() => {
    const pageLabel = PAGE_TITLES[activeTab] || 'GeoSat';
    document.title = `${pageLabel} · ${SITE_CONFIG.appName}`;
  }, [activeTab]);
}
