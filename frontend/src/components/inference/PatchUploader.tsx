import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Cpu, CheckCircle2, Clock, Zap, AlertCircle, RotateCcw, Loader2, ChevronDown } from 'lucide-react';
import { checkHealth, predictPatch } from '../../api/client';
import { getOverviewSummary } from '../../api/dynamicWorldClient';
import type { HealthResponse, SinglePredictionResponse } from '../../api/types';
import type { OverviewSystemInfo } from '../../api/dynamicWorldTypes';
import { DYNAMIC_WORLD_CLASSES } from '@/config/dynamicWorldClasses';

const ALLOWED_EXTENSIONS = ['.tif', '.tiff', '.jp2'];
const MAX_FILE_SIZE_MB = 50;
const PREDICT_TIMEOUT_MS = 25000;

const getClassColor = (className: string): string => {
  const match = Object.values(DYNAMIC_WORLD_CLASSES).find(
    (c) => c.name.toLowerCase() === className.toLowerCase()
  );
  return match?.color || 'var(--primary)';
};

export const PatchUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<SinglePredictionResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(true);
  const [systemInfo, setSystemInfo] = useState<OverviewSystemInfo | null>(null);
  const [aboutOpen, setAboutOpen] = useState<boolean>(false);

  const loadHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const h = await checkHealth();
      setHealth(h);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    getOverviewSummary()
      .then((res) => setSystemInfo(res.system_info || null))
      .catch(() => setSystemInfo(null));
  }, [loadHealth]);

  const isServiceOnline = Boolean(health?.model_loaded && health?.status === 'healthy');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPredictError(null);
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setSelectedFile(null);
      setValidationError(`Unsupported file type "${ext || 'unknown'}". Upload a 4-band .tif, .tiff, or .jp2 file.`);
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setValidationError('Selected file is empty (0 bytes).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setSelectedFile(null);
      setValidationError(`File exceeds ${MAX_FILE_SIZE_MB} MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
  };

  const handleUploadAndPredict = async () => {
    if (!selectedFile || validationError) return;
    setIsProcessing(true);
    setPredictError(null);
    try {
      const res = await predictPatch(selectedFile, PREDICT_TIMEOUT_MS);
      setPrediction(res);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.code === 'ECONNABORTED') {
        setPredictError(`Inference timed out after ${PREDICT_TIMEOUT_MS / 1000}s. The patch may be too large or the server is busy.`);
      } else if (typeof detail === 'string' && detail.toLowerCase().includes('band')) {
        setPredictError(`Invalid band count: ${detail}. A 4-band raster (B2, B3, B4, B8) is required.`);
      } else {
        setPredictError(detail || err?.message || 'Inference failed. Ensure the uploaded file is a valid 4-band satellite raster.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const confidencePct = useMemo(() => {
    if (!prediction) return 0;
    return prediction.confidence > 1 ? prediction.confidence : prediction.confidence * 100;
  }, [prediction]);

  const sortedProbabilities = useMemo(() => {
    if (!prediction?.probabilities) return [];
    return Object.entries(prediction.probabilities)
      .map(([name, val]) => ({
        name,
        pct: val > 1 ? val : val * 100,
        color: getClassColor(name),
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [prediction]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Upload Zone & Controls */}
      <div className="lg:col-span-7 panel-surface p-6 rounded-2xl flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium uppercase text-primary bg-muted px-2 py-0.5 rounded">
              Single-Patch Engine
            </span>
            <span className="text-xs text-muted-foreground font-mono">64×64 · 6-Channel Tensor</span>
          </div>
          <h2 className="text-base font-bold text-foreground tracking-tight mt-1">
            GeoSatLens
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a satellite image patch to classify its land cover.
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <label className="border border-dashed border-border hover:border-primary bg-muted/30 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center group">
          <input
            type="file"
            accept=".tif,.tiff,.jp2"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center text-primary mb-3 shadow-xs group-hover:scale-105 transition-transform">
            <Upload className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            {selectedFile ? selectedFile.name : 'Click or Drag & Drop GeoTIFF / JP2 file here'}
          </span>
          <span className="text-xs text-muted-foreground mt-1 font-mono">
            4 bands required (B2, B3, B4, B8) · .tif, .tiff, .jp2 · Max {MAX_FILE_SIZE_MB} MB
          </span>
        </label>

        {validationError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {predictError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{predictError}</span>
            </div>
            <button
              type="button"
              onClick={handleUploadAndPredict}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-foreground border border-border text-xs font-mono font-semibold shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 text-primary" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Action Button */}
        <button
          disabled={!selectedFile || !!validationError || isProcessing || !isServiceOnline}
          onClick={handleUploadAndPredict}
          className={`w-full py-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${!selectedFile || !!validationError || isProcessing || !isServiceOnline
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary hover:opacity-90 active:scale-[0.98] text-primary-foreground font-semibold shadow-xs'
            }`}
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          <span>{isProcessing ? 'Computing 6-Channel Tensors...' : 'Run ResNet-50 Inference'}</span>
        </button>
      </div>

      {/* Prediction Result View */}
      <div className="lg:col-span-5 panel-surface p-6 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <span className="text-xs font-mono font-medium uppercase text-muted-foreground">
              Classification Telemetry
            </span>
            {checkingHealth ? (
              <span className="text-xs text-muted-foreground font-mono">Checking service...</span>
            ) : isServiceOnline ? (
              <div className="flex items-center gap-1.5 text-xs text-primary font-mono font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Loaded · {health?.device} · v{health?.version || 'N/A'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-destructive font-mono font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Inference service offline</span>
                <button
                  type="button"
                  onClick={loadHealth}
                  title="Retry health check"
                  className="p-1 rounded hover:bg-muted text-foreground cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {prediction ? (
            <div className="flex flex-col gap-4 pt-4">
              {/* Predicted Class Hero */}
              <div className="p-4 rounded-xl bg-muted/60">
                <span className="text-xs font-mono uppercase text-muted-foreground">Predicted Class:</span>
                <h3 className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: getClassColor(prediction.predicted_class) }}
                  />
                  <span>{prediction.predicted_class}</span>
                </h3>
              </div>

              {/* Confidence Meter */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="text-primary font-bold">
                    {confidencePct.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, confidencePct))}%`,
                      backgroundColor: getClassColor(prediction.predicted_class),
                    }}
                  />
                </div>
              </div>

              {/* All-class probability bars (sorted high to low) */}
              <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                <div className="text-xs font-mono font-semibold text-foreground">
                  Class Probabilities
                </div>
                {sortedProbabilities.length > 0 ? (
                  <div className="space-y-1.5">
                    {sortedProbabilities.map((item) => (
                      <div key={item.name} className="space-y-0.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-foreground">{item.name}</span>
                          <span className="text-muted-foreground">{item.pct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, item.pct)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Per-class probabilities not returned by /predict endpoint.
                  </p>
                )}
              </div>

              {/* Inference Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-muted/60">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Inference Time</span>
                  </div>
                  <div className="text-base font-bold text-foreground font-mono mt-1">
                    {prediction.inference_time.toFixed(1)} ms
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/60">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Model Version</span>
                  </div>
                  <div className="text-base font-bold text-foreground font-mono mt-1">
                    {prediction.model_version || health?.version || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Cpu className="h-8 w-8 mb-2 stroke-1 opacity-50" />
              <p className="text-xs">
                {isServiceOnline
                  ? 'Upload a 4-band satellite raster to run classification.'
                  : 'Inference service offline. Start the backend to run classification.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible About the Model */}
      <div className="lg:col-span-12 panel-surface rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setAboutOpen((prev) => !prev)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="text-sm font-bold text-foreground">About the Model</span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${aboutOpen ? 'rotate-180' : ''
              }`}
          />
        </button>

        {aboutOpen && (
          <div className="px-6 pb-5 pt-3 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Architecture:</strong>{' '}
                {systemInfo?.model_name || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Input Tensor:</strong>{' '}
                (1, 6, 64, 64) — 4 uploaded bands (B2, B3, B4, B8) + computed NDVI &amp; NDWI
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Training Data Source:</strong>{' '}
                Multi-spectral satellite imagery labeled with Land Use / Land Cover classes
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Configured Classes ({systemInfo?.resnet_num_classes ?? 'N/A'}):</strong>{' '}
                {systemInfo?.resnet_classes?.join(', ') || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Validation Metrics:</strong>{' '}
                N/A (no model_card.json or live evaluation metrics endpoint exposed)
              </p>
              <p className="text-muted-foreground">
                Note: Accuracy measures agreement with the reference land-cover label dataset.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
