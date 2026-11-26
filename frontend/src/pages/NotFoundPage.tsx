import React from 'react';
import { MapPin } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (tab: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
        <MapPin className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-foreground font-mono">404</h1>
        <p className="text-lg font-semibold text-foreground">Page Not Found</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          This path doesn&apos;t exist in the app. Use the navigation bar or return to Home.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('overview')}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
      >
        Back to Home
      </button>
    </div>
  );
};

export default NotFoundPage;
