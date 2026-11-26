import React from 'react';
import { ShieldCheck, Upload, User, BarChart3 } from 'lucide-react';

interface PrivacyPageProps {
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

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate: _onNavigate }) => {
  return (
    <div className="flex flex-col gap-6 py-4 animate-fadeIn">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-primary">
          <ShieldCheck className="h-4 w-4" />
          <span>Privacy Policy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Privacy
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          This page states, truthfully, what data the application collects and how it is used.
        </p>
      </div>

      {/* File uploads */}
      <Section icon={<Upload className="h-4 w-4" />} title="Uploaded Files (GeoSatLens)">
        <p>
          When you upload a GeoTIFF file in the <strong className="text-foreground">GeoSatLens</strong> tab,
          the file is sent to the backend server via an HTTP POST request. The backend writes it to a{' '}
          <strong className="text-foreground">temporary file</strong> on the server's filesystem using Python's{' '}
          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            tempfile.NamedTemporaryFile(delete=False)
          </code>
          . The file is read and preprocessed to run inference; it is not stored in a database, not associated
          with any user identity, and not retained for any other purpose.
        </p>
        <p>
          Temporary files created with <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            delete=False</code> remain on the server's local filesystem until the operating system cleans up its
          temporary directory, or until the server process is restarted. They are not shared, logged, or backed
          up. If you are sensitive about the content of an uploaded file, run the inference server locally.
        </p>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-400">
          <strong>Summary:</strong> Uploaded files are written to a server-side temporary file for inference
          and are not permanently stored, shared, or logged. The temp file persists until the OS cleans it up.
        </div>
      </Section>

      {/* Accounts */}
      <Section icon={<User className="h-4 w-4" />} title="Accounts">
        <p>
          GeoSat Intelligence has <strong className="text-foreground">no user accounts</strong>, no login, no
          registration, and no authentication. No personal information of any kind is collected or stored.
        </p>
      </Section>

      {/* Analytics */}
      <Section icon={<BarChart3 className="h-4 w-4" />} title="Analytics & Tracking">
        <p>
          This application does <strong className="text-foreground">not use</strong> any third-party analytics
          service (Google Analytics, Mixpanel, Plausible, etc.), tracking pixels, fingerprinting scripts, or
          cookies of any kind. No browsing or interaction data leaves your browser except for the API requests
          needed to serve the application content.
        </p>
      </Section>

      {/* Contact */}
      <Section icon={<ShieldCheck className="h-4 w-4" />} title="Questions">
        <p>
          If you have questions about data handling, please open an issue on the project's GitHub repository
          (linked in the footer). This policy was last reviewed on 25 November 2026.
        </p>
      </Section>
    </div>
  );
};

export default PrivacyPage;
