import React from 'react';
import { Database, Map, Globe, Layers, ExternalLink } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';

interface DataPageProps {
  onNavigate: (tab: string) => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon, title, children,
}) => (
  <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
      <span className="text-primary">{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

const AttributionRow: React.FC<{
  name: string;
  owner: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}> = ({ name, owner, license, licenseUrl, sourceUrl }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-border/40 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="text-xs text-muted-foreground">© {owner}</p>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <a
        href={licenseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
      >
        {license}
        <ExternalLink className="h-3 w-3" />
      </a>
      <span className="text-border">·</span>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground"
      >
        Source
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  </div>
);

export const DataPage: React.FC<DataPageProps> = ({ onNavigate: _onNavigate }) => {
  return (
    <div className="flex flex-col gap-6 py-4 animate-fadeIn">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-primary">
          <Database className="h-4 w-4" />
          <span>Data Sources &amp; Credits</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Data &amp; Credits
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          GeoSat Intelligence uses publicly available geospatial datasets. Attribution for each source is listed
          below; please follow each dataset's licence terms when using or redistributing data obtained through
          this application.
        </p>
      </div>

      {/* Satellite & Land-Cover */}
      <Section icon={<Layers className="h-4 w-4" />} title="Satellite Imagery & Land Cover">
        <AttributionRow
          name="Esri 10m Annual Land Cover (2019–2025)"
          owner="Esri · Impact Observatory"
          license="Esri Master Agreement / Data Attribution"
          licenseUrl={SITE_CONFIG.links.esriLicense}
          sourceUrl={SITE_CONFIG.links.esriLandCover}
        />
        <AttributionRow
          name="Sentinel-2 Level-2A Surface Reflectance"
          owner="European Space Agency (ESA)"
          license="Copernicus Open Access (check licence)"
          licenseUrl={SITE_CONFIG.links.sentinel2License}
          sourceUrl={SITE_CONFIG.links.sentinel2}
        />
        <p className="text-xs text-muted-foreground pt-1">
          The Esri Land Cover product is a derivative of Sentinel-2 imagery. Use of this data in a commercial
          product may require an Esri subscription. Check the{' '}
          <a href={SITE_CONFIG.links.esriLicense} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80">Esri attribution page</a>{' '}
          for current terms.
        </p>
      </Section>

      {/* Boundaries */}
      <Section icon={<Map className="h-4 w-4" />} title="District Boundaries">
        <AttributionRow
          name="Tamil Nadu District Boundary GeoJSON"
          owner="karthi209"
          license="Check licence"
          licenseUrl={SITE_CONFIG.links.shapefileProjectLicense}
          sourceUrl={SITE_CONFIG.links.shapefileProject}
        />
        <p className="text-xs text-muted-foreground pt-1">
          Boundary files are sourced from{' '}
          <a href={SITE_CONFIG.links.shapefileProject} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80">
            karthi209/the-shapefile-project
          </a>{' '}
          on GitHub. The repository's licence covers redistribution; check it before reuse.
        </p>
      </Section>

      {/* Mapping Libraries */}
      <Section icon={<Globe className="h-4 w-4" />} title="Mapping Libraries & Base Maps">
        <AttributionRow
          name="OpenStreetMap"
          owner="OpenStreetMap contributors"
          license="ODbL"
          licenseUrl={SITE_CONFIG.links.openstreetmap}
          sourceUrl={SITE_CONFIG.links.openstreetmap}
        />
        <AttributionRow
          name="Leaflet"
          owner="Vladimir Agafonkin et al."
          license="BSD 2-Clause"
          licenseUrl={SITE_CONFIG.links.leafletLicense}
          sourceUrl={SITE_CONFIG.links.leaflet}
        />
        <p className="text-xs text-muted-foreground pt-1">
          Map tiles in the interactive viewer are served via OpenStreetMap. Leaflet is the open-source
          JavaScript library used to render them. Both are free and open source; attribution must be retained
          in any derivative work.
        </p>
      </Section>

      {/* Dynamic World note */}
      <Section icon={<Layers className="h-4 w-4" />} title="Dynamic World (Land Cover)">
        <p>
          The Land Cover tab uses{' '}
          <strong className="text-foreground">Dynamic World</strong>, a near-real-time 10 m global land-use
          dataset produced by Google and the World Resources Institute (WRI) using Sentinel-2. It is available
          on Google Earth Engine under the{' '}
          <a href="https://earthengine.google.com/terms" target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80">
            Google Earth Engine Terms of Service
          </a>. Data is served from the app's own backend, which downloads and caches it from GEE.
        </p>
      </Section>
    </div>
  );
};

export default DataPage;
