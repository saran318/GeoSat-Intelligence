import React from 'react';
import { Satellite, Brain, Database, Code2, AlertTriangle, ExternalLink, User } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';

interface AboutPageProps {
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

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono bg-primary/10 text-primary border border-primary/20">
    {children}
  </span>
);

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate: _onNavigate }) => {
  return (
    <div className="flex flex-col gap-6 py-4 animate-fadeIn">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <img
          src="/logo.svg"
          alt="GeoSat Intelligence logo"
          width={99}
          height={96}
          className="h-20 sm:h-24 w-auto object-contain shrink-0 dark:invert dark:hue-rotate-180"
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-primary">
            <span>GeoSat Intelligence · v{SITE_CONFIG.version}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            About the Project
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {SITE_CONFIG.description}
          </p>
        </div>
      </div>

      {/* Purpose */}
      <Section icon={<Satellite className="h-4 w-4" />} title="Purpose">
        <p>
          GeoSat Intelligence tracks annual land-cover change across Tamil Nadu districts from 2019 to 2025.
          It combines satellite imagery, ML classification, and interactive maps to let researchers, planners,
          and citizens explore how the landscape — urban areas, forests, cropland, and water bodies — has
          shifted over time.
        </p>
        <p>
          The project was built as an end-to-end geospatial ML system: data acquisition from Google Earth
          Engine, model training on a custom labelled dataset, a FastAPI inference backend, and a React + Vite
          frontend serving interactive dashboards.
        </p>
      </Section>

      {/* Data Sources */}
      <Section icon={<Database className="h-4 w-4" />} title="Data Sources">
        <p>
          <strong className="text-foreground">Annual Land Cover Maps</strong> — Satellite-derived global
          land cover maps used as the primary reference for the regional dashboards (2019–2025).
        </p>
        <p>
          <strong className="text-foreground">Multi-Spectral Satellite Imagery</strong> — Surface-reflectance
          imagery used to build the patch-level training dataset for the ResNet-50 classifier and visual
          comparisons. Full dataset names, sources, and licenses are listed on the{' '}
          <button
            type="button"
            onClick={() => _onNavigate('data')}
            className="text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer"
          >
            Data &amp; Credits
          </button>{' '}
          page.
        </p>
        <p>
          District boundary GeoJSON files are sourced from{' '}
          <a href={SITE_CONFIG.links.shapefileProject} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80">
            karthi209/the-shapefile-project
          </a>{' '}
          on GitHub.
        </p>
      </Section>

      {/* Model */}
      <Section icon={<Brain className="h-4 w-4" />} title="ML Model — ResNet-50">
        <p>
          A ResNet-50 backbone was fine-tuned on a dataset of multi-spectral GeoTIFF patches labelled using the
          reference land-cover product. The model accepts 6-channel multi-spectral input (bands B2, B3, B4, B5,
          B8, B11) and classifies each patch into land-cover classes (Water, Trees, Grass, Flooded Vegetation,
          Crops, Scrub/Shrub, Built Area, Bare Ground, Snow/Ice).
        </p>
        <p>
          Training was performed on Google Colab with a GPU. Weights are stored as a{' '}
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">.pt</code> file and
          loaded at inference-server startup.
        </p>
      </Section>

      {/* Tech Stack */}
      <Section icon={<Code2 className="h-4 w-4" />} title="Tech Stack">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-mono uppercase text-muted-foreground mb-2">Frontend</p>
            <div className="flex flex-wrap gap-1.5">
              {['React 19', 'TypeScript', 'Vite 8', 'Tailwind CSS 4', 'Recharts', 'React-Leaflet',
                'Framer Motion', 'Lucide-React', 'Radix UI', 'Geist Font'].map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-muted-foreground mb-2">Backend</p>
            <div className="flex flex-wrap gap-1.5">
              {['FastAPI', 'Uvicorn', 'PyTorch', 'TorchVision', 'Rasterio', 'NumPy', 'Pandas',
                'GeoPandas', 'Shapely', 'Scikit-Learn', 'Pillow'].map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-muted-foreground mb-2">Data & Earth Engine</p>
            <div className="flex flex-wrap gap-1.5">
              {['Google Earth Engine API', 'SentinelSat', 'imageio', 'Matplotlib', 'Seaborn', 'tqdm'].map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Known Limitations */}
      <Section icon={<AlertTriangle className="h-4 w-4" />} title="Known Limitations">
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-foreground">Classification noise:</strong> The regional dashboards use
            model-derived annual land cover maps. Some apparent change between years reflects differences in
            satellite acquisition conditions or classification uncertainty rather than true on-the-ground change.
          </li>
          <li>
            <strong className="text-foreground">Accuracy metric caveat:</strong> The ResNet-50 accuracy figures
            measure agreement with the reference label product, not with independent field surveys. Because
            those maps are the reference, the model cannot be more accurate than the reference itself.
          </li>
          <li>
            <strong className="text-foreground">Coverage:</strong> Analysis is scoped to Tamil Nadu (38
            districts). Boundaries for a small number of newly carved districts may not yet be included.
          </li>
          <li>
            <strong className="text-foreground">Temporal resolution:</strong> Maps are annual composites
            (calendar year). Sub-annual or seasonal events are not captured.
          </li>
        </ul>
      </Section>

      {/* Author */}
      <Section icon={<User className="h-4 w-4" />} title="Author">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-base font-semibold text-foreground">{SITE_CONFIG.author.name}</p>
            <p className="text-xs text-muted-foreground">
              Data &amp; ML · Backend · Frontend · Deployment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={SITE_CONFIG.author.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-background border border-border hover:bg-muted text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
            <a
              href={SITE_CONFIG.author.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-background border border-border hover:bg-muted text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AboutPage;
